import { spawn, ChildProcess } from 'child_process';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { SidecarManager } from '../runtimes/sidecar-manager';

/** Runner script inlined at build time so the correct version is always used */
const BUNDLED_RUNNER_SOURCE: string = require('../../scripts/run-user-script.js'); // eslint-disable-line @typescript-eslint/no-var-requires

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  signal?: AbortSignal;
}

// Number of lines in the wrapper before user code starts
const WRAPPER_LINE_OFFSET = 30;

export class IsolateHost {
  private isolates: Map<string, unknown> = new Map();
  private useIsolatedVm: boolean = ivm !== null;
  private sidecarManager: SidecarManager;
  private fallbackProcesses: Set<ChildProcess> = new Set();
  private fallbackLock: Promise<void> = Promise.resolve();

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

  public async execute(
    script: string,
    options: IsolateOptions = {}
  ): Promise<{
    output: unknown;
    error: string | null;
    logs: Array<{ type: string; level: string; message: unknown; line?: number }>;
    resultLine?: number;
  }> {
    const needsNodeRuntime = this.usesModules(script);
    const forceFallback =
      process.env.CODAJS_FORCE_FALLBACK === '1' || process.env.CODAJS_FORCE_FALLBACK === 'true';
    const preferIsolate =
      process.env.CODAJS_USE_ISOLATE === '1' || process.env.CODAJS_USE_ISOLATE === 'true';
    const useIsolate =
      preferIsolate && this.useIsolatedVm && ivm && !needsNodeRuntime && !forceFallback;

    if (useIsolate) {
      try {
        const result = await this.executeWithIsolatedVm(script, options);
        if (
          result.error &&
          /Invalid or unexpected token|missing \) after argument list/.test(result.error)
        ) {
          return this.executeWithFallback(script, options);
        }
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/Invalid or unexpected token|missing \) after argument list/.test(msg)) {
          return this.executeWithFallback(script, options);
        }
        throw err;
      }
    }
    return this.executeWithFallback(script, options);
  }

  public killCurrentProcess(): void {
    for (const proc of this.fallbackProcesses) {
      try {
        proc.kill('SIGKILL');
      } catch {
        try {
          proc.kill();
        } catch {
          /* already dead */
        }
      }
    }
    this.fallbackProcesses.clear();
  }

  private async executeWithIsolatedVm(
    script: string,
    options: IsolateOptions
  ): Promise<{
    output: unknown;
    error: string | null;
    logs: Array<{ type: string; level: string; message: unknown; line?: number }>;
    resultLine?: number;
  }> {
    const isolate = new ivm.Isolate({
      memoryLimit: 128,
    });

    const context = await isolate.createContext();
    const jail = context.global;

    type LogEntryRaw =
      | { kind: 'result'; line: number; value: unknown }
      | { kind: 'log'; level: 'info' | 'warn' | 'error'; args: unknown[] };
    const logEntries: LogEntryRaw[] = [];
    const copyFromJail = (v: unknown): unknown =>
      v != null && typeof (v as { copy?: () => unknown }).copy === 'function'
        ? (v as { copy: () => unknown }).copy()
        : v;
    const makeConsoleCallback = (level: 'info' | 'warn' | 'error') =>
      function (...args: unknown[]) {
        const copied = args.map((a) => copyFromJail(a));
        logEntries.push({ kind: 'log', level, args: copied });
        return args;
      };
    await jail.set('console', {
      log: new ivm.Callback(makeConsoleCallback('info')),
      error: new ivm.Callback(makeConsoleCallback('error')),
      warn: new ivm.Callback(makeConsoleCallback('warn')),
      info: new ivm.Callback(makeConsoleCallback('info')),
    });
    const captureResult = (value: unknown, line: number) => {
      const copied = copyFromJail(value);
      logEntries.push({ kind: 'result', line, value: copied });
      return value;
    };
    await jail.set('__captureResult', new ivm.Callback(captureResult));

    // Set up basic globals
    await jail.set('global', context.global);
    await jail.set('globalThis', context.global);

    // Web Audio API is not available in isolated-vm; stub throws a clear error
    const audioContextStub = new ivm.Callback(function () {
      throw new Error(
        'AudioContext is not available in this runtime. Web Audio API is supported when using the Node.js runtime (fallback).'
      );
    });
    await jail.set('AudioContext', audioContextStub);

    try {
      // Transpile ESM imports to CommonJS requires
      const cjsScript = this.transpileEsmToCjs(script);
      const { transformed: transformedWithCapture } = this.wrapAllExpressionsWithCapture(cjsScript);
      const transformedScript = this.wrapLastExpressionWithReturn(transformedWithCapture);
      const scriptForIsolate = transformedScript.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
      const wrappedScript = '(function(){ { ' + scriptForIsolate + ' } })()';

      const scriptHandle = await isolate.compileScript(wrappedScript);
      let result = await scriptHandle.run(context, {
        timeout: options.timeout || 5000,
      });
      const ref = result as { getSync?: (key: string) => unknown };
      if (ref && typeof ref.getSync === 'function') {
        const thenFn = ref.getSync('then');
        if (
          thenFn &&
          typeof (thenFn as { applySync?: (r: unknown, a: unknown[]) => void }).applySync ===
            'function'
        ) {
          logEntries.push({
            kind: 'result',
            line: this.getResultLineNumber(script),
            value: { __type: 'promise', state: 'pending' },
          });
          const thenRef = thenFn as { applySync: (r: unknown, a: unknown[]) => void };
          const timeoutMs = options.timeout || 5000;
          const settled = new Promise<unknown>((resolve, reject) => {
            const onFulfilled = new ivm.Callback((value: unknown) => {
              resolve(
                value != null && typeof (value as { copy?: () => unknown }).copy === 'function'
                  ? (value as { copy: () => unknown }).copy()
                  : value
              );
            });
            const onRejected = new ivm.Callback((err: unknown) => reject(err));
            try {
              thenRef.applySync(result, [onFulfilled, onRejected]);
            } catch (e) {
              reject(e);
            }
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Promise execution timeout')), timeoutMs)
          );
          result = await Promise.race([settled, timeoutPromise]);
        }
      }
      let serialized = await this.serializeResult(result);
      const logs = logEntries.map(
        (entry): { type: string; level: string; message: unknown; line?: number } => {
          if (entry.kind === 'result') {
            let message: unknown = entry.value;
            try {
              message = JSON.parse(JSON.stringify(entry.value));
            } catch {
              message = entry.value;
            }
            if (Array.isArray(message) && message.length === 0) {
              message = false;
            }
            return { type: 'result', level: 'info', message, line: entry.line };
          }
          const message = entry.args.length === 1 ? entry.args[0] : entry.args;
          return { type: 'log', level: entry.level, message };
        }
      );

      if (Array.isArray(serialized) && serialized.length === 0) {
        serialized = false;
      }

      return {
        output: serialized,
        error: null,
        logs,
        resultLine: this.getResultLineNumber(script),
      };
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : 'Error';
      const errorMessage = `${errorName}: ${error instanceof Error ? error.message : String(error)}`;
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
   * Find semicolon positions at depth 0 (statement boundaries)
   */
  private getStatementEndPositions(script: string): number[] {
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

      if (!inString && !inTemplateString && !inBlockComment && char === '/' && nextChar === '/') {
        inLineComment = true;
        continue;
      }
      if (inLineComment && char === '\n') {
        inLineComment = false;
        if (depth === 0) statementEndPositions.push(i);
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
      if (inString) continue;

      if (char === '{' || char === '(' || char === '[') {
        depth++;
      } else if (char === '}' || char === ')' || char === ']') {
        depth--;
      } else if (char === ';' && depth === 0) {
        const beforeSemicolon = script.substring(0, i);
        const trimmed = beforeSemicolon.replace(/\s+$/, '');
        if (trimmed.slice(-1) === ')' && trimmed.slice(0, -1).includes('\n')) {
          continue;
        }
        statementEndPositions.push(i);
      } else if (char === '\n' && depth === 0) {
        const remaining = script.substring(i + 1);
        const nextNonWs = remaining.match(/^\s*(\S)/);
        if (nextNonWs) {
          const nextToken = nextNonWs[1];
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
            '}',
          ];
          if (!continuationTokens.includes(nextToken)) {
            statementEndPositions.push(i);
          }
        }
      }
    }
    return statementEndPositions;
  }

  /**
   * Wrap expression lines with __captureResult(expr, lineNum). Only wraps complete statements
   * (line ends with ; or line does not look like continuation: does not end with , ( [ . and does not start with ? :).
   */
  private wrapAllExpressionsWithCapture(script: string): {
    transformed: string;
    expressionLines: Map<number, string>;
  } {
    const normalized = script.replace(/\r\n?/g, '\n');
    const expressionLines = new Map<number, string>();
    const lines = normalized.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        out.push(line);
        continue;
      }
      if (
        /^(const|let|var|function|class|if|for|while|do|switch|try|throw|import|export|return)\s/.test(
          trimmed
        )
      ) {
        out.push(line);
        continue;
      }
      if (/^\s*\)\s*;?\s*$/.test(trimmed)) {
        out.push(line);
        continue;
      }
      // Closing callback/block like "});" or "})" — do not wrap as expression (would produce invalid __captureResult(});, n))
      if (/^\s*\}\s*\)\s*;?\s*$/.test(trimmed)) {
        out.push(line);
        continue;
      }
      if (
        /^\}\s*,.*\)\s*;\s*$/.test(trimmed) ||
        /^[})\],]\s*['"].*?['"]\s*\)\s*;\s*$/.test(trimmed)
      ) {
        out.push(line);
        continue;
      }
      if (/^\s*[?:]/.test(trimmed)) {
        out.push(line);
        continue;
      }
      // Method chaining: line starting with . is continuation of previous statement
      if (/^\s*\.\s*\w/.test(trimmed)) {
        out.push(line);
        continue;
      }
      // Line that starts a block or arrow-body is never a complete single-line expression
      if (/\{\s*$/.test(trimmed) || /=>\s*\{\s*$/.test(trimmed)) {
        out.push(line);
        continue;
      }
      const hasSemicolon = trimmed.endsWith(';');
      if (!hasSemicolon) {
        if (/[,[(.]\s*$/.test(trimmed)) {
          out.push(line);
          continue;
        }
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length; j++) {
          const t = lines[j].trim();
          if (t && !t.startsWith('//') && !t.startsWith('/*')) {
            nextNonEmpty = t;
            break;
          }
        }
        if (/^\s*\)\s*;?\s*$/.test(nextNonEmpty)) {
          out.push(line);
          continue;
        }
        // Current line is condition of ternary if next line starts with ? or :
        if (/^\s*[?:]/.test(nextNonEmpty)) {
          out.push(line);
          continue;
        }
        // Next line continues with method chain; keep current line unwrapped
        if (/^\s*\.\s*\w/.test(nextNonEmpty)) {
          out.push(line);
          continue;
        }
      }

      let expr = hasSemicolon ? trimmed.slice(0, -1).trim() : trimmed;
      const commentIdx = expr.indexOf('//');
      if (commentIdx >= 0) {
        expr = expr.substring(0, commentIdx).trim();
      }
      if (!expr || /^console\.(log|error|warn|info|debug|trace)\s*\(/.test(expr)) {
        out.push(line);
        continue;
      }

      const lineNum = i + 1;
      const wrapped = line.replace(trimmed, `__captureResult(${expr}, ${lineNum});`);
      out.push(wrapped);
      expressionLines.set(lineNum, expr);
    }

    return {
      transformed: out.join('\n'),
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
        // Do not treat ");" as statement boundary when ) is on a different line (e.g. .repeat(\n  ...\n  );)
        const beforeSemicolon = script.substring(0, i);
        const trimmed = beforeSemicolon.replace(/\s+$/, '');
        if (trimmed.slice(-1) === ')' && trimmed.slice(0, -1).includes('\n')) {
          continue;
        }
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
            '}', // closing block of arrow function / object in call like reduce(fn, init)
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

    // If the last statement looks like a fragment (e.g. "}, '\n');" from reduce(fn, init)),
    // do not wrap it or we would produce invalid "return (}, '\n');"
    if (/^[})\],]\s*/.test(lastStatement)) {
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

    // Final guard: wrapping would produce invalid "return (}, ..." or "return (), ..."
    if (/^[})\],]/.test(cleanExpr.trim())) {
      return script;
    }

    // Wrap the last expression with return
    if (before.trim()) {
      return `${before}return (${cleanExpr});`;
    }
    return `return (${cleanExpr});`;
  }

  private async executeWithFallback(
    script: string,
    options: IsolateOptions
  ): Promise<{
    output: unknown;
    error: string | null;
    logs: Array<{ type: string; level: string; message: unknown; line?: number }>;
    resultLine?: number;
  }> {
    const previousLock = this.fallbackLock;
    let releaseLock!: () => void;
    this.fallbackLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    await previousLock;

    this.killCurrentProcess();

    // Fallback: Use child_process to execute in a separate Node.js process
    // This is less secure than isolated-vm but will work

    // Get the Node.js binary path
    const nodeBinary = await this.sidecarManager.getNodeBinary();
    if (!nodeBinary) {
      releaseLock();
      return {
        output: null,
        error: 'Node.js runtime not found. Please install Node.js.',
        logs: [],
      };
    }

    const prefix = `codajs-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const dataFile = join(tmpdir(), `${prefix}-data.json`);
    const runnerFile = join(tmpdir(), `${prefix}-runner.js`);

    const cleanup = () => {
      try {
        unlinkSync(dataFile);
      } catch {
        // ignore
      }
      try {
        unlinkSync(runnerFile);
      } catch {
        // ignore
      }
    };

    const cjsScript = this.transpileEsmToCjs(script);
    const { transformed: transformedWithCapture, expressionLines } =
      this.wrapAllExpressionsWithCapture(cjsScript);
    const transformedScript = this.wrapLastExpressionWithReturn(transformedWithCapture);
    const resultLine = this.getResultLineNumber(script);

    const runnerSource = BUNDLED_RUNNER_SOURCE;
    let projectRoot: string = process.cwd();
    try {
      const electron = eval('require')('electron');
      if (electron && electron.app && typeof electron.app.getAppPath === 'function') {
        projectRoot = electron.app.getAppPath();
      }
    } catch {
      /* not in Electron or app not ready */
    }

    const payload = {
      script,
      cjsScript,
      transformedScript,
      resultLine,
      expressionLines: Array.from(expressionLines.entries()),
      projectRoot,
    };
    writeFileSync(dataFile, JSON.stringify(payload), 'utf8');
    writeFileSync(runnerFile, runnerSource, 'utf8');

    const nodeModulesPath = join(projectRoot, 'node_modules');
    const spawnEnv = { ...process.env };
    const existingNodePath = spawnEnv.NODE_PATH;
    spawnEnv.NODE_PATH = existingNodePath
      ? `${nodeModulesPath}${process.platform === 'win32' ? ';' : ':'}${existingNodePath}`
      : nodeModulesPath;

    return new Promise((resolve) => {
      const proc = spawn(nodeBinary, [runnerFile, dataFile], {
        cwd: projectRoot,
        env: spawnEnv,
      });
      this.fallbackProcesses.add(proc);

      const removeProc = () => {
        this.fallbackProcesses.delete(proc);
      };

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const resolveCancelled = () => {
        if (resolved) return;
        resolved = true;
        removeProc();
        try {
          proc.kill('SIGKILL');
        } catch {
          try {
            proc.kill();
          } catch {
            /* already dead */
          }
        }
        cleanup();
        resolve({
          output: null,
          error: 'Execution cancelled',
          logs: [],
        });
      };

      if (options.signal?.aborted) {
        resolveCancelled();
        return;
      }

      const onAbort = () => {
        if (resolved) {
          removeProc();
          try {
            proc.kill('SIGKILL');
          } catch {
            try {
              proc.kill();
            } catch {
              /* already dead */
            }
          }
          cleanup();
          return;
        }
        resolveCancelled();
      };
      options.signal?.addEventListener('abort', onAbort);

      interface ParsedRunnerOutput {
        syntaxError?: { message: string; line: number; column: number };
        output?: Array<{ type?: string; level?: string; message?: unknown; line?: number }>;
        result?: unknown;
        error?: string | null;
        errorLine?: number | null;
        resultLine?: number;
      }
      const finishWithResult = (parsed: ParsedRunnerOutput) => {
        if (resolved) return;
        resolved = true;
        cleanup();

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

        type OutputEntry = { type?: string; level?: string; message?: unknown; line?: number };
        const logs = (parsed.output || []).map((entry: OutputEntry) => ({
          type: entry.type || 'log',
          level: entry.level || 'info',
          message:
            entry.message !== undefined ? entry.message : entry.type === 'log' ? [] : undefined,
          line: entry.line,
        }));
        resolve({
          output: parsed.result,
          error: parsed.error ?? null,
          errorLine: parsed.errorLine || null,
          logs,
          resultLine: parsed.resultLine,
        });
      };

      const tryParseStdout = () => {
        const allOutput = stdout + stderr;
        const lines = allOutput.split('\n').filter((l) => l.trim());
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{')) {
            try {
              const parsed = JSON.parse(line);
              finishWithResult(parsed);
              return;
            } catch {
              /* not valid JSON, keep waiting */
            }
          }
        }
      };

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        tryParseStdout();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        tryParseStdout();
      });

      proc.on('close', (code: number) => {
        removeProc();
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        try {
          const allOutput = stdout + stderr;
          const lines = allOutput.split('\n').filter((l) => l.trim());
          let jsonLine = '';
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('{')) {
              jsonLine = lines[i];
              break;
            }
          }

          if (jsonLine) {
            const parsed = JSON.parse(jsonLine);
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
            type StdoutEntry = { type?: string; level?: string; message?: unknown; line?: number };
            const logs = (parsed.output || []).map((entry: StdoutEntry) => ({
              type: entry.type || 'log',
              level: entry.level || 'info',
              message:
                entry.message !== undefined ? entry.message : entry.type === 'log' ? [] : undefined,
              line: entry.line,
            }));
            resolve({
              output: parsed.result,
              error: parsed.error ?? null,
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
        } catch {
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
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve({
          output: null,
          error: error.message,
          logs: [],
        });
      });
    }).finally(releaseLock);
  }

  private async serializeResult(result: unknown): Promise<unknown> {
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
   * Prepare script for execution in the renderer (browser context with real Web Audio).
   * Returns wrapped script and metadata; does not execute.
   */
  public prepareScriptForBrowser(script: string): {
    wrappedScript: string;
    resultLine: number;
    expressionLines: Array<[number, string]>;
  } {
    const cjsScript = this.transpileEsmToCjs(script);
    const { transformed: transformedWithCapture, expressionLines } =
      this.wrapAllExpressionsWithCapture(cjsScript);
    const transformedScript = this.wrapLastExpressionWithReturn(transformedWithCapture);
    const resultLine = this.getResultLineNumber(script);
    const wrappedScript =
      '(function(){ "use strict";\n' +
      transformedScript.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '') +
      '\n})();';
    return {
      wrappedScript,
      resultLine,
      expressionLines: Array.from(expressionLines.entries()),
    };
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
