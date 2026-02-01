import { SidecarManager } from '../runtimes/sidecar-manager';
import { NodeAdapter } from '../runtimes/node-adapter';
import { DenoAdapter } from '../runtimes/deno-adapter';
import { BunAdapter } from '../runtimes/bun-adapter';
import { BaseRuntimeAdapter } from '../runtimes/base-adapter';

export interface ExecutionOptions {
  runtime?: 'node' | 'deno' | 'bun';
  version?: string;
  timeout?: number;
  permissions?: string[];
  workspaceId?: string;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTime: number;
}

export class RuntimeManager {
  private sidecarManager: SidecarManager;
  private adapters: Map<string, BaseRuntimeAdapter>;
  private defaultRuntime: string = 'node';
  private abortController: AbortController | null = null;

  constructor() {
    this.sidecarManager = new SidecarManager();
    this.adapters = new Map();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    this.adapters.set('node', new NodeAdapter(this.sidecarManager));
    this.adapters.set('deno', new DenoAdapter(this.sidecarManager));
    this.adapters.set('bun', new BunAdapter(this.sidecarManager));
  }

  public async getAvailableRuntimes(): Promise<
    Array<{ name: string; version: string; available: boolean }>
  > {
    const runtimes = [];
    for (const [name, adapter] of this.adapters.entries()) {
      const version = await adapter.getVersion();
      const available = await adapter.isAvailable();
      runtimes.push({ name, version, available });
    }
    return runtimes;
  }

  public async setDefaultRuntime(runtime: string): Promise<void> {
    if (this.adapters.has(runtime)) {
      this.defaultRuntime = runtime;
    } else {
      throw new Error(`Unknown runtime: ${runtime}`);
    }
  }

  public async executeScript(
    script: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const runtime = options.runtime || this.defaultRuntime;
    const adapter = this.adapters.get(runtime);

    if (!adapter) {
      throw new Error(`Runtime ${runtime} is not available`);
    }

    if (!(await adapter.isAvailable())) {
      throw new Error(`Runtime ${runtime} is not installed`);
    }

    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      const output = await adapter.execute(script, {
        timeout: options.timeout || 5000,
        permissions: options.permissions || [],
        workspaceId: options.workspaceId,
        signal: this.abortController.signal,
      });

      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          output: null,
          error: 'Execution cancelled',
          executionTime: Date.now() - startTime,
        };
      }
      return {
        success: false,
        output: null,
        error: error.message || String(error),
        executionTime: Date.now() - startTime,
      };
    } finally {
      this.abortController = null;
    }
  }

  public async cancelExecution(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    for (const adapter of this.adapters.values()) {
      adapter.killCurrentExecution();
    }
  }

  public prepareScriptForBrowser(script: string): {
    wrappedScript: string;
    resultLine: number;
    expressionLines: Array<[number, string]>;
  } {
    const nodeAdapter = this.adapters.get('node');
    if (nodeAdapter && 'prepareScriptForBrowser' in nodeAdapter) {
      return (nodeAdapter as NodeAdapter).prepareScriptForBrowser(script);
    }
    throw new Error('Browser script preparation is not available');
  }
}
