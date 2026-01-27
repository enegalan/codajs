import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class CacheManager {
  private readonly globalStorePath: string;
  private readonly workspacesBasePath: string;

  constructor() {
    const appDataPath =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    this.globalStorePath = path.join(appDataPath, 'codajs', 'packages', 'global');
    this.workspacesBasePath = path.join(appDataPath, 'codajs', 'packages', 'workspaces');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.globalStorePath)) {
      fs.mkdirSync(this.globalStorePath, { recursive: true });
    }
    if (!fs.existsSync(this.workspacesBasePath)) {
      fs.mkdirSync(this.workspacesBasePath, { recursive: true });
    }
  }

  public getGlobalStorePath(): string {
    return this.globalStorePath;
  }

  public getWorkspaceStorePath(workspaceId: string): string {
    const workspacePath = path.join(this.workspacesBasePath, workspaceId, '.coda-modules');
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    return workspacePath;
  }

  public findPackage(packageName: string, searchPath: string): string | null {
    // Check node_modules in search path
    const nodeModulesPath = path.join(searchPath, 'node_modules', packageName);
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }

    // Check parent directories
    let currentPath = searchPath;
    while (currentPath !== path.dirname(currentPath)) {
      const nodeModules = path.join(currentPath, 'node_modules', packageName);
      if (fs.existsSync(nodeModules)) {
        return nodeModules;
      }
      currentPath = path.dirname(currentPath);
    }

    return null;
  }

  public async verifyIntegrity(packagePath: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join(packagePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      // In a real implementation, we would verify checksums
      // For now, just check that package.json exists and is valid
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return !!packageJson.name;
    } catch {
      return false;
    }
  }

  public listCachedPackages(
    storePath: string
  ): Array<{ name: string; version: string; path: string }> {
    const packages: Array<{ name: string; version: string; path: string }> = [];
    const nodeModulesPath = path.join(storePath, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
      return packages;
    }

    const entries = fs.readdirSync(nodeModulesPath);
    for (const entry of entries) {
      const packagePath = path.join(nodeModulesPath, entry);
      if (fs.statSync(packagePath).isDirectory()) {
        const packageJsonPath = path.join(packagePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            packages.push({
              name: packageJson.name || entry,
              version: packageJson.version || 'unknown',
              path: packagePath,
            });
          } catch {
            // Skip invalid package.json
          }
        }
      }
    }

    return packages;
  }

  public async purgePackage(packageName: string, storePath: string): Promise<boolean> {
    try {
      const packagePath = path.join(storePath, 'node_modules', packageName);
      if (fs.existsSync(packagePath)) {
        fs.rmSync(packagePath, { recursive: true, force: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public getCacheSize(storePath: string): number {
    let totalSize = 0;

    const calculateSize = (dirPath: string): void => {
      try {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry);
          const stats = fs.statSync(entryPath);
          if (stats.isDirectory()) {
            calculateSize(entryPath);
          } else {
            totalSize += stats.size;
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    if (fs.existsSync(storePath)) {
      calculateSize(storePath);
    }

    return totalSize;
  }
}
