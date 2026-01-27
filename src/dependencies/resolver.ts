import { Dependency } from '../shared/types';

export interface ImportStatement {
  type: 'import' | 'require';
  source: string;
  line: number;
  column: number;
}

export class DependencyResolver {
  public parseImports(code: string): ImportStatement[] {
    const imports: ImportStatement[] = [];

    // Parse ES6 imports
    const importRegex =
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push({
        type: 'import',
        source: match[1],
        line: this.getLineNumber(code, match.index),
        column: match.index - this.getLineStart(code, match.index),
      });
    }

    // Parse require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push({
        type: 'require',
        source: match[1],
        line: this.getLineNumber(code, match.index),
        column: match.index - this.getLineStart(code, match.index),
      });
    }

    return imports;
  }

  public parseMagicComments(code: string): Array<{ type: string; value: string; line: number }> {
    const comments: Array<{ type: string; value: string; line: number }> = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const magicCommentMatch = line.match(/\/\/\s*@(\w+)\s+(.+)/);
      if (magicCommentMatch) {
        comments.push({
          type: magicCommentMatch[1],
          value: magicCommentMatch[2].trim(),
          line: i + 1,
        });
      }
    }

    return comments;
  }

  public extractDependencies(code: string): Dependency[] {
    const dependencies: Dependency[] = [];
    const magicComments = this.parseMagicComments(code);

    // Extract @pkg declarations
    for (const comment of magicComments) {
      if (comment.type === 'pkg') {
        const match = comment.value.match(/^(.+)@(.+)$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            resolved: false,
          });
        }
      }
    }

    // Extract from import statements
    const imports = this.parseImports(code);
    for (const imp of imports) {
      // Skip relative imports and Node.js built-ins
      if (
        !imp.source.startsWith('.') &&
        !imp.source.startsWith('/') &&
        !this.isBuiltin(imp.source)
      ) {
        const existing = dependencies.find((d) => d.name === imp.source);
        if (!existing) {
          dependencies.push({
            name: imp.source,
            version: 'latest',
            resolved: false,
          });
        }
      }
    }

    return dependencies;
  }

  private isBuiltin(module: string): boolean {
    const builtins = [
      'fs',
      'path',
      'http',
      'https',
      'crypto',
      'util',
      'stream',
      'events',
      'buffer',
      'url',
      'querystring',
      'os',
      'child_process',
      'cluster',
      'net',
      'dgram',
      'dns',
      'readline',
      'repl',
      'tls',
      'zlib',
      'vm',
      'assert',
      'console',
    ];
    return builtins.includes(module);
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  private getLineStart(code: string, index: number): number {
    const before = code.substring(0, index);
    const lastNewline = before.lastIndexOf('\n');
    return lastNewline + 1;
  }
}
