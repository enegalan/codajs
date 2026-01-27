import { dialog, BrowserWindow } from 'electron';

export type PermissionLevel = 'always-allow' | 'allow-once' | 'deny';

export interface Permission {
  module: string;
  action: string;
  level: PermissionLevel;
  workspaceId?: string;
}

export class PermissionManager {
  private permissions: Map<string, Permission> = new Map();

  public async checkPermission(permission: string): Promise<boolean> {
    const perm = this.permissions.get(permission);
    if (!perm) {
      return false;
    }

    if (perm.level === 'deny') {
      return false;
    }

    if (perm.level === 'always-allow') {
      return true;
    }

    // 'allow-once' requires a new request each time
    return false;
  }

  public async requestPermission(permission: string): Promise<PermissionLevel> {
    const existing = this.permissions.get(permission);
    if (existing && existing.level === 'always-allow') {
      return 'always-allow';
    }

    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return 'deny';
    }

    const response = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Always Allow', 'Allow Once', 'Deny'],
      defaultId: 1,
      title: 'Permission Request',
      message: `Allow access to ${permission}?`,
      detail: 'This script is requesting permission to access system resources.',
    });

    let level: PermissionLevel;
    switch (response.response) {
      case 0:
        level = 'always-allow';
        break;
      case 1:
        level = 'allow-once';
        break;
      default:
        level = 'deny';
    }

    this.permissions.set(permission, {
      module: permission.split(':')[0],
      action: permission.split(':')[1] || 'access',
      level,
    });

    return level;
  }

  public setPermission(permission: string, level: PermissionLevel, workspaceId?: string): void {
    this.permissions.set(permission, {
      module: permission.split(':')[0],
      action: permission.split(':')[1] || 'access',
      level,
      workspaceId,
    });
  }

  public clearPermissions(workspaceId?: string): void {
    if (workspaceId) {
      for (const [key, perm] of this.permissions.entries()) {
        if (perm.workspaceId === workspaceId) {
          this.permissions.delete(key);
        }
      }
    } else {
      this.permissions.clear();
    }
  }
}
