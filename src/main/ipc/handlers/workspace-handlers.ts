import { IpcMainInvokeEvent } from 'electron';
import { IpcResponse, createSuccessResponse } from '../../../shared/utils/error-handling';

export function createWorkspaceHandlers() {
  return {
    'workspace:list': async (): Promise<IpcResponse<unknown[]>> => {
      return createSuccessResponse([]);
    },

    'workspace:create': async (
      event: IpcMainInvokeEvent,
      name: string
    ): Promise<IpcResponse<{ id: string; name: string }>> => {
      return createSuccessResponse({ id: `workspace-${Date.now()}`, name });
    },
  };
}
