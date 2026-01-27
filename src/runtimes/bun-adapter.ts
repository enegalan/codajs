import { BaseRuntimeAdapter, ExecutionOptions } from './base-adapter';
import { spawn } from 'child_process';

export class BunAdapter extends BaseRuntimeAdapter {
  protected getRuntimeName(): string {
    return 'bun';
  }

  public async getVersion(): Promise<string> {
    try {
      const binary = await this.sidecarManager.getBunBinary();
      if (!binary) {
        return 'unknown';
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const version = execSync(`"${binary}" --version`, { encoding: 'utf-8' }).trim();
      return version;
    } catch (error) {
      return 'unknown';
    }
  }

  public async isAvailable(): Promise<boolean> {
    const binary = await this.sidecarManager.getBunBinary();
    return binary !== null;
  }

  public async execute(script: string, options: ExecutionOptions = {}): Promise<any> {
    const binary = await this.sidecarManager.getBunBinary();
    if (!binary) {
      throw new Error('Bun is not available');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(binary, ['run', '-e', script]);

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
