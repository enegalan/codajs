import { BaseRuntimeAdapter, ExecutionOptions } from './base-adapter';
import { spawn } from 'child_process';

export class DenoAdapter extends BaseRuntimeAdapter {
  protected getRuntimeName(): string {
    return 'deno';
  }

  public async getVersion(): Promise<string> {
    try {
      const binary = await this.sidecarManager.getDenoBinary();
      if (!binary) {
        return 'unknown';
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const version = execSync(`"${binary}" --version`, { encoding: 'utf-8' }).trim();
      const match = version.match(/deno (\d+\.\d+\.\d+)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  public async isAvailable(): Promise<boolean> {
    const binary = await this.sidecarManager.getDenoBinary();
    return binary !== null;
  }

  public async execute(script: string, options: ExecutionOptions = {}): Promise<any> {
    const binary = await this.sidecarManager.getDenoBinary();
    if (!binary) {
      throw new Error('Deno is not available');
    }

    // Build permission flags
    const permissionFlags: string[] = [];
    if (options.permissions) {
      if (options.permissions.includes('fs:read')) {
        permissionFlags.push('--allow-read');
      }
      if (options.permissions.includes('fs:write')) {
        permissionFlags.push('--allow-write');
      }
      if (options.permissions.includes('net')) {
        permissionFlags.push('--allow-net');
      }
      if (options.permissions.includes('env')) {
        permissionFlags.push('--allow-env');
      }
    } else {
      // Default: no permissions (hardened mode)
      permissionFlags.push('--no-allow-all');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(binary, ['eval', ...permissionFlags, script]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Execution timeout'));
      }, options.timeout || 5000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ output: stdout, error: null });
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}
