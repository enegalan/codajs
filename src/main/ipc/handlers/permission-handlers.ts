import { IpcMainInvokeEvent } from 'electron';
import { PermissionManager } from '../../permission-manager';

export function createPermissionHandlers(permissionManager: PermissionManager) {
  return {
    'permission:check': async (event: IpcMainInvokeEvent, permission: string): Promise<boolean> => {
      try {
        return await permissionManager.checkPermission(permission);
      } catch (error: unknown) {
        console.error('Permission check error:', error);
        return false;
      }
    },

    'permission:request': async (
      event: IpcMainInvokeEvent,
      permission: string
    ): Promise<{ granted: boolean }> => {
      try {
        const level = await permissionManager.requestPermission(permission);
        return { granted: level !== 'deny' };
      } catch (error: unknown) {
        console.error('Permission request error:', error);
        return { granted: false };
      }
    },
  };
}
