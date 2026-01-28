import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { SidecarManager } from '../runtimes/sidecar-manager';

let ivm: any = null;
try {
  // Use dynamic require to avoid webpack bundling issues
  ivm = eval('require')('isolated-vm');
} catch (error) {
  // isolated-vm not available, will use fallback
  // This is expected if isolated-vm failed to build
}

export interface IsolateOptions {
  timeout?: number;
  permissions?: string[];
}

// Number of lines in the wrapper before user code starts
const WRAPPER_LINE_OFFSET = 30;

export class IsolateHost {
  private isolates: Map<string, any> = new Map();
  private useIsolatedVm: boolean = ivm !== null;
  private sidecarManager: SidecarManager;

  constructor() {
    this.sidecarManager = new SidecarManager();
  }

  private formatSyntaxError(
    errorOutput: string,
    userScript: string,
    lineOffset: number = 0
  ): string {
    // Try to extract structured error info from JSON output first
    try {
      const jsonMatch = errorOutput.match(/\{[^{}]*"syntaxError"[^{}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.syntaxError) {
          const { message, line, column } = parsed.syntaxError;
          return this.buildErrorDisplay('SyntaxError', message, userScript, line, column);
        }
      }
    } catch {
      // Continue with stderr parsing
    }

    const lines = errorOutput.split('\n');

    // Find error type and message
    let errorType = '';
    let errorMessage = '';
    let errorLine = 0;
    let errorColumn = 0;

    for (const line of lines) {
      const errorMatch = line.match(/^(\w+Error): (.+)$/);
      if (errorMatch) {
        errorType = errorMatch[1];
        errorMessage = errorMatch[2];
        break;
      }
    }

    // Try to extract line:column from the error path
    const posMatch = errorOutput.match(/\.js:(\d+):(\d+)/);
    if (posMatch) {
      const wrapperLine = parseInt(posMatch[1], 10);
      errorLine = Math.max(1, wrapperLine - lineOffset);
      errorColumn = parseInt(posMatch[2], 10);
    } else {
      // Try line only
      const lineMatch = errorOutput.match(/\.js:(\d+)/);
      if (lineMatch) {
        const wrapperLine = parseInt(lineMatch[1], 10);
        errorLine = Math.max(1, wrapperLine - lineOffset);
      }

      // Try to get column from caret position
      const caretLineIdx = lines.findIndex((l) => l.trim().match(/^\^+$/));
      if (caretLineIdx > 0 && lines[caretLineIdx - 1]) {
        const codeLine = lines[caretLineIdx - 1];
        const caretLine = lines[caretLineIdx];
        // Find caret position relative to code
        errorColumn = caretLine.indexOf('^') - (codeLine.length - codeLine.trimStart().length) + 1;
      }
    }

    if (!errorType) {
      // Fallback: clean up the error
      return errorOutput
        .replace(/\/[^\s:]+codajs-[^\s:]+\.js:\d+(:\d+)?/g, '')
        .replace(/\n\s+at .+/g, '')
        .replace(/Node\.js v[\d.]+\n?/g, '')
        .replace(/^\s*\^\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return this.buildErrorDisplay(errorType, errorMessage, userScript, errorLine, errorColumn);
  }

  private buildErrorDisplay(
    errorType: string,
    message: string,
    script: string,
    line: number,
    column: number
  ): string {
    const scriptLines = script.split('\n');
    let result = `${errorType}: ${message}`;

    if (line > 0 && line <= scriptLines.length) {
      const codeLine = scriptLines[line - 1];
      // Column is 1-indexed, and we want the caret to point AT that column
      // So for column 17, we need 17 spaces (positions 1-17, caret at 18th visual pos)
      const col = Math.max(0, Math.min(column, codeLine.length + 1));

      result += ` (${line}:${column})`;
      result += `\n\n> ${line} | ${codeLine}`;
      const padding = ' '.repeat(String(line).length + 3);
      result += `\n${padding}| ${' '.repeat(col)}^`;
    }

    return result;
  }

  /**
   * Transpile ES module imports/exports to CommonJS syntax.
   * This allows ESM code to run in a CommonJS environment.
   */
  private transpileEsmToCjs(script: string): string {
    let result = script;

    // Track if we're inside a string or comment to avoid false matches
    const isInStringOrComment = (code: string, index: number): boolean => {
      let inString = false;
      let stringChar = '';
      let inLineComment = false;
      let inBlockComment = false;
      let inTemplateString = false;

      for (let i = 0; i < index; i++) {
        const char = code[i];
        const nextChar = i < code.length - 1 ? code[i + 1] : '';
        const prevChar = i > 0 ? code[i - 1] : '';

        if (!inString && !inTemplateString && !inBlockComment && char === '/' && nextChar === '/') {
          inLineComment = true;
          continue;
        }
        if (inLineComment && char === '\n') {
          inLineComment = false;
          continue;
        }
        if (inLineComment) continue;

        if (!inString && !inTemplateString && !inLineComment && char === '/' && nextChar === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
          inBlockComment = false;
          i++;
          continue;
        }
        if (inBlockComment) continue;

        if (!inString && !inTemplateString && char === '`') {
          inTemplateString = true;
          continue;
        }
        if (inTemplateString && char === '`' && prevChar !== '\\') {
          inTemplateString = false;
          continue;
        }
        if (inTemplateString) continue;

        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
          continue;
        }
        if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
          continue;
        }
      }

      return inString || inLineComment || inBlockComment || inTemplateString;
    };

    // Helper to convert named imports with aliases
    // { a, b as c, d } -> { a, b: c, d }
    const convertNamedImports = (namedPart: string): string => {
      return namedPart.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2');
    };

    // Pattern 1: import defaultExport, { named1, named2 } from 'module'
    // -> const defaultExport = require('module'); const { named1, named2 } = require('module');
    const defaultAndNamedPattern =
      /import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(
      defaultAndNamedPattern,
      (match, defaultName, namedPart, modulePath, offset) => {
        if (isInStringOrComment(script, offset)) return match;
        const convertedNamed = convertNamedImports(namedPart.trim());
        return `const ${defaultName} = require('${modulePath}').default || require('${modulePath}'); const { ${convertedNamed} } = require('${modulePath}');`;
      }
    );

    // Pattern 2: import defaultExport, * as namespace from 'module'
    // -> const namespace = require('module'); const defaultExport = namespace.default || namespace;
    const defaultAndNamespacePattern =
      /import\s+(\w+)\s*,\s*\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(
      defaultAndNamespacePattern,
      (match, defaultName, namespace, modulePath, offset) => {
        if (isInStringOrComment(script, offset)) return match;
        return `const ${namespace} = require('${modulePath}'); const ${defaultName} = ${namespace}.default || ${namespace};`;
      }
    );

    // Pattern 3: import * as namespace from 'module'
    // -> const namespace = require('module');
    const namespacePattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(namespacePattern, (match, namespace, modulePath, offset) => {
      if (isInStringOrComment(script, offset)) return match;
      return `const ${namespace} = require('${modulePath}');`;
    });

    // Pattern 4: import { named1, named2 as alias } from 'module'
    // -> const { named1, named2: alias } = require('module');
    const namedPattern = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(namedPattern, (match, namedPart, modulePath, offset) => {
      if (isInStringOrComment(script, offset)) return match;
      const convertedNamed = convertNamedImports(namedPart.trim());
      return `const { ${convertedNamed} } = require('${modulePath}');`;
    });

    // Pattern 5: import defaultExport from 'module'
    // -> const defaultExport = require('module').default || require('module');
    const defaultPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(defaultPattern, (match, defaultName, modulePath, offset) => {
      if (isInStringOrComment(script, offset)) return match;
      return `const ${defaultName} = require('${modulePath}').default || require('${modulePath}');`;
    });

    // Pattern 6: import 'module' (side-effect only)
    // -> require('module');
    const sideEffectPattern = /import\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(sideEffectPattern, (match, modulePath, offset) => {
      if (isInStringOrComment(script, offset)) return match;
      return `require('${modulePath}');`;
    });

    // --- Export statements ---
    // For a scratchpad context, exports are converted or stripped since there's no consumer

    // Export Pattern 1: export * from 'module'
    // -> Object.assign(module.exports, require('module'));
    const exportAllFromPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(exportAllFromPattern, (match, modulePath, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return `Object.assign(module.exports, require('${modulePath}'));`;
    });

    // Export Pattern 2: export { named1, named2 as alias } from 'module'
    // -> const { named1, named2: alias } = require('module'); module.exports.named1 = named1; ...
    const exportNamedFromPattern = /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    result = result.replace(exportNamedFromPattern, (match, namedPart, modulePath, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      const items = namedPart
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const assignments: string[] = [];
      for (const item of items) {
        const asMatch = item.match(/(\w+)\s+as\s+(\w+)/);
        if (asMatch) {
          assignments.push(
            `module.exports.${asMatch[2]} = require('${modulePath}').${asMatch[1]};`
          );
        } else {
          assignments.push(`module.exports.${item} = require('${modulePath}').${item};`);
        }
      }
      return assignments.join(' ');
    });

    // Export Pattern 3: export default expression
    // -> module.exports.default = expression; OR just keep the expression for scratchpad
    // For simplicity in a scratchpad, we keep just the expression
    const exportDefaultPattern = /export\s+default\s+/g;
    result = result.replace(exportDefaultPattern, (match, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return '';
    });

    // Export Pattern 4: export const/let/var name = value
    // -> const/let/var name = value
    const exportDeclarationPattern = /export\s+(const|let|var)\s+/g;
    result = result.replace(exportDeclarationPattern, (match, keyword, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return `${keyword} `;
    });

    // Export Pattern 5: export function name() or export async function name()
    // -> function name() or async function name()
    const exportFunctionPattern = /export\s+(async\s+)?function\s+/g;
    result = result.replace(exportFunctionPattern, (match, asyncKeyword, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return asyncKeyword ? 'async function ' : 'function ';
    });

    // Export Pattern 6: export class Name
    // -> class Name
    const exportClassPattern = /export\s+class\s+/g;
    result = result.replace(exportClassPattern, (match, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return 'class ';
    });

    // Export Pattern 7: export { named1, named2 }
    // -> strip (variables are already declared)
    const exportNamedPattern = /export\s+\{[^}]+\}\s*;?/g;
    result = result.replace(exportNamedPattern, (match, offset) => {
      if (isInStringOrComment(result, offset)) return match;
      return '';
    });

    return result;
  }

  /**
   * Check if the script uses module imports or requires.
   * Scripts with modules need Node.js runtime (fallback mode).
   */
  private usesModules(script: string): boolean {
    // Check for import statements (not inside strings)
    const importPattern = /(?:^|[\n;])\s*import\s+(?:\w+|{[^}]+}|\*\s+as\s+\w+)/;
    const requirePattern = /(?:^|[\n;])\s*(?:const|let|var)\s+.*=\s*require\s*\(/;
    const sideEffectImport = /(?:^|[\n;])\s*import\s+['"][^'"]+['"]/;

    // Simple check - if the script contains import/require keywords at statement level
    // This is a heuristic; the transpiler handles string edge cases
    return (
      importPattern.test(script) || requirePattern.test(script) || sideEffectImport.test(script)
    );
  }

  public async execute(script: string, options: IsolateOptions = {}): Promise<any> {
    // If script uses modules (import/require), force fallback mode
    // because isolated-vm doesn't have access to Node.js require
    const needsNodeRuntime = this.usesModules(script);

    if (this.useIsolatedVm && ivm && !needsNodeRuntime) {
      return this.executeWithIsolatedVm(script, options);
    } else {
      return this.executeWithFallback(script, options);
    }
  }

  private async executeWithIsolatedVm(script: string, options: IsolateOptions): Promise<any> {
    const isolate = new ivm.Isolate({
      memoryLimit: 128,
    });

    const context = await isolate.createContext();
    const jail = context.global;

    // Set up basic console
    const consoleLog = (...args: any[]) => {
      // This will be captured by the execution pipeline
      return args;
    };

    await jail.set('console', {
      log: new ivm.Callback(consoleLog),
      error: new ivm.Callback(consoleLog),
      warn: new ivm.Callback(consoleLog),
      info: new ivm.Callback(consoleLog),
    });

    // Set up basic globals
    await jail.set('global', context.global);
    await jail.set('globalThis', context.global);

    try {
      // Transpile ESM imports to CommonJS requires
      const cjsScript = this.transpileEsmToCjs(script);
      // Transform script to capture last expression result
      const transformedScript = this.wrapLastExpressionWithReturn(cjsScript);
      const wrappedScript = `(function() { ${transformedScript} })()`;

      const scriptHandle = await isolate.compileScript(wrappedScript);
      const result = await scriptHandle.run(context, {
        timeout: options.timeout || 5000,
      });

      // Serialize result
      const serialized = await this.serializeResult(result);

      return {
        output: serialized,
        error: null,
        logs: [],
      };
    } catch (error: any) {
      const errorName = error.name || 'Error';
      const errorMessage = `${errorName}: ${error.message || String(error)}`;
      return {
        output: null,
        error: errorMessage,
        logs: [],
      };
    } finally {
      isolate.dispose();
    }
  }

  /**
   * Wrap all intermediate expressions to capture their results
   */
  private wrapAllExpressionsWithCapture(script: string): {
    transformed: string;
    expressionLines: Map<number, string>;
  } {
    const lines = script.split('\n');
    const expressionLines = new Map<number, string>();
    const transformedLines: string[] = [];

    // Find the last expression line (non-empty, non-comment, non-declaration)
    let lastExpressionLine = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }
      if (
        /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export|return)\s/.test(
          trimmed
        )
      ) {
        continue;
      }
      const isExpression =
        trimmed.endsWith(';') || (!trimmed.includes('=') && !trimmed.includes(':'));
      if (isExpression) {
        let expr = trimmed.endsWith(';') ? trimmed.slice(0, -1).trim() : trimmed;
        const commentIndex = expr.indexOf('//');
        if (commentIndex >= 0) {
          expr = expr.substring(0, commentIndex).trim();
        }
        if (expr && !/^console\.(log|error|warn|info|debug|trace)\s*\(/.test(expr)) {
          lastExpressionLine = i;
          break;
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        transformedLines.push(line);
        continue;
      }

      // Skip declarations (const, let, var, function, class, etc.)
      if (
        /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export|return)\s/.test(
          trimmed
        )
      ) {
        transformedLines.push(line);
        continue;
      }

      // Check if it's an expression statement (ends with semicolon or is a standalone expression)
      const isExpression =
        trimmed.endsWith(';') || (!trimmed.includes('=') && !trimmed.includes(':'));

      if (isExpression) {
        // Extract the expression (remove semicolon and trailing comments)
        let expr = trimmed.endsWith(';') ? trimmed.slice(0, -1).trim() : trimmed;

        // Remove trailing comments
        const commentIndex = expr.indexOf('//');
        if (commentIndex >= 0) {
          expr = expr.substring(0, commentIndex).trim();
        }

        // Skip console.log, console.error, etc. as they're already captured
        // Also skip the last expression as it will be captured by wrapLastExpressionWithReturn
        if (
          expr &&
          !/^console\.(log|error|warn|info|debug|trace)\s*\(/.test(expr) &&
          i !== lastExpressionLine
        ) {
          // Wrap expression to capture result: __captureResult(expr, lineNumber)
          const wrapped = `__captureResult(${expr}, ${i + 1});`;
          transformedLines.push(line.replace(trimmed, wrapped));
          expressionLines.set(i + 1, expr);
          continue;
        }
      }

      transformedLines.push(line);
    }

    return {
      transformed: transformedLines.join('\n'),
      expressionLines,
    };
  }

  private wrapLastExpressionWithReturn(script: string): string {
    // Find all statement boundaries at depth 0
    const statementEndPositions: number[] = [];
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    let inTemplateString = false;

    for (let i = 0; i < script.length; i++) {
      const char = script[i];
      const nextChar = i < script.length - 1 ? script[i + 1] : '';
      const prevChar = i > 0 ? script[i - 1] : '';

      // Handle comments
      if (!inString && !inTemplateString && !inBlockComment && char === '/' && nextChar === '/') {
        inLineComment = true;
        continue;
      }
      if (inLineComment && char === '\n') {
        inLineComment = false;
        // Newline at depth 0 can be a statement boundary (ASI)
        if (depth === 0) {
          statementEndPositions.push(i);
        }
        continue;
      }
      if (inLineComment) continue;

      if (!inString && !inTemplateString && !inLineComment && char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
        continue;
      }
      if (inBlockComment) continue;

      // Handle template strings (can be multiline)
      if (!inString && !inTemplateString && char === '`') {
        inTemplateString = true;
        continue;
      }
      if (inTemplateString && char === '`' && prevChar !== '\\') {
        inTemplateString = false;
        continue;
      }
      if (inTemplateString) continue;

      // Handle regular strings
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      }
      if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        continue;
      }
      if (inString) continue;

      // Track depth
      if (char === '{' || char === '(' || char === '[') {
        depth++;
      } else if (char === '}' || char === ')' || char === ']') {
        depth--;
      } else if (char === ';' && depth === 0) {
        // Explicit semicolon - definite statement boundary
        statementEndPositions.push(i);
      } else if (char === '\n' && depth === 0) {
        // Newline at depth 0 - potential statement boundary (ASI)
        // Check if the next non-whitespace could continue the expression
        const remaining = script.substring(i + 1);
        const nextNonWs = remaining.match(/^\s*(\S)/);
        if (nextNonWs) {
          const nextToken = nextNonWs[1];
          // These tokens typically continue an expression, not start a new statement
          const continuationTokens = [
            '.',
            ',',
            '?',
            ':',
            '+',
            '-',
            '*',
            '/',
            '%',
            '&',
            '|',
            '^',
            '<',
            '>',
            '=',
            '!',
            '(',
            '[',
          ];
          if (!continuationTokens.includes(nextToken)) {
            statementEndPositions.push(i);
          }
        }
      }
    }

    // Helper to strip trailing line comments from an expression
    const stripTrailingComment = (expr: string): string => {
      // Find // that's not inside a string
      let inString = false;
      let stringChar = '';
      for (let i = 0; i < expr.length; i++) {
        const char = expr[i];
        const prevChar = i > 0 ? expr[i - 1] : '';

        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
        } else if (!inString && char === '/' && expr[i + 1] === '/') {
          // Found a line comment - return everything before it
          return expr.substring(0, i).trim();
        }
      }
      return expr;
    };

    // If no statement boundaries found, the whole script is one statement
    if (statementEndPositions.length === 0) {
      const trimmed = script.trim();
      if (!trimmed) return script;
      // If it's just a comment, don't wrap
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        return script;
      }
      if (
        /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export)\s/.test(
          trimmed
        )
      ) {
        return script;
      }
      let cleanExpr = trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
      cleanExpr = stripTrailingComment(cleanExpr);
      if (!cleanExpr) return script;
      return `return (${cleanExpr});`;
    }

    // Find the last meaningful statement boundary
    // Skip trailing empty lines
    let lastBoundaryIndex = statementEndPositions.length - 1;
    while (lastBoundaryIndex > 0) {
      const pos = statementEndPositions[lastBoundaryIndex];
      const afterPos = script.substring(pos + 1).trim();
      if (afterPos) break;
      lastBoundaryIndex--;
    }

    // Determine where the last statement starts
    let lastStatementStart = 0;
    if (lastBoundaryIndex >= 0) {
      lastStatementStart = statementEndPositions[lastBoundaryIndex] + 1;
    }

    const before = script.substring(0, lastStatementStart);
    const lastStatement = script.substring(lastStatementStart).trim();

    // If the last statement is empty, nothing to return
    if (!lastStatement) {
      return script;
    }

    // If the last statement is just a comment, we need to wrap the previous expression
    if (lastStatement.startsWith('//') || lastStatement.startsWith('/*')) {
      // Find the last actual expression in 'before'
      const beforeTrimmed = before.trim();
      if (!beforeTrimmed) {
        return script;
      }

      // The last expression is everything after the last statement boundary in 'before'
      // For "os.platform();" the expression is "os.platform()"
      let prevExpr = beforeTrimmed;

      // Find the last semicolon or newline that's a statement boundary
      const lastSemicolon = beforeTrimmed.lastIndexOf(';');
      if (lastSemicolon >= 0) {
        // Get the statement that ends at this semicolon
        // Find where this statement starts (after previous semicolon or at beginning)
        let stmtStart = 0;
        for (let i = lastSemicolon - 1; i >= 0; i--) {
          if (beforeTrimmed[i] === ';' || beforeTrimmed[i] === '\n') {
            stmtStart = i + 1;
            break;
          }
        }
        prevExpr = beforeTrimmed.substring(stmtStart, lastSemicolon).trim();
      }

      // Check if it's a declaration - don't wrap
      if (
        /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export)\s/.test(
          prevExpr
        )
      ) {
        return script;
      }

      prevExpr = stripTrailingComment(prevExpr);
      if (!prevExpr) {
        return script;
      }

      // Replace the last expression with return wrapped version
      const beforeExpr = beforeTrimmed.substring(0, beforeTrimmed.lastIndexOf(prevExpr));
      return `${beforeExpr}return (${prevExpr}); ${lastStatement}`;
    }

    // If the last statement is a declaration, don't wrap it
    if (
      /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export)\s/.test(
        lastStatement
      )
    ) {
      return script;
    }

    // Remove trailing semicolon if present
    let cleanExpr = lastStatement.endsWith(';') ? lastStatement.slice(0, -1) : lastStatement;

    // Strip trailing comments from the expression
    cleanExpr = stripTrailingComment(cleanExpr);

    // If nothing left after stripping comments, don't wrap
    if (!cleanExpr) {
      return script;
    }

    // Wrap the last expression with return
    if (before.trim()) {
      return `${before}return (${cleanExpr});`;
    }
    return `return (${cleanExpr});`;
  }

  private async executeWithFallback(script: string, options: IsolateOptions): Promise<any> {
    // Fallback: Use child_process to execute in a separate Node.js process
    // This is less secure than isolated-vm but will work

    // Get the Node.js binary path
    const nodeBinary = await this.sidecarManager.getNodeBinary();
    if (!nodeBinary) {
      return {
        output: null,
        error: 'Node.js runtime not found. Please install Node.js.',
        logs: [],
      };
    }

    const tempFile = join(
      tmpdir(),
      `codajs-${Date.now()}-${Math.random().toString(36).substring(7)}.js`
    );

    const cleanup = () => {
      try {
        unlinkSync(tempFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    };

    // Transpile ESM imports to CommonJS requires
    const cjsScript = this.transpileEsmToCjs(script);
    // Transform script to capture all intermediate expression results
    const { transformed: transformedWithCapture, expressionLines } =
      this.wrapAllExpressionsWithCapture(cjsScript);
    // Transform script to capture last expression result
    const transformedScript = this.wrapLastExpressionWithReturn(transformedWithCapture);

    // Calculate the line number of the result (last non-empty, non-comment line)
    const resultLine = this.getResultLineNumber(script);

    // Wrap script to capture output - both scripts are embedded as strings
    // and executed via vm/Function to ensure syntax errors are caught properly
    const wrappedScript = `
      const vm = require('vm');
      const output = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      
      // Scripts embedded as strings
      const originalScript = ${JSON.stringify(script)};
      const cjsScript = ${JSON.stringify(cjsScript)};
      const transformedScript = ${JSON.stringify(transformedScript)};
      const resultLine = ${resultLine};
      const expressionLines = ${JSON.stringify(Array.from(expressionLines.entries()))};
      
      // Helper function to capture intermediate expression results
      const __captureResult = (value, lineNumber) => {
        // Only capture if the value is not undefined (to avoid showing undefined for void expressions)
        if (value !== undefined) {
          output.push({ type: 'result', level: 'info', message: value, line: lineNumber });
        }
        return value;
      };
      
      // First, validate syntax of the transpiled script (ESM->CJS)
      try {
        new vm.Script(cjsScript, { filename: 'input.js' });
      } catch (syntaxError) {
        // Extract line and column from the syntax error
        let line = 1;
        let column = 1;
        
        const stack = syntaxError.stack || '';
        const message = syntaxError.message || '';
        const stackLines = stack.split('\\n');
        
        // Look for "input.js:line" in stack
        const fileMatch = stack.match(/input\\.js:(\\d+)/);
        if (fileMatch) {
          line = parseInt(fileMatch[1], 10);
        }
        
        // Get the source line
        const srcLines = originalScript.split('\\n');
        const srcLine = (line > 0 && line <= srcLines.length) ? srcLines[line - 1] : '';
        
        // For "missing X" errors, point to end of line where the token should be
        if (/missing/.test(message)) {
          column = srcLine.length;
        } else {
          // Find caret line (^^^^) to get column
          for (let i = 0; i < stackLines.length; i++) {
            if (/^\\s*\\^+\\s*$/.test(stackLines[i])) {
              const caretPos = stackLines[i].indexOf('^');
              if (caretPos >= 0) {
                column = caretPos + 1;
              }
              break;
            }
          }
          // Default to end of line if no caret found
          if (column === 1 && srcLine.length > 0) {
            column = srcLine.length;
          }
        }
        
        // Output structured syntax error
        process.stdout.write(JSON.stringify({
          success: false,
          syntaxError: {
            message: message,
            line: line,
            column: column
          },
          output: []
        }) + '\\n');
        process.exit(0);
      }
      
      // Set up console interception with line tracking
      const getCallerLine = () => {
        const stack = new Error().stack;
        if (!stack) return null;
        const lines = stack.split('\\n');
        for (let i = 2; i < lines.length; i++) {
          // Look for script.js (our vm.Script filename) or anonymous
          const match = lines[i].match(/(?:script\\.js|<anonymous>):(\\d+):(\\d+)/);
          if (match) {
            // Subtract 1 to account for the wrapper function line
            const rawLine = parseInt(match[1], 10);
            return Math.max(1, rawLine - 1);
          }
        }
        return null;
      };
      
      console.log = (...args) => {
        output.push({ type: 'log', level: 'info', message: args, line: getCallerLine() });
        originalLog(...args);
      };
      console.error = (...args) => {
        output.push({ type: 'error', level: 'error', message: args, line: getCallerLine() });
        originalError(...args);
      };
      console.warn = (...args) => {
        output.push({ type: 'warn', level: 'warn', message: args, line: getCallerLine() });
        originalWarn(...args);
      };
      console.info = (...args) => {
        output.push({ type: 'info', level: 'info', message: args, line: getCallerLine() });
        originalInfo(...args);
      };
      
      // Function to extract line number from error stack trace
      const getErrorLine = (error) => {
        if (!error || !error.stack) return null;
        const stackLines = error.stack.split('\\n');
        for (let i = 0; i < stackLines.length; i++) {
          // Look for script.js (our vm.Script filename) or anonymous
          const match = stackLines[i].match(/(?:script\\.js|<anonymous>):(\\d+):(\\d+)/);
          if (match) {
            // Subtract 1 to account for the wrapper function line
            const rawLine = parseInt(match[1], 10);
            return Math.max(1, rawLine - 1);
          }
        }
        return null;
      };
      
      // Execute the transformed script using vm.Script with require available
      try {
        const wrappedCode = '(function() {\\n' + transformedScript + '\\n})()';
        const scriptObj = new vm.Script(wrappedCode, { filename: 'script.js' });
        
        // Create a context with require and other Node.js globals available
        const sandbox = {
          require: require,
          module: module,
          exports: exports,
          __dirname: __dirname,
          __filename: __filename,
          console: console,
          process: process,
          Buffer: Buffer,
          setTimeout: setTimeout,
          setInterval: setInterval,
          setImmediate: setImmediate,
          clearTimeout: clearTimeout,
          clearInterval: clearInterval,
          clearImmediate: clearImmediate,
          global: global,
          globalThis: globalThis,
          __captureResult: __captureResult,
        };
        vm.createContext(sandbox);
        const result = scriptObj.runInContext(sandbox);
        
        process.stdout.write(JSON.stringify({ success: true, result, resultLine, output }) + '\\n');
      } catch (error) {
        const errorName = error.name || 'Error';
        const errorMessage = errorName + ': ' + error.message;
        const errorLine = getErrorLine(error);
        process.stdout.write(JSON.stringify({ success: false, error: errorMessage, errorLine: errorLine, output }) + '\\n');
      }
    `;

    writeFileSync(tempFile, wrappedScript);

    return new Promise((resolve) => {
      const proc = spawn(nodeBinary, [tempFile], {
        timeout: options.timeout || 5000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill();
        cleanup();
        resolve({
          output: null,
          error: 'Execution timeout',
          logs: [],
        });
      }, options.timeout || 5000);

      proc.on('close', (code: number) => {
        clearTimeout(timeout);
        cleanup();
        try {
          // Try to parse JSON output from stdout or stderr
          const allOutput = stdout + stderr;
          const lines = allOutput.split('\n').filter((l) => l.trim());

          // Find JSON output (could be in stdout or stderr)
          let jsonLine = '';
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('{')) {
              jsonLine = lines[i];
              break;
            }
          }

          if (jsonLine) {
            const parsed = JSON.parse(jsonLine);

            // Handle syntax error from validation
            if (parsed.syntaxError) {
              const { message, line, column } = parsed.syntaxError;
              const formattedError = this.buildErrorDisplay(
                'SyntaxError',
                message,
                script,
                line,
                column
              );
              resolve({
                output: null,
                error: formattedError,
                logs: [],
              });
              return;
            }

            // Keep full log entries with type, level, line, and formatted message
            const logs = (parsed.output || []).map((entry: any) => ({
              type: entry.type || 'log',
              level: entry.level || 'info',
              message: entry.message || [],
              line: entry.line,
            }));
            resolve({
              output: parsed.result,
              error: parsed.error || null,
              errorLine: parsed.errorLine || null,
              logs,
              resultLine: parsed.resultLine,
            });
          } else {
            const cleanError = stderr
              ? this.formatSyntaxError(stderr, script, WRAPPER_LINE_OFFSET)
              : code !== 0
                ? `Process exited with code ${code}`
                : null;
            resolve({
              output: null,
              error: cleanError,
              logs: [],
            });
          }
        } catch (parseError) {
          const cleanError = stderr
            ? this.formatSyntaxError(stderr, script, WRAPPER_LINE_OFFSET)
            : code !== 0
              ? `Process exited with code ${code}`
              : null;
          resolve({
            output: null,
            error: cleanError,
            logs: [],
          });
        }
      });

      proc.on('error', (error: Error) => {
        clearTimeout(timeout);
        cleanup();
        resolve({
          output: null,
          error: error.message,
          logs: [],
        });
      });
    });
  }

  private async serializeResult(result: any): Promise<any> {
    // Basic serialization - in production, this would handle circular references
    if (result === null || result === undefined) {
      return result;
    }

    if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
      return result;
    }

    // For objects, we'd need to use ExternalCopy in a real implementation
    // This is a simplified version
    try {
      return JSON.parse(JSON.stringify(result));
    } catch (error) {
      return '[Circular or non-serializable object]';
    }
  }

  public dispose(): void {
    if (this.useIsolatedVm) {
      for (const isolate of this.isolates.values()) {
        if (isolate && typeof isolate.dispose === 'function') {
          isolate.dispose();
        }
      }
    }
    this.isolates.clear();
  }

  public isIsolatedVmAvailable(): boolean {
    return this.useIsolatedVm;
  }

  /**
   * Get the line number of the last expression (for result display)
   */
  private getResultLineNumber(script: string): number {
    const lines = script.split('\n');

    // Find the last non-empty, non-comment-only line that contains actual code
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      // Skip empty lines and comments (including lines that are only comment delimiters like ////)
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }
      // Found a line with actual code
      return i + 1; // 1-indexed
    }

    return lines.length;
  }
}
