import { BaseRuntimeAdapter, ExecutionOptions } from './base-adapter';
import { SidecarManager } from './sidecar-manager';
import { IsolateHost } from '../execution/isolate-host';

export class NodeAdapter extends BaseRuntimeAdapter {
  private isolateHost: IsolateHost;

  constructor(sidecarManager: SidecarManager) {
    super(sidecarManager);
    this.isolateHost = new IsolateHost();
  }

  protected getRuntimeName(): string {
    return 'node';
  }

  public async getVersion(): Promise<string> {
    try {
      const binary = await this.sidecarManager.getNodeBinary();
      if (!binary) {
        return 'unknown';
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const version = execSync(`"${binary}" --version`, { encoding: 'utf-8' }).trim();
      return version.replace('v', '');
    } catch (error) {
      return 'unknown';
    }
  }

  public async isAvailable(): Promise<boolean> {
    const binary = await this.sidecarManager.getNodeBinary();
    return binary !== null;
  }

  public async execute(script: string, options: ExecutionOptions = {}): Promise<unknown> {
    return this.isolateHost.execute(script, {
      timeout: options.timeout || 5000,
      permissions: options.permissions || [],
      signal: options.signal,
    });
  }

  public prepareScriptForBrowser(script: string): {
    wrappedScript: string;
    resultLine: number;
    expressionLines: Array<[number, string]>;
  } {
    return this.isolateHost.prepareScriptForBrowser(script);
  }

  public override killCurrentExecution(): void {
    this.isolateHost.killCurrentProcess();
  }
}
