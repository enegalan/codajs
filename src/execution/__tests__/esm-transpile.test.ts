import { IsolateHost } from '../isolate-host';

describe('ESM to CJS Transpilation', () => {
  let isolateHost: IsolateHost;
  let transpile: (script: string) => string;
  let usesModules: (script: string) => boolean;

  beforeEach(() => {
    isolateHost = new IsolateHost();
    // Access private methods for testing
    transpile = (isolateHost as any).transpileEsmToCjs.bind(isolateHost);
    usesModules = (isolateHost as any).usesModules.bind(isolateHost);
  });

  afterEach(() => {
    isolateHost.dispose();
  });

  describe('Module detection', () => {
    it('should detect default import', () => {
      expect(usesModules(`import fs from 'fs';`)).toBe(true);
    });

    it('should detect named imports', () => {
      expect(usesModules(`import { readFile } from 'fs';`)).toBe(true);
    });

    it('should detect namespace imports', () => {
      expect(usesModules(`import * as fs from 'fs';`)).toBe(true);
    });

    it('should detect side-effect imports', () => {
      expect(usesModules(`import 'polyfill';`)).toBe(true);
    });

    it('should detect require statements', () => {
      expect(usesModules(`const fs = require('fs');`)).toBe(true);
    });

    it('should not detect import in strings', () => {
      expect(usesModules(`const x = "import fs from 'fs'";`)).toBe(false);
    });

    it('should not detect simple code without modules', () => {
      expect(usesModules(`const x = 5; console.log(x);`)).toBe(false);
    });
  });

  describe('Import statements', () => {
    it('should convert default import', () => {
      const input = `import fs from 'fs';`;
      const output = transpile(input);
      expect(output).toBe(`const fs = require('fs').default || require('fs');`);
    });

    it('should convert named imports', () => {
      const input = `import { readFile, writeFile } from 'fs';`;
      const output = transpile(input);
      expect(output).toBe(`const { readFile, writeFile } = require('fs');`);
    });

    it('should convert named import with alias', () => {
      const input = `import { readFile as rf } from 'fs';`;
      const output = transpile(input);
      expect(output).toBe(`const { readFile: rf } = require('fs');`);
    });

    it('should convert namespace import', () => {
      const input = `import * as fs from 'fs';`;
      const output = transpile(input);
      expect(output).toBe(`const fs = require('fs');`);
    });

    it('should convert side-effect import', () => {
      const input = `import 'polyfill';`;
      const output = transpile(input);
      expect(output).toBe(`require('polyfill');`);
    });

    it('should convert default import with named imports', () => {
      const input = `import React, { useState, useEffect } from 'react';`;
      const output = transpile(input);
      expect(output).toBe(
        `const React = require('react').default || require('react'); const { useState, useEffect } = require('react');`
      );
    });

    it('should convert default import with namespace', () => {
      const input = `import React, * as ReactAll from 'react';`;
      const output = transpile(input);
      expect(output).toBe(
        `const ReactAll = require('react'); const React = ReactAll.default || ReactAll;`
      );
    });

    it('should handle mixed imports and code', () => {
      const input = `import fs from 'fs';
const data = fs.readFileSync('test.txt');
console.log(data);`;
      const output = transpile(input);
      expect(output).toContain(`const fs = require('fs').default || require('fs');`);
      expect(output).toContain(`const data = fs.readFileSync('test.txt');`);
    });
  });

  describe('Export statements', () => {
    it('should strip export default and keep expression', () => {
      const input = `export default function test() { return 1; }`;
      const output = transpile(input);
      expect(output).toBe(`function test() { return 1; }`);
    });

    it('should convert export const to const', () => {
      const input = `export const x = 5;`;
      const output = transpile(input);
      expect(output).toBe(`const x = 5;`);
    });

    it('should convert export let to let', () => {
      const input = `export let y = 10;`;
      const output = transpile(input);
      expect(output).toBe(`let y = 10;`);
    });

    it('should convert export function to function', () => {
      const input = `export function add(a, b) { return a + b; }`;
      const output = transpile(input);
      expect(output).toBe(`function add(a, b) { return a + b; }`);
    });

    it('should convert export async function', () => {
      const input = `export async function fetchData() { return await fetch(); }`;
      const output = transpile(input);
      expect(output).toBe(`async function fetchData() { return await fetch(); }`);
    });

    it('should convert export class to class', () => {
      const input = `export class MyClass {}`;
      const output = transpile(input);
      expect(output).toBe(`class MyClass {}`);
    });

    it('should strip named exports (already declared)', () => {
      const input = `const x = 1; const y = 2; export { x, y };`;
      const output = transpile(input);
      expect(output).toBe(`const x = 1; const y = 2; `);
    });

    it('should convert export * from', () => {
      const input = `export * from './utils';`;
      const output = transpile(input);
      expect(output).toBe(`Object.assign(module.exports, require('./utils'));`);
    });

    it('should convert named re-exports', () => {
      const input = `export { foo, bar as baz } from './utils';`;
      const output = transpile(input);
      expect(output).toContain(`module.exports.foo = require('./utils').foo;`);
      expect(output).toContain(`module.exports.baz = require('./utils').bar;`);
    });
  });

  describe('Edge cases', () => {
    it('should not transform imports inside strings', () => {
      const input = `const str = "import fs from 'fs'";`;
      const output = transpile(input);
      expect(output).toBe(input);
    });

    it('should not transform imports inside template strings', () => {
      const input = "const str = `import fs from 'fs'`;";
      const output = transpile(input);
      expect(output).toBe(input);
    });

    it('should handle multiple imports', () => {
      const input = `import fs from 'fs';
import path from 'path';
import { promisify } from 'util';`;
      const output = transpile(input);
      expect(output).toContain(`const fs = require('fs').default || require('fs');`);
      expect(output).toContain(`const path = require('path').default || require('path');`);
      expect(output).toContain(`const { promisify } = require('util');`);
    });

    it('should handle import without semicolon', () => {
      const input = `import fs from 'fs'
const x = 1`;
      const output = transpile(input);
      expect(output).toContain(`const fs = require('fs').default || require('fs')`);
    });

    it('should preserve code after imports', () => {
      const input = `import fs from 'fs';

const readFileLines = filename =>
  fs
    .readFileSync(filename)
    .toString('utf8')
    .split('\\n');

readFileLines('example.txt');`;
      const output = transpile(input);
      expect(output).toContain(`const fs = require('fs').default || require('fs');`);
      expect(output).toContain('const readFileLines = filename =>');
      expect(output).toContain('.readFileSync(filename)');
    });
  });

  describe('wrapLastExpressionWithReturn edge cases', () => {
    let wrapLastExpressionWithReturn: (script: string) => string;

    beforeEach(() => {
      wrapLastExpressionWithReturn = (isolateHost as any).wrapLastExpressionWithReturn.bind(
        isolateHost
      );
    });

    it('should handle trailing line comments', () => {
      const input = `os.platform();  // "darwin"`;
      const output = wrapLastExpressionWithReturn(input);
      // Should not produce invalid syntax
      expect(output).not.toContain('return (//');
      // Should wrap the expression before the comment with return
      expect(output).toContain('return (os.platform())');
      // Should preserve the comment
      expect(output).toContain('// "darwin"');
    });

    it('should handle expression with trailing comment', () => {
      const input = `const x = 5;
x + 1  // add one`;
      const output = wrapLastExpressionWithReturn(input);
      // The last statement after ; is "x + 1  // add one"
      // This should work or gracefully handle the comment
      expect(() => {
        // Should not throw when evaluating the output structure
        new Function(output);
      }).not.toThrow();
    });

    it('should handle script that is just a comment', () => {
      const input = `// just a comment`;
      const output = wrapLastExpressionWithReturn(input);
      expect(output).toBe(input);
    });

    it('should handle script ending with block comment', () => {
      const input = `const x = 5; /* block comment */`;
      const output = wrapLastExpressionWithReturn(input);
      expect(output).toBe(input);
    });
  });
});
