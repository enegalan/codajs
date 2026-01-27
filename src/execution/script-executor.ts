import { DependencyResolver } from '../dependencies/resolver';
import { DependencyInstaller } from '../dependencies/installer';
import { RuntimeManager, ExecutionOptions } from '../main/runtime-manager';
import { PermissionManager } from '../main/permission-manager';

export interface ScriptExecutionOptions {
  runtime?: 'node' | 'deno' | 'bun';
  timeout?: number;
  permissions?: string[];
  workspaceId?: string;
}

export class ScriptExecutor {
  private dependencyResolver: DependencyResolver;
  private dependencyInstaller: DependencyInstaller;
  private runtimeManager: RuntimeManager;
  private permissionManager: PermissionManager;

  constructor(runtimeManager: RuntimeManager, permissionManager: PermissionManager) {
    this.dependencyResolver = new DependencyResolver();
    this.dependencyInstaller = new DependencyInstaller();
    this.runtimeManager = runtimeManager;
    this.permissionManager = permissionManager;
  }

  public async execute(script: string, options: ScriptExecutionOptions = {}): Promise<any> {
    // Parse magic comments
    const magicComments = this.dependencyResolver.parseMagicComments(script);
    const runtimeOverride = this.extractRuntime(magicComments);
    const timeoutOverride = this.extractTimeout(magicComments);
    const permissionOverrides = this.extractPermissions(magicComments);

    // Resolve dependencies
    const dependencies = this.dependencyResolver.extractDependencies(script);
    if (dependencies.length > 0) {
      await this.installDependencies(dependencies, options.workspaceId);
    }

    // Check permissions
    const requiredPermissions =
      permissionOverrides.length > 0 ? permissionOverrides : this.detectRequiredPermissions(script);

    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionManager.checkPermission(permission);
      if (!hasPermission) {
        const level = await this.permissionManager.requestPermission(permission);
        if (level === 'deny') {
          throw new Error(`Permission denied: ${permission}`);
        }
      }
    }

    // Execute script
    const executionOptions: ExecutionOptions = {
      runtime: runtimeOverride || options.runtime,
      timeout: timeoutOverride || options.timeout,
      permissions: requiredPermissions,
      workspaceId: options.workspaceId,
    };

    return this.runtimeManager.executeScript(script, executionOptions);
  }

  private extractRuntime(
    magicComments: Array<{ type: string; value: string }>
  ): 'node' | 'deno' | 'bun' | undefined {
    const runtimeComment = magicComments.find((c) => c.type === 'coda-runtime');
    if (runtimeComment) {
      const runtime = runtimeComment.value.toLowerCase();
      if (runtime === 'node' || runtime === 'deno' || runtime === 'bun') {
        return runtime;
      }
    }
    return undefined;
  }

  private extractTimeout(
    magicComments: Array<{ type: string; value: string }>
  ): number | undefined {
    const timeoutComment = magicComments.find((c) => c.type === 'coda-timeout');
    if (timeoutComment) {
      const timeout = parseInt(timeoutComment.value, 10);
      if (!isNaN(timeout)) {
        return timeout;
      }
    }
    return undefined;
  }

  private extractPermissions(magicComments: Array<{ type: string; value: string }>): string[] {
    const permissionComments = magicComments.filter((c) => c.type === 'coda-permission');
    return permissionComments.map((c) => c.value);
  }

  private async installDependencies(dependencies: any[], workspaceId?: string): Promise<void> {
    const results = await this.dependencyInstaller.installBatch(dependencies, {
      workspaceId,
      global: true, // Use global store for now
    });

    const failures = results.filter((r) => !r.result.success);
    if (failures.length > 0) {
      console.warn('Some dependencies failed to install:', failures);
    }
  }

  private detectRequiredPermissions(script: string): string[] {
    const permissions: string[] = [];

    // Detect fs operations
    if (script.includes('require("fs")') || (script.includes('import') && script.includes('fs'))) {
      if (script.match(/\.writeFile|\.writeFileSync|\.mkdir|\.mkdirSync/)) {
        permissions.push('fs:write');
      } else {
        permissions.push('fs:read');
      }
    }

    // Detect network operations
    if (
      script.includes('require("http")') ||
      script.includes('require("https")') ||
      script.includes('fetch(') ||
      script.includes('XMLHttpRequest')
    ) {
      permissions.push('net');
    }

    // Detect environment access
    if (script.includes('process.env') || script.includes('Deno.env')) {
      permissions.push('env');
    }

    return permissions;
  }
}
