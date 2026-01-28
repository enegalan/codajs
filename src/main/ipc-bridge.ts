import { ipcMain } from 'electron';
import * as fsPromises from 'fs/promises';
import { RuntimeManager } from './runtime-manager';
import { PermissionManager } from './permission-manager';
import { ScriptExecutor } from '../execution/script-executor';
import { DependencyResolver } from '../dependencies/resolver';
import { DependencyInstaller } from '../dependencies/installer';
import { AppStore } from './store';
import { createRuntimeHandlers } from './ipc/handlers/runtime-handlers';
import { createFileHandlers, FileHandlersContext } from './ipc/handlers/file-handlers';
import { createPermissionHandlers } from './ipc/handlers/permission-handlers';
import { createDependencyHandlers } from './ipc/handlers/dependency-handlers';
import { createWorkspaceHandlers } from './ipc/handlers/workspace-handlers';
import { createTabHandlers } from './ipc/handlers/tab-handlers';
import { createSettingsHandlers } from './ipc/handlers/settings-handlers';

export class IpcBridge {
  private runtimeManager: RuntimeManager;
  private permissionManager: PermissionManager;
  private scriptExecutor: ScriptExecutor;
  private dependencyResolver: DependencyResolver;
  private dependencyInstaller: DependencyInstaller;
  private savedFiles: Set<string> = new Set();
  private appStore: AppStore;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
    this.runtimeManager = new RuntimeManager();
    this.permissionManager = new PermissionManager();
    this.scriptExecutor = new ScriptExecutor(this.runtimeManager, this.permissionManager);
    this.dependencyResolver = new DependencyResolver();
    this.dependencyInstaller = new DependencyInstaller();
  }

  public async cleanupSavedFiles(): Promise<void> {
    const deletePromises = Array.from(this.savedFiles).map(async (filePath) => {
      try {
        await fsPromises.access(filePath);
        await fsPromises.unlink(filePath);
      } catch (error) {
        // File doesn't exist or can't be deleted - ignore
      }
    });

    await Promise.all(deletePromises);
    this.savedFiles.clear();
  }

  public setupHandlers(): void {
    const fileContext: FileHandlersContext = { savedFiles: this.savedFiles };

    const runtimeHandlers = createRuntimeHandlers(this.runtimeManager, this.scriptExecutor);
    const fileHandlers = createFileHandlers(fileContext);
    const permissionHandlers = createPermissionHandlers(this.permissionManager);
    const dependencyHandlers = createDependencyHandlers(
      this.dependencyResolver,
      this.dependencyInstaller
    );
    const workspaceHandlers = createWorkspaceHandlers();
    const tabHandlers = createTabHandlers();
    const settingsHandlers = createSettingsHandlers(this.appStore);

    const allHandlers = {
      ...runtimeHandlers,
      ...fileHandlers,
      ...permissionHandlers,
      ...dependencyHandlers,
      ...workspaceHandlers,
      ...tabHandlers,
      ...settingsHandlers,
    };

    for (const [channel, handler] of Object.entries(allHandlers)) {
      ipcMain.handle(channel, handler as any);
    }
  }
}
