import { IpcMainInvokeEvent } from 'electron';
import { RuntimeManager } from '../../runtime-manager';
import { ScriptExecutor } from '../../../execution/script-executor';
import { validateScriptExecution, ValidationError } from '../../validation';
import { handleIpcError } from '../ipc-error-handler';
import { IpcResponse } from '../../../shared/utils/error-handling';

export function createRuntimeHandlers(
  runtimeManager: RuntimeManager,
  scriptExecutor: ScriptExecutor
) {
  return {
    'runtime:execute': async (
      event: IpcMainInvokeEvent,
      script: unknown,
      options: unknown
    ): Promise<IpcResponse> => {
      try {
        const validated = validateScriptExecution(script, options);
        return await scriptExecutor.execute(validated.script, validated.options);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          return { success: false, error: error.message };
        }
        return handleIpcError(error, 'Script execution error');
      }
    },

    'runtime:prepare-for-browser': async (
      event: IpcMainInvokeEvent,
      script: unknown
    ): Promise<IpcResponse> => {
      try {
        if (typeof script !== 'string') {
          return { success: false, error: 'Script must be a string' };
        }
        if (script.length === 0) {
          return { success: false, error: 'Script cannot be empty' };
        }
        if (script.length > 1000000) {
          return { success: false, error: 'Script exceeds maximum length (1MB)' };
        }
        const prepared = runtimeManager.prepareScriptForBrowser(script);
        return { success: true, ...prepared };
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to prepare script for browser');
      }
    },

    'runtime:get-available': async (): Promise<
      Array<{ name: string; version: string; available: boolean }>
    > => {
      try {
        return await runtimeManager.getAvailableRuntimes();
      } catch (error: unknown) {
        console.error('Failed to get available runtimes:', error);
        return [];
      }
    },

    'runtime:set-default': async (
      event: IpcMainInvokeEvent,
      runtime: string
    ): Promise<IpcResponse> => {
      try {
        await runtimeManager.setDefaultRuntime(runtime);
        return { success: true };
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to set default runtime');
      }
    },

    'runtime:cancel': async (): Promise<IpcResponse> => {
      try {
        await runtimeManager.cancelExecution();
        return { success: true };
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to cancel execution');
      }
    },
  };
}
