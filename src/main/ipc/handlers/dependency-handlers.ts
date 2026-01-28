import { IpcMainInvokeEvent } from 'electron';
import { DependencyResolver } from '../../../dependencies/resolver';
import { DependencyInstaller } from '../../../dependencies/installer';
import { handleIpcError } from '../ipc-error-handler';
import {
  IpcResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../../../shared/utils/error-handling';

export function createDependencyHandlers(
  dependencyResolver: DependencyResolver,
  dependencyInstaller: DependencyInstaller
) {
  return {
    'dependency:resolve': async (
      event: IpcMainInvokeEvent,
      code: string
    ): Promise<IpcResponse<{ dependencies: unknown[] }>> => {
      try {
        if (typeof code !== 'string') {
          return createErrorResponse(new Error('Code must be a string'));
        }
        const dependencies = dependencyResolver.extractDependencies(code);
        return createSuccessResponse({ dependencies });
      } catch (error: unknown) {
        return handleIpcError(error, 'Dependency resolution error');
      }
    },

    'dependency:install': async (
      event: IpcMainInvokeEvent,
      packageName: string,
      version?: string,
      workspaceId?: string
    ): Promise<{ success: boolean; path?: string; error?: string }> => {
      try {
        if (typeof packageName !== 'string' || !packageName.trim()) {
          return { success: false, error: 'Package name is required' };
        }
        const dependency = {
          name: packageName.trim(),
          version: version || 'latest',
          resolved: false,
        };
        return await dependencyInstaller.install(dependency, { workspaceId });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Dependency installation error:', message);
        return { success: false, error: message };
      }
    },

    'dependency:install-batch': async (
      event: IpcMainInvokeEvent,
      code: string,
      workspaceId?: string
    ): Promise<{ success: boolean; results: unknown[]; error?: string }> => {
      try {
        if (typeof code !== 'string') {
          return { success: false, error: 'Code must be a string', results: [] };
        }
        const dependencies = dependencyResolver.extractDependencies(code);
        if (dependencies.length === 0) {
          return { success: true, results: [] };
        }
        const results = await dependencyInstaller.installBatch(dependencies, {
          workspaceId,
        });
        const allSuccess = results.every((r) => r.result.success);
        return { success: allSuccess, results };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Batch installation error:', message);
        return { success: false, error: message, results: [] };
      }
    },
  };
}
