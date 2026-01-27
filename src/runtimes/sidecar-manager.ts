import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface RuntimeBinary {
  name: string;
  path: string;
  version: string;
  targetTriple: string;
}

export class SidecarManager {
  private readonly runtimesDir: string;
  private readonly binaries: Map<string, RuntimeBinary> = new Map();
  private readonly extendedPath: string;

  constructor() {
    const appDataPath =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));
    this.runtimesDir = path.join(appDataPath, 'codajs', 'runtimes');
    this.extendedPath = this.buildExtendedPath();
    this.ensureRuntimesDirectory();
  }

  private buildExtendedPath(): string {
    const home = os.homedir();
    const commonPaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/opt/homebrew/bin',
      '/opt/local/bin',
      path.join(home, '.volta/bin'),
      path.join(home, '.asdf/shims'),
      path.join(home, '.local/bin'),
      path.join(home, '.bun/bin'),
      path.join(home, '.deno/bin'),
      '/usr/local/opt/node/bin',
      '/opt/homebrew/opt/node/bin',
    ];

    // Add nvm paths (check for default alias or latest installed version)
    const nvmDir = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
      try {
        const versions = fs
          .readdirSync(nvmDir)
          .filter((v) => v.startsWith('v'))
          .sort()
          .reverse();
        if (versions.length > 0) {
          commonPaths.push(path.join(nvmDir, versions[0], 'bin'));
        }
      } catch {
        // Ignore errors reading nvm directory
      }
    }

    // Add fnm paths
    const fnmDir = path.join(home, '.fnm', 'node-versions');
    if (fs.existsSync(fnmDir)) {
      try {
        const versions = fs
          .readdirSync(fnmDir)
          .filter((v) => v.startsWith('v'))
          .sort()
          .reverse();
        if (versions.length > 0) {
          commonPaths.push(path.join(fnmDir, versions[0], 'installation', 'bin'));
        }
      } catch {
        // Ignore errors reading fnm directory
      }
    }

    if (process.platform === 'win32') {
      commonPaths.push(
        path.join(process.env.PROGRAMFILES || '', 'nodejs'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'nodejs'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'node')
      );
    }

    const existingPath = process.env.PATH || '';
    const allPaths = [...commonPaths, ...existingPath.split(path.delimiter)];
    return allPaths.filter((p, i, arr) => p && arr.indexOf(p) === i).join(path.delimiter);
  }

  private findBinaryInPath(binaryName: string): string | null {
    const paths = this.extendedPath.split(path.delimiter);
    const ext = process.platform === 'win32' ? '.exe' : '';

    for (const dir of paths) {
      const fullPath = path.join(dir, binaryName + ext);
      if (fs.existsSync(fullPath)) {
        try {
          fs.accessSync(fullPath, fs.constants.X_OK);
          return fullPath;
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private ensureRuntimesDirectory(): void {
    if (!fs.existsSync(this.runtimesDir)) {
      fs.mkdirSync(this.runtimesDir, { recursive: true });
    }
  }

  public getTargetTriple(): string {
    const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
    const platform =
      process.platform === 'win32'
        ? 'pc-windows-msvc'
        : process.platform === 'darwin'
          ? 'apple-darwin'
          : 'unknown-linux-gnu';
    return `${arch}-${platform}`;
  }

  public async getNodeBinary(version?: string): Promise<string | null> {
    // Try well-known paths directly first (most reliable for packaged apps)
    const directPaths = ['/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node'];

    for (const directPath of directPaths) {
      if (fs.existsSync(directPath)) {
        try {
          fs.accessSync(directPath, fs.constants.X_OK);
          return directPath;
        } catch {
          // Path exists but not executable, continue
        }
      }
    }

    // Try to find system Node.js in extended paths (nvm, fnm, volta, etc.)
    const nodePath = this.findBinaryInPath('node');
    if (nodePath) {
      return nodePath;
    }

    // Check for sidecar binary
    const targetTriple = this.getTargetTriple();
    const binaryName = `node-${version || 'system'}-${targetTriple}${process.platform === 'win32' ? '.exe' : ''}`;
    const binaryPath = path.join(this.runtimesDir, 'node', binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    return null;
  }

  public async getDenoBinary(): Promise<string | null> {
    // Try well-known paths directly first
    const home = os.homedir();
    const directPaths = [
      path.join(home, '.deno/bin/deno'),
      '/opt/homebrew/bin/deno',
      '/usr/local/bin/deno',
      '/usr/bin/deno',
    ];

    for (const directPath of directPaths) {
      if (fs.existsSync(directPath)) {
        try {
          fs.accessSync(directPath, fs.constants.X_OK);
          return directPath;
        } catch {
          // Path exists but not executable, continue
        }
      }
    }

    // Try to find system Deno in extended paths
    const denoPath = this.findBinaryInPath('deno');
    if (denoPath) {
      return denoPath;
    }

    // Check for sidecar binary
    const targetTriple = this.getTargetTriple();
    const binaryName = `deno-${targetTriple}${process.platform === 'win32' ? '.exe' : ''}`;
    const binaryPath = path.join(this.runtimesDir, 'deno', binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    return null;
  }

  public async getBunBinary(): Promise<string | null> {
    // Try well-known paths directly first
    const home = os.homedir();
    const directPaths = [
      path.join(home, '.bun/bin/bun'),
      '/opt/homebrew/bin/bun',
      '/usr/local/bin/bun',
      '/usr/bin/bun',
    ];

    for (const directPath of directPaths) {
      if (fs.existsSync(directPath)) {
        try {
          fs.accessSync(directPath, fs.constants.X_OK);
          return directPath;
        } catch {
          // Path exists but not executable, continue
        }
      }
    }

    // Try to find system Bun in extended paths
    const bunPath = this.findBinaryInPath('bun');
    if (bunPath) {
      return bunPath;
    }

    // Check for sidecar binary
    const targetTriple = this.getTargetTriple();
    const binaryName = `bun-${targetTriple}${process.platform === 'win32' ? '.exe' : ''}`;
    const binaryPath = path.join(this.runtimesDir, 'bun', binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    return null;
  }

  public getRuntimesDirectory(): string {
    return this.runtimesDir;
  }
}
