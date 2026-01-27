import React from 'react';
import ReactDOM from 'react-dom/client';
import * as monaco from 'monaco-editor';
import { App } from './App';
import './index.css';

// Configure Monaco environment and workers
if (typeof window !== 'undefined') {
  // Configure MonacoEnvironment to locate workers
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return './ts.worker.js';
      }
      return './editor.worker.js';
    },
  };

  // Configure TypeScript compiler options for JavaScript
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
  });

  // Configure TypeScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    strict: true,
  });

  // Add default lib types for JavaScript globals
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `
    interface Console {
      assert(condition?: boolean, ...data: any[]): void;
      clear(): void;
      count(label?: string): void;
      countReset(label?: string): void;
      debug(...data: any[]): void;
      dir(item?: any, options?: any): void;
      dirxml(...data: any[]): void;
      error(...data: any[]): void;
      group(...data: any[]): void;
      groupCollapsed(...data: any[]): void;
      groupEnd(): void;
      info(...data: any[]): void;
      log(...data: any[]): void;
      table(tabularData?: any, properties?: string[]): void;
      time(label?: string): void;
      timeEnd(label?: string): void;
      timeLog(label?: string, ...data: any[]): void;
      timeStamp(label?: string): void;
      trace(...data: any[]): void;
      warn(...data: any[]): void;
    }
    declare var console: Console;

    declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
    declare function clearTimeout(id?: number): void;
    declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
    declare function clearInterval(id?: number): void;
    declare function fetch(input: string | URL, init?: RequestInit): Promise<Response>;

    interface JSON {
      parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
      stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string;
      stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;
    }
    declare var JSON: JSON;

    interface Math {
      readonly E: number;
      readonly LN10: number;
      readonly LN2: number;
      readonly LOG2E: number;
      readonly LOG10E: number;
      readonly PI: number;
      readonly SQRT1_2: number;
      readonly SQRT2: number;
      abs(x: number): number;
      acos(x: number): number;
      asin(x: number): number;
      atan(x: number): number;
      atan2(y: number, x: number): number;
      ceil(x: number): number;
      cos(x: number): number;
      exp(x: number): number;
      floor(x: number): number;
      log(x: number): number;
      max(...values: number[]): number;
      min(...values: number[]): number;
      pow(x: number, y: number): number;
      random(): number;
      round(x: number): number;
      sin(x: number): number;
      sqrt(x: number): number;
      tan(x: number): number;
      trunc(x: number): number;
    }
    declare var Math: Math;

    interface ArrayConstructor {
      new <T>(arrayLength?: number): T[];
      new <T>(...items: T[]): T[];
      <T>(arrayLength?: number): T[];
      <T>(...items: T[]): T[];
      isArray(arg: any): arg is any[];
      from<T>(arrayLike: ArrayLike<T>): T[];
      from<T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
      of<T>(...items: T[]): T[];
    }
    declare var Array: ArrayConstructor;

    interface ObjectConstructor {
      new (value?: any): Object;
      (): any;
      (value: any): any;
      assign<T, U>(target: T, source: U): T & U;
      assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
      assign(target: object, ...sources: any[]): any;
      entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
      entries(o: {}): [string, any][];
      keys(o: object): string[];
      values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
      values(o: {}): any[];
      fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
    }
    declare var Object: ObjectConstructor;

    interface PromiseConstructor {
      new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
      all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>;
      race<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>;
      reject<T = never>(reason?: any): Promise<T>;
      resolve(): Promise<void>;
      resolve<T>(value: T): Promise<Awaited<T>>;
      resolve<T>(value: T | PromiseLike<T>): Promise<Awaited<T>>;
    }
    declare var Promise: PromiseConstructor;

    interface StringConstructor {
      new (value?: any): String;
      (value?: any): string;
      fromCharCode(...codes: number[]): string;
      fromCodePoint(...codePoints: number[]): string;
    }
    declare var String: StringConstructor;

    interface NumberConstructor {
      new (value?: any): Number;
      (value?: any): number;
      readonly EPSILON: number;
      readonly MAX_SAFE_INTEGER: number;
      readonly MAX_VALUE: number;
      readonly MIN_SAFE_INTEGER: number;
      readonly MIN_VALUE: number;
      readonly NaN: number;
      readonly NEGATIVE_INFINITY: number;
      readonly POSITIVE_INFINITY: number;
      isFinite(number: unknown): boolean;
      isInteger(number: unknown): boolean;
      isNaN(number: unknown): boolean;
      isSafeInteger(number: unknown): boolean;
      parseFloat(string: string): number;
      parseInt(string: string, radix?: number): number;
    }
    declare var Number: NumberConstructor;

    interface BooleanConstructor {
      new (value?: any): Boolean;
      <T>(value?: T): boolean;
    }
    declare var Boolean: BooleanConstructor;

    declare var undefined: undefined;
    declare var NaN: number;
    declare var Infinity: number;
    declare function isNaN(number: number): boolean;
    declare function isFinite(number: number): boolean;
    declare function parseInt(string: string, radix?: number): number;
    declare function parseFloat(string: string): number;
    declare function encodeURI(uri: string): string;
    declare function encodeURIComponent(uriComponent: string | number | boolean): string;
    declare function decodeURI(encodedURI: string): string;
    declare function decodeURIComponent(encodedURIComponent: string): string;
    `,
    'ts:globals.d.ts'
  );

  // Add Node.js module type definitions
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `
    declare module 'os' {
      export function arch(): string;
      export function cpus(): Array<{ model: string; speed: number; times: { user: number; nice: number; sys: number; idle: number; irq: number } }>;
      export function endianness(): 'BE' | 'LE';
      export function freemem(): number;
      export function homedir(): string;
      export function hostname(): string;
      export function loadavg(): number[];
      export function networkInterfaces(): NodeJS.Dict<Array<{ address: string; netmask: string; family: 'IPv4' | 'IPv6'; mac: string; internal: boolean; cidr: string | null }>>;
      export function platform(): NodeJS.Platform;
      export function release(): string;
      export function tmpdir(): string;
      export function totalmem(): number;
      export function type(): string;
      export function uptime(): number;
      export function userInfo(options?: { encoding: BufferEncoding }): { username: string; uid: number; gid: number; shell: string | null; homedir: string };
      export function version(): string;
      export function machine(): string;
      export const EOL: string;
      export const devNull: string;
      const os: {
        arch: typeof arch;
        cpus: typeof cpus;
        endianness: typeof endianness;
        freemem: typeof freemem;
        homedir: typeof homedir;
        hostname: typeof hostname;
        loadavg: typeof loadavg;
        networkInterfaces: typeof networkInterfaces;
        platform: typeof platform;
        release: typeof release;
        tmpdir: typeof tmpdir;
        totalmem: typeof totalmem;
        type: typeof type;
        uptime: typeof uptime;
        userInfo: typeof userInfo;
        version: typeof version;
        machine: typeof machine;
        EOL: typeof EOL;
        devNull: typeof devNull;
      };
      export default os;
    }

    declare module 'path' {
      export function basename(path: string, suffix?: string): string;
      export function dirname(path: string): string;
      export function extname(path: string): string;
      export function format(pathObject: { dir?: string; root?: string; base?: string; name?: string; ext?: string }): string;
      export function isAbsolute(path: string): boolean;
      export function join(...paths: string[]): string;
      export function normalize(path: string): string;
      export function parse(path: string): { root: string; dir: string; base: string; ext: string; name: string };
      export function relative(from: string, to: string): string;
      export function resolve(...paths: string[]): string;
      export function toNamespacedPath(path: string): string;
      export const sep: string;
      export const delimiter: string;
      export const posix: typeof import('path');
      export const win32: typeof import('path');
      const path: {
        basename: typeof basename;
        dirname: typeof dirname;
        extname: typeof extname;
        format: typeof format;
        isAbsolute: typeof isAbsolute;
        join: typeof join;
        normalize: typeof normalize;
        parse: typeof parse;
        relative: typeof relative;
        resolve: typeof resolve;
        toNamespacedPath: typeof toNamespacedPath;
        sep: typeof sep;
        delimiter: typeof delimiter;
        posix: typeof posix;
        win32: typeof win32;
      };
      export default path;
    }

    declare module 'fs' {
      export function readFileSync(path: string, options?: { encoding?: BufferEncoding; flag?: string } | BufferEncoding): string | Buffer;
      export function writeFileSync(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding; mode?: number; flag?: string } | BufferEncoding): void;
      export function existsSync(path: string): boolean;
      export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number } | number): string | undefined;
      export function rmdirSync(path: string, options?: { recursive?: boolean }): void;
      export function rmSync(path: string, options?: { force?: boolean; recursive?: boolean }): void;
      export function unlinkSync(path: string): void;
      export function readdirSync(path: string, options?: { encoding?: BufferEncoding; withFileTypes?: boolean; recursive?: boolean }): string[] | Dirent[];
      export function statSync(path: string): Stats;
      export function lstatSync(path: string): Stats;
      export function copyFileSync(src: string, dest: string, mode?: number): void;
      export function renameSync(oldPath: string, newPath: string): void;
      export function chmodSync(path: string, mode: number | string): void;
      export function chownSync(path: string, uid: number, gid: number): void;
      export function appendFileSync(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding; mode?: number; flag?: string }): void;
      export function readFile(path: string, callback: (err: Error | null, data: Buffer) => void): void;
      export function readFile(path: string, options: { encoding: BufferEncoding }, callback: (err: Error | null, data: string) => void): void;
      export function writeFile(path: string, data: string | Buffer, callback: (err: Error | null) => void): void;
      export function mkdir(path: string, callback: (err: Error | null) => void): void;
      export function mkdir(path: string, options: { recursive?: boolean }, callback: (err: Error | null, path?: string) => void): void;
      export function readdir(path: string, callback: (err: Error | null, files: string[]) => void): void;
      export function stat(path: string, callback: (err: Error | null, stats: Stats) => void): void;
      export function unlink(path: string, callback: (err: Error | null) => void): void;
      export function rm(path: string, options: { force?: boolean; recursive?: boolean }, callback: (err: Error | null) => void): void;
      export function exists(path: string, callback: (exists: boolean) => void): void;
      export function access(path: string, callback: (err: Error | null) => void): void;
      export function access(path: string, mode: number, callback: (err: Error | null) => void): void;
      export function createReadStream(path: string, options?: { encoding?: BufferEncoding; start?: number; end?: number }): ReadStream;
      export function createWriteStream(path: string, options?: { encoding?: BufferEncoding; flags?: string; mode?: number }): WriteStream;
      export function watch(filename: string, options?: { encoding?: BufferEncoding; persistent?: boolean; recursive?: boolean }, listener?: (eventType: string, filename: string) => void): FSWatcher;
      export interface Stats {
        isFile(): boolean;
        isDirectory(): boolean;
        isSymbolicLink(): boolean;
        isBlockDevice(): boolean;
        isCharacterDevice(): boolean;
        isFIFO(): boolean;
        isSocket(): boolean;
        size: number;
        mode: number;
        mtime: Date;
        atime: Date;
        ctime: Date;
        birthtime: Date;
        mtimeMs: number;
        atimeMs: number;
        ctimeMs: number;
        birthtimeMs: number;
        uid: number;
        gid: number;
        ino: number;
        nlink: number;
      }
      export interface Dirent {
        isFile(): boolean;
        isDirectory(): boolean;
        isSymbolicLink(): boolean;
        name: string;
      }
      export interface ReadStream extends NodeJS.ReadableStream {}
      export interface WriteStream extends NodeJS.WritableStream {}
      export interface FSWatcher {
        close(): void;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export namespace promises {
        export function readFile(path: string, options?: { encoding?: BufferEncoding }): Promise<string | Buffer>;
        export function writeFile(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): Promise<void>;
        export function mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<string | undefined>;
        export function readdir(path: string, options?: { encoding?: BufferEncoding; withFileTypes?: boolean }): Promise<string[] | Dirent[]>;
        export function stat(path: string): Promise<Stats>;
        export function lstat(path: string): Promise<Stats>;
        export function unlink(path: string): Promise<void>;
        export function rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
        export function rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
        export function rename(oldPath: string, newPath: string): Promise<void>;
        export function copyFile(src: string, dest: string, mode?: number): Promise<void>;
        export function access(path: string, mode?: number): Promise<void>;
        export function chmod(path: string, mode: number | string): Promise<void>;
        export function chown(path: string, uid: number, gid: number): Promise<void>;
        export function appendFile(path: string, data: string | Buffer, options?: { encoding?: BufferEncoding }): Promise<void>;
      }
      const fs: {
        readFileSync: typeof readFileSync;
        writeFileSync: typeof writeFileSync;
        existsSync: typeof existsSync;
        mkdirSync: typeof mkdirSync;
        rmdirSync: typeof rmdirSync;
        rmSync: typeof rmSync;
        unlinkSync: typeof unlinkSync;
        readdirSync: typeof readdirSync;
        statSync: typeof statSync;
        lstatSync: typeof lstatSync;
        copyFileSync: typeof copyFileSync;
        renameSync: typeof renameSync;
        chmodSync: typeof chmodSync;
        chownSync: typeof chownSync;
        appendFileSync: typeof appendFileSync;
        readFile: typeof readFile;
        writeFile: typeof writeFile;
        mkdir: typeof mkdir;
        readdir: typeof readdir;
        stat: typeof stat;
        unlink: typeof unlink;
        rm: typeof rm;
        exists: typeof exists;
        access: typeof access;
        createReadStream: typeof createReadStream;
        createWriteStream: typeof createWriteStream;
        watch: typeof watch;
        promises: typeof promises;
      };
      export default fs;
    }

    declare module 'http' {
      import { Duplex } from 'stream';
      export interface IncomingMessage extends NodeJS.ReadableStream {
        headers: Record<string, string | string[] | undefined>;
        httpVersion: string;
        method?: string;
        url?: string;
        statusCode?: number;
        statusMessage?: string;
      }
      export interface ServerResponse extends NodeJS.WritableStream {
        statusCode: number;
        statusMessage: string;
        setHeader(name: string, value: string | number | readonly string[]): this;
        getHeader(name: string): string | number | string[] | undefined;
        removeHeader(name: string): void;
        writeHead(statusCode: number, headers?: Record<string, string | number | readonly string[]>): this;
        write(chunk: any, encoding?: BufferEncoding): boolean;
        end(data?: string | Buffer, encoding?: BufferEncoding): this;
      }
      export interface ClientRequest extends NodeJS.WritableStream {
        write(chunk: any, encoding?: BufferEncoding): boolean;
        end(data?: string | Buffer, encoding?: BufferEncoding): this;
        on(event: 'response', listener: (res: IncomingMessage) => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export interface Server {
        listen(port?: number, hostname?: string, callback?: () => void): this;
        listen(port?: number, callback?: () => void): this;
        close(callback?: (err?: Error) => void): this;
        address(): { port: number; family: string; address: string } | string | null;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export interface RequestOptions {
        hostname?: string;
        host?: string;
        port?: number | string;
        path?: string;
        method?: string;
        headers?: Record<string, string | number | string[]>;
        timeout?: number;
        agent?: any;
      }
      export function createServer(requestListener?: (req: IncomingMessage, res: ServerResponse) => void): Server;
      export function request(options: RequestOptions | string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
      export function get(options: RequestOptions | string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
      export const METHODS: string[];
      export const STATUS_CODES: Record<number, string>;
    }

    declare module 'https' {
      import * as http from 'http';
      export interface RequestOptions extends http.RequestOptions {
        rejectUnauthorized?: boolean;
        ca?: string | Buffer | Array<string | Buffer>;
        cert?: string | Buffer;
        key?: string | Buffer;
      }
      export interface Server extends http.Server {}
      export function createServer(options: { key: string | Buffer; cert: string | Buffer }, requestListener?: (req: http.IncomingMessage, res: http.ServerResponse) => void): Server;
      export function request(options: RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
      export function get(options: RequestOptions | string | URL, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
    }

    declare module 'url' {
      export interface UrlObject {
        protocol?: string | null;
        slashes?: boolean | null;
        auth?: string | null;
        host?: string | null;
        hostname?: string | null;
        port?: string | number | null;
        pathname?: string | null;
        search?: string | null;
        query?: string | Record<string, string | string[]> | null;
        hash?: string | null;
        href?: string;
      }
      export interface URL {
        hash: string;
        host: string;
        hostname: string;
        href: string;
        origin: string;
        password: string;
        pathname: string;
        port: string;
        protocol: string;
        search: string;
        searchParams: URLSearchParams;
        username: string;
        toString(): string;
        toJSON(): string;
      }
      export function parse(urlString: string, parseQueryString?: boolean): UrlObject;
      export function format(urlObject: UrlObject | URL | string): string;
      export function resolve(from: string, to: string): string;
      export function fileURLToPath(url: string | URL): string;
      export function pathToFileURL(path: string): URL;
      export { URL, URLSearchParams };
    }

    declare module 'crypto' {
      export interface Hash {
        update(data: string | Buffer, encoding?: BufferEncoding): Hash;
        digest(): Buffer;
        digest(encoding: 'hex' | 'base64' | 'base64url'): string;
      }
      export interface Hmac {
        update(data: string | Buffer, encoding?: BufferEncoding): Hmac;
        digest(): Buffer;
        digest(encoding: 'hex' | 'base64' | 'base64url'): string;
      }
      export interface Cipher {
        update(data: string, inputEncoding: BufferEncoding, outputEncoding: BufferEncoding): string;
        update(data: Buffer): Buffer;
        final(): Buffer;
        final(outputEncoding: BufferEncoding): string;
      }
      export interface Decipher {
        update(data: string, inputEncoding: BufferEncoding, outputEncoding: BufferEncoding): string;
        update(data: Buffer): Buffer;
        final(): Buffer;
        final(outputEncoding: BufferEncoding): string;
      }
      export function createHash(algorithm: string): Hash;
      export function createHmac(algorithm: string, key: string | Buffer): Hmac;
      export function createCipheriv(algorithm: string, key: string | Buffer, iv: string | Buffer | null): Cipher;
      export function createDecipheriv(algorithm: string, key: string | Buffer, iv: string | Buffer | null): Decipher;
      export function randomBytes(size: number): Buffer;
      export function randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void;
      export function randomUUID(): string;
      export function randomInt(max: number): number;
      export function randomInt(min: number, max: number): number;
      export function pbkdf2(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void;
      export function pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string): Buffer;
      export function scrypt(password: string | Buffer, salt: string | Buffer, keylen: number, callback: (err: Error | null, derivedKey: Buffer) => void): void;
      export function scryptSync(password: string | Buffer, salt: string | Buffer, keylen: number): Buffer;
      export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
      export function getHashes(): string[];
      export function getCiphers(): string[];
    }

    declare module 'child_process' {
      import { Readable, Writable } from 'stream';
      export interface ChildProcess {
        stdin: Writable | null;
        stdout: Readable | null;
        stderr: Readable | null;
        pid?: number;
        killed: boolean;
        kill(signal?: string | number): boolean;
        on(event: 'exit', listener: (code: number | null, signal: string | null) => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'close', listener: (code: number | null, signal: string | null) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      export interface SpawnOptions {
        cwd?: string;
        env?: Record<string, string>;
        shell?: boolean | string;
        stdio?: string | Array<string | number | null | undefined>;
        timeout?: number;
      }
      export interface ExecOptions {
        cwd?: string;
        env?: Record<string, string>;
        encoding?: BufferEncoding;
        shell?: string;
        timeout?: number;
        maxBuffer?: number;
      }
      export function spawn(command: string, args?: readonly string[], options?: SpawnOptions): ChildProcess;
      export function exec(command: string, callback?: (error: Error | null, stdout: string, stderr: string) => void): ChildProcess;
      export function exec(command: string, options: ExecOptions, callback?: (error: Error | null, stdout: string, stderr: string) => void): ChildProcess;
      export function execSync(command: string, options?: ExecOptions): Buffer | string;
      export function execFile(file: string, args?: readonly string[], callback?: (error: Error | null, stdout: string, stderr: string) => void): ChildProcess;
      export function execFileSync(file: string, args?: readonly string[], options?: ExecOptions): Buffer | string;
      export function fork(modulePath: string, args?: readonly string[], options?: { cwd?: string; env?: Record<string, string> }): ChildProcess;
      export function spawnSync(command: string, args?: readonly string[], options?: SpawnOptions): { status: number | null; signal: string | null; stdout: Buffer; stderr: Buffer };
    }

    declare module 'events' {
      export class EventEmitter {
        on(eventName: string | symbol, listener: (...args: any[]) => void): this;
        once(eventName: string | symbol, listener: (...args: any[]) => void): this;
        off(eventName: string | symbol, listener: (...args: any[]) => void): this;
        emit(eventName: string | symbol, ...args: any[]): boolean;
        addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        removeAllListeners(eventName?: string | symbol): this;
        listeners(eventName: string | symbol): Function[];
        listenerCount(eventName: string | symbol): number;
        eventNames(): Array<string | symbol>;
        setMaxListeners(n: number): this;
        getMaxListeners(): number;
        prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
        prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
      }
      export default EventEmitter;
    }

    declare module 'stream' {
      import { EventEmitter } from 'events';
      export class Readable extends EventEmitter implements NodeJS.ReadableStream {
        readable: boolean;
        read(size?: number): any;
        setEncoding(encoding: BufferEncoding): this;
        pause(): this;
        resume(): this;
        isPaused(): boolean;
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
        unpipe(destination?: NodeJS.WritableStream): this;
        push(chunk: any, encoding?: BufferEncoding): boolean;
        destroy(error?: Error): this;
      }
      export class Writable extends EventEmitter implements NodeJS.WritableStream {
        writable: boolean;
        write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean;
        write(chunk: any, callback?: (error?: Error | null) => void): boolean;
        end(callback?: () => void): this;
        end(chunk: any, callback?: () => void): this;
        end(chunk: any, encoding?: BufferEncoding, callback?: () => void): this;
        destroy(error?: Error): this;
      }
      export class Duplex extends Readable implements NodeJS.WritableStream {
        writable: boolean;
        write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean;
        write(chunk: any, callback?: (error?: Error | null) => void): boolean;
        end(callback?: () => void): this;
        end(chunk: any, callback?: () => void): this;
        end(chunk: any, encoding?: BufferEncoding, callback?: () => void): this;
      }
      export class Transform extends Duplex {
        _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error, data?: any) => void): void;
        _flush(callback: (error?: Error, data?: any) => void): void;
      }
      export class PassThrough extends Transform {}
      export function pipeline(...streams: Array<NodeJS.ReadableStream | NodeJS.WritableStream | ((err: Error | null) => void)>): NodeJS.WritableStream;
      export function finished(stream: NodeJS.ReadableStream | NodeJS.WritableStream, callback: (err?: Error | null) => void): () => void;
    }

    declare module 'util' {
      export function format(format: string, ...args: any[]): string;
      export function inspect(object: any, options?: { showHidden?: boolean; depth?: number; colors?: boolean; customInspect?: boolean; showProxy?: boolean; maxArrayLength?: number; maxStringLength?: number; breakLength?: number; compact?: boolean | number; sorted?: boolean | ((a: string, b: string) => number); getters?: boolean | 'get' | 'set' }): string;
      export function promisify<T>(fn: (callback: (err: Error | null, result: T) => void) => void): () => Promise<T>;
      export function promisify<T, A>(fn: (arg: A, callback: (err: Error | null, result: T) => void) => void): (arg: A) => Promise<T>;
      export function promisify<T, A, B>(fn: (arg1: A, arg2: B, callback: (err: Error | null, result: T) => void) => void): (arg1: A, arg2: B) => Promise<T>;
      export function callbackify<T>(fn: () => Promise<T>): (callback: (err: Error | null, result: T) => void) => void;
      export function deprecate<T extends Function>(fn: T, msg: string, code?: string): T;
      export function isDeepStrictEqual(val1: any, val2: any): boolean;
      export function debuglog(section: string): (msg: string, ...params: any[]) => void;
      export function types: {
        isDate(value: any): value is Date;
        isRegExp(value: any): value is RegExp;
        isNativeError(value: any): value is Error;
        isPromise(value: any): value is Promise<any>;
        isArrayBuffer(value: any): value is ArrayBuffer;
        isMap(value: any): value is Map<any, any>;
        isSet(value: any): value is Set<any>;
        isTypedArray(value: any): boolean;
      };
      export class TextDecoder {
        constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
        decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
        readonly encoding: string;
        readonly fatal: boolean;
        readonly ignoreBOM: boolean;
      }
      export class TextEncoder {
        encode(input?: string): Uint8Array;
        encodeInto(input: string, output: Uint8Array): { read: number; written: number };
        readonly encoding: string;
      }
    }

    declare module 'buffer' {
      export class Buffer extends Uint8Array {
        static alloc(size: number, fill?: string | Buffer | number, encoding?: BufferEncoding): Buffer;
        static allocUnsafe(size: number): Buffer;
        static from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
        static from(data: readonly number[]): Buffer;
        static from(data: Uint8Array): Buffer;
        static from(str: string, encoding?: BufferEncoding): Buffer;
        static concat(list: readonly Uint8Array[], totalLength?: number): Buffer;
        static isBuffer(obj: any): obj is Buffer;
        static byteLength(string: string | Buffer | ArrayBuffer, encoding?: BufferEncoding): number;
        static compare(buf1: Uint8Array, buf2: Uint8Array): -1 | 0 | 1;
        toString(encoding?: BufferEncoding, start?: number, end?: number): string;
        write(string: string, offset?: number, length?: number, encoding?: BufferEncoding): number;
        copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
        slice(start?: number, end?: number): Buffer;
        subarray(start?: number, end?: number): Buffer;
        compare(target: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): -1 | 0 | 1;
        equals(otherBuffer: Uint8Array): boolean;
        indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
        includes(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): boolean;
        fill(value: string | Uint8Array | number, offset?: number, end?: number, encoding?: BufferEncoding): this;
        readInt8(offset: number): number;
        readInt16LE(offset: number): number;
        readInt16BE(offset: number): number;
        readInt32LE(offset: number): number;
        readInt32BE(offset: number): number;
        readUInt8(offset: number): number;
        readUInt16LE(offset: number): number;
        readUInt16BE(offset: number): number;
        readUInt32LE(offset: number): number;
        readUInt32BE(offset: number): number;
        readFloatLE(offset: number): number;
        readFloatBE(offset: number): number;
        readDoubleLE(offset: number): number;
        readDoubleBE(offset: number): number;
        writeInt8(value: number, offset: number): number;
        writeInt16LE(value: number, offset: number): number;
        writeInt16BE(value: number, offset: number): number;
        writeInt32LE(value: number, offset: number): number;
        writeInt32BE(value: number, offset: number): number;
        writeUInt8(value: number, offset: number): number;
        writeUInt16LE(value: number, offset: number): number;
        writeUInt16BE(value: number, offset: number): number;
        writeUInt32LE(value: number, offset: number): number;
        writeUInt32BE(value: number, offset: number): number;
        writeFloatLE(value: number, offset: number): number;
        writeFloatBE(value: number, offset: number): number;
        writeDoubleLE(value: number, offset: number): number;
        writeDoubleBE(value: number, offset: number): number;
        swap16(): Buffer;
        swap32(): Buffer;
        swap64(): Buffer;
      }
      export { Buffer as default };
    }

    declare module 'querystring' {
      export function parse(str: string, sep?: string, eq?: string, options?: { decodeURIComponent?: (str: string) => string; maxKeys?: number }): Record<string, string | string[]>;
      export function stringify(obj: Record<string, any>, sep?: string, eq?: string, options?: { encodeURIComponent?: (str: string) => string }): string;
      export function escape(str: string): string;
      export function unescape(str: string): string;
      export function encode(obj: Record<string, any>, sep?: string, eq?: string, options?: { encodeURIComponent?: (str: string) => string }): string;
      export function decode(str: string, sep?: string, eq?: string, options?: { decodeURIComponent?: (str: string) => string; maxKeys?: number }): Record<string, string | string[]>;
    }

    declare module 'net' {
      import { EventEmitter } from 'events';
      export class Socket extends EventEmitter implements NodeJS.ReadWriteStream {
        readable: boolean;
        writable: boolean;
        readonly localAddress?: string;
        readonly localPort?: number;
        readonly remoteAddress?: string;
        readonly remotePort?: number;
        readonly remoteFamily?: string;
        connect(port: number, host?: string, connectionListener?: () => void): this;
        connect(path: string, connectionListener?: () => void): this;
        write(buffer: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean;
        end(callback?: () => void): this;
        end(buffer: Uint8Array | string, callback?: () => void): this;
        destroy(error?: Error): this;
        setEncoding(encoding?: BufferEncoding): this;
        pause(): this;
        resume(): this;
        setTimeout(timeout: number, callback?: () => void): this;
        setNoDelay(noDelay?: boolean): this;
        setKeepAlive(enable?: boolean, initialDelay?: number): this;
        address(): { port: number; family: string; address: string } | {};
        read(size?: number): any;
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
        unpipe(destination?: NodeJS.WritableStream): this;
      }
      export class Server extends EventEmitter {
        listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this;
        listen(port?: number, hostname?: string, listeningListener?: () => void): this;
        listen(port?: number, listeningListener?: () => void): this;
        listen(path: string, listeningListener?: () => void): this;
        close(callback?: (err?: Error) => void): this;
        address(): { port: number; family: string; address: string } | string | null;
        getConnections(cb: (error: Error | null, count: number) => void): void;
      }
      export function createServer(connectionListener?: (socket: Socket) => void): Server;
      export function createServer(options: { allowHalfOpen?: boolean }, connectionListener?: (socket: Socket) => void): Server;
      export function createConnection(port: number, host?: string, connectionListener?: () => void): Socket;
      export function createConnection(path: string, connectionListener?: () => void): Socket;
      export function connect(port: number, host?: string, connectionListener?: () => void): Socket;
      export function connect(path: string, connectionListener?: () => void): Socket;
      export function isIP(input: string): 0 | 4 | 6;
      export function isIPv4(input: string): boolean;
      export function isIPv6(input: string): boolean;
    }

    declare module 'zlib' {
      import { Transform } from 'stream';
      export interface ZlibOptions {
        flush?: number;
        finishFlush?: number;
        chunkSize?: number;
        level?: number;
        memLevel?: number;
        strategy?: number;
        windowBits?: number;
        dictionary?: Buffer | Uint8Array;
      }
      export function gzip(buf: Buffer | string, callback: (error: Error | null, result: Buffer) => void): void;
      export function gzip(buf: Buffer | string, options: ZlibOptions, callback: (error: Error | null, result: Buffer) => void): void;
      export function gzipSync(buf: Buffer | string, options?: ZlibOptions): Buffer;
      export function gunzip(buf: Buffer, callback: (error: Error | null, result: Buffer) => void): void;
      export function gunzip(buf: Buffer, options: ZlibOptions, callback: (error: Error | null, result: Buffer) => void): void;
      export function gunzipSync(buf: Buffer, options?: ZlibOptions): Buffer;
      export function deflate(buf: Buffer | string, callback: (error: Error | null, result: Buffer) => void): void;
      export function deflate(buf: Buffer | string, options: ZlibOptions, callback: (error: Error | null, result: Buffer) => void): void;
      export function deflateSync(buf: Buffer | string, options?: ZlibOptions): Buffer;
      export function inflate(buf: Buffer, callback: (error: Error | null, result: Buffer) => void): void;
      export function inflate(buf: Buffer, options: ZlibOptions, callback: (error: Error | null, result: Buffer) => void): void;
      export function inflateSync(buf: Buffer, options?: ZlibOptions): Buffer;
      export function brotliCompress(buf: Buffer | string, callback: (error: Error | null, result: Buffer) => void): void;
      export function brotliCompressSync(buf: Buffer | string, options?: ZlibOptions): Buffer;
      export function brotliDecompress(buf: Buffer, callback: (error: Error | null, result: Buffer) => void): void;
      export function brotliDecompressSync(buf: Buffer, options?: ZlibOptions): Buffer;
      export function createGzip(options?: ZlibOptions): Transform;
      export function createGunzip(options?: ZlibOptions): Transform;
      export function createDeflate(options?: ZlibOptions): Transform;
      export function createInflate(options?: ZlibOptions): Transform;
      export function createBrotliCompress(options?: ZlibOptions): Transform;
      export function createBrotliDecompress(options?: ZlibOptions): Transform;
    }

    declare namespace NodeJS {
      interface ReadableStream {
        readable: boolean;
        read(size?: number): any;
        setEncoding(encoding: BufferEncoding): this;
        pause(): this;
        resume(): this;
        isPaused(): boolean;
        pipe<T extends WritableStream>(destination: T, options?: { end?: boolean }): T;
        unpipe(destination?: WritableStream): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      interface WritableStream {
        writable: boolean;
        write(buffer: Uint8Array | string, cb?: (err?: Error | null) => void): boolean;
        write(str: string, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
        end(cb?: () => void): this;
        end(data: string | Uint8Array, cb?: () => void): this;
        end(str: string, encoding?: BufferEncoding, cb?: () => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
      }
      interface ReadWriteStream extends ReadableStream, WritableStream {}
      type Platform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'android';
      interface Dict<T> { [key: string]: T | undefined; }
    }

    type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';
    `,
    'ts:node-modules.d.ts'
  );

  // Enable diagnostics for better developer experience
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Enable eager model sync for better IntelliSense
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
