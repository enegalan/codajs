import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow, app, Menu } from 'electron';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { RuntimeManager } from './runtime-manager';
import { PermissionManager } from './permission-manager';
import { ScriptExecutor } from '../execution/script-executor';
import {
  validateScriptExecution,
  validateFileContent,
  sanitizeFileName,
  ValidationError,
} from './validation';
import { DependencyResolver } from '../dependencies/resolver';
import { DependencyInstaller } from '../dependencies/installer';
import { AppStore } from './store';

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
    // Script execution (uses ScriptExecutor for full pipeline)
    ipcMain.handle(
      'runtime:execute',
      async (event: IpcMainInvokeEvent, script: unknown, options: unknown) => {
        try {
          const validated = validateScriptExecution(script, options);
          return await this.scriptExecutor.execute(validated.script, validated.options);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const isValidation = error instanceof ValidationError;
          if (!isValidation) {
            console.error('Script execution error:', message);
          }
          return { success: false, error: message };
        }
      }
    );

    ipcMain.handle('runtime:get-available', async () => {
      try {
        return await this.runtimeManager.getAvailableRuntimes();
      } catch (error: unknown) {
        console.error('Failed to get available runtimes:', error);
        return [];
      }
    });

    ipcMain.handle('runtime:set-default', async (event: IpcMainInvokeEvent, runtime: string) => {
      try {
        return await this.runtimeManager.setDefaultRuntime(runtime);
      } catch (error: unknown) {
        console.error('Failed to set default runtime:', error);
        return { success: false };
      }
    });

    ipcMain.handle('runtime:cancel', async () => {
      try {
        return await this.runtimeManager.cancelExecution();
      } catch (error: unknown) {
        console.error('Failed to cancel execution:', error);
        return { success: false };
      }
    });

    // File management
    ipcMain.handle(
      'file:save-auto',
      async (
        event: IpcMainInvokeEvent,
        content: unknown,
        fileName: unknown,
        savePath: unknown,
        language: unknown
      ) => {
        try {
          const validatedContent = validateFileContent(content);
          const sanitizedName = sanitizeFileName(fileName);

          let targetPath = typeof savePath === 'string' && savePath ? savePath : '';
          if (!targetPath) {
            targetPath = path.join(app.getPath('documents'), 'CodaJS');
          }

          // Create directory if it doesn't exist (async)
          try {
            await fsPromises.access(targetPath);
          } catch {
            await fsPromises.mkdir(targetPath, { recursive: true });
          }

          const extension = language === 'typescript' ? '.ts' : '.js';
          const filePath = path.join(targetPath, `${sanitizedName}${extension}`);

          await fsPromises.writeFile(filePath, validatedContent, 'utf-8');
          this.savedFiles.add(filePath);
          return { success: true, path: filePath };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Failed to save file:', message);
          return { success: false, error: message };
        }
      }
    );

    ipcMain.handle(
      'file:save-as',
      async (event: IpcMainInvokeEvent, content: unknown, defaultName?: unknown) => {
        try {
          const validatedContent = validateFileContent(content);
          const sanitizedName = sanitizeFileName(defaultName);

          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            return { success: false, error: 'No window found' };
          }

          const result = await dialog.showSaveDialog(window, {
            defaultPath: `${sanitizedName}.js`,
            filters: [
              { name: 'JavaScript', extensions: ['js'] },
              { name: 'TypeScript', extensions: ['ts'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          });

          if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
          }

          await fsPromises.writeFile(result.filePath, validatedContent, 'utf-8');
          return { success: true, path: result.filePath };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Failed to save file:', message);
          return { success: false, error: message };
        }
      }
    );

    ipcMain.handle('file:browse-folder', async (event: IpcMainInvokeEvent) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window!, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Save Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    });

    ipcMain.handle('file:get-default-save-path', async () => {
      return path.join(app.getPath('documents'), 'CodaJS');
    });

    ipcMain.handle('settings:get-ui-language', async () => {
      const storedLanguage = this.appStore.getSetting('uiLanguage');
      if (storedLanguage) {
        return storedLanguage;
      }
      const systemLocale = app.getLocale();
      return systemLocale.startsWith('es') ? 'es' : 'en';
    });

    ipcMain.handle('file:open', async (event: IpcMainInvokeEvent) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return { success: false, error: 'No window found' };
        }

        const result = await dialog.showOpenDialog(window, {
          properties: ['openFile'],
          filters: [
            { name: 'JavaScript', extensions: ['js'] },
            { name: 'TypeScript', extensions: ['ts'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        const content = await fsPromises.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath);
        const language = ext === '.ts' ? 'typescript' : 'javascript';

        return { success: true, content, fileName, language, path: filePath };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to open file:', message);
        return { success: false, error: message };
      }
    });

    // Permission management
    ipcMain.handle('permission:check', async (event: IpcMainInvokeEvent, permission: string) => {
      try {
        return await this.permissionManager.checkPermission(permission);
      } catch (error: unknown) {
        console.error('Permission check error:', error);
        return false;
      }
    });

    ipcMain.handle('permission:request', async (event: IpcMainInvokeEvent, permission: string) => {
      try {
        return await this.permissionManager.requestPermission(permission);
      } catch (error: unknown) {
        console.error('Permission request error:', error);
        return { granted: false };
      }
    });

    // Workspace management (not yet implemented)
    ipcMain.handle('workspace:list', async () => {
      // TODO: Implement workspace listing
      return [];
    });

    ipcMain.handle('workspace:create', async (event: IpcMainInvokeEvent, name: string) => {
      // TODO: Implement workspace creation
      return { id: `workspace-${Date.now()}`, name };
    });

    // Dependency management
    ipcMain.handle('dependency:resolve', async (event: IpcMainInvokeEvent, code: string) => {
      try {
        if (typeof code !== 'string') {
          return { success: false, error: 'Code must be a string', dependencies: [] };
        }
        const dependencies = this.dependencyResolver.extractDependencies(code);
        return { success: true, dependencies };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Dependency resolution error:', message);
        return { success: false, error: message, dependencies: [] };
      }
    });

    ipcMain.handle(
      'dependency:install',
      async (
        event: IpcMainInvokeEvent,
        packageName: string,
        version?: string,
        workspaceId?: string
      ) => {
        try {
          if (typeof packageName !== 'string' || !packageName.trim()) {
            return { success: false, error: 'Package name is required' };
          }
          const dependency = {
            name: packageName.trim(),
            version: version || 'latest',
            resolved: false,
          };
          const result = await this.dependencyInstaller.install(dependency, { workspaceId });
          return result;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Dependency installation error:', message);
          return { success: false, error: message };
        }
      }
    );

    ipcMain.handle(
      'dependency:install-batch',
      async (event: IpcMainInvokeEvent, code: string, workspaceId?: string) => {
        try {
          if (typeof code !== 'string') {
            return { success: false, error: 'Code must be a string', results: [] };
          }
          const dependencies = this.dependencyResolver.extractDependencies(code);
          if (dependencies.length === 0) {
            return { success: true, results: [] };
          }
          const results = await this.dependencyInstaller.installBatch(dependencies, {
            workspaceId,
          });
          const allSuccess = results.every((r) => r.result.success);
          return { success: allSuccess, results };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('Batch installation error:', message);
          return { success: false, error: message, results: [] };
        }
      }
    );

    // Tab context menu
    ipcMain.handle(
      'tab:show-context-menu',
      async (event: IpcMainInvokeEvent, tabId: string, tabCount: number) => {
        return new Promise((resolve) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            resolve(null);
            return;
          }

          const menuItems: Electron.MenuItemConstructorOptions[] = [
            {
              label: 'Close tab',
              accelerator: 'CmdOrCtrl+W',
              click: () => resolve('close'),
            },
          ];

          if (tabCount > 1) {
            menuItems.push(
              {
                label: 'Close others',
                click: () => resolve('close-others'),
              },
              {
                label: 'Close all',
                click: () => resolve('close-all'),
              }
            );
          }

          menuItems.push(
            { type: 'separator' },
            {
              label: 'Edit tab title...',
              click: () => resolve('rename'),
            }
          );

          const menu = Menu.buildFromTemplate(menuItems);
          menu.popup({
            window,
            callback: () => {
              resolve(null);
            },
          });
        });
      }
    );
  }
}
