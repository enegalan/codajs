import { SidecarManager } from './sidecar-manager';

export interface ExecutionOptions {
  timeout?: number;
  permissions?: string[];
  workspaceId?: string;
  signal?: AbortSignal;
}

export abstract class BaseRuntimeAdapter {
  protected sidecarManager: SidecarManager;

  constructor(sidecarManager: SidecarManager) {
    this.sidecarManager = sidecarManager;
  }

  abstract getVersion(): Promise<string>;
  abstract isAvailable(): Promise<boolean>;
  abstract execute(script: string, options: ExecutionOptions): Promise<unknown>;
  killCurrentExecution(): void {
    /* override in adapters that spawn long-lived processes */
  }

  protected abstract getRuntimeName(): string;
}
