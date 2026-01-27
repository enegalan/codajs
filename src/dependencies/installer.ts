import { spawn } from 'child_process';
import * as fs from 'fs';
import { Dependency } from '../shared/types';
import { CacheManager } from './cache-manager';

export interface InstallOptions {
  workspaceId?: string;
  global?: boolean;
}

export class DependencyInstaller {
  private cacheManager: CacheManager;

  constructor() {
    this.cacheManager = new CacheManager();
  }

  public async install(
    dependency: Dependency,
    options: InstallOptions = {}
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const installPath = options.global
        ? this.cacheManager.getGlobalStorePath()
        : this.cacheManager.getWorkspaceStorePath(options.workspaceId || 'default');

      // Check if already installed
      const existingPath = this.cacheManager.findPackage(dependency.name, installPath);
      if (existingPath) {
        return { success: true, path: existingPath };
      }

      // Install package
      await this.runNpmInstall(dependency.name, dependency.version, installPath);

      // Verify installation
      const installedPath = this.cacheManager.findPackage(dependency.name, installPath);
      if (installedPath) {
        return { success: true, path: installedPath };
      }

      return { success: false, error: 'Installation completed but package not found' };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async runNpmInstall(
    packageName: string,
    version: string,
    installPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      if (!fs.existsSync(installPath)) {
        fs.mkdirSync(installPath, { recursive: true });
      }

      const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`;
      const proc = spawn('npm', ['install', packageSpec, '--no-save', '--prefix', installPath], {
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed: ${stderr || stdout}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  public async installBatch(
    dependencies: Dependency[],
    options: InstallOptions = {}
  ): Promise<
    Array<{ dependency: Dependency; result: { success: boolean; path?: string; error?: string } }>
  > {
    const results = [];
    for (const dep of dependencies) {
      const result = await this.install(dep, options);
      results.push({ dependency: dep, result });
    }
    return results;
  }
}
