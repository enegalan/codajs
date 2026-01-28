import { IpcMainInvokeEvent, dialog, BrowserWindow, app } from 'electron';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { validateFileContent, sanitizeFileName } from '../../validation';
import { handleIpcError } from '../ipc-error-handler';
import {
  IpcResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../../../shared/utils/error-handling';

export interface FileHandlersContext {
  savedFiles: Set<string>;
}

export function createFileHandlers(context: FileHandlersContext) {
  return {
    'file:save-auto': async (
      event: IpcMainInvokeEvent,
      content: unknown,
      fileName: unknown,
      savePath: unknown,
      language: unknown
    ): Promise<IpcResponse<{ path: string }>> => {
      try {
        const validatedContent = validateFileContent(content);
        const sanitizedName = sanitizeFileName(fileName);

        let targetPath = typeof savePath === 'string' && savePath ? savePath : '';
        if (!targetPath) {
          targetPath = path.join(app.getPath('documents'), 'CodaJS');
        }

        try {
          await fsPromises.access(targetPath);
        } catch {
          await fsPromises.mkdir(targetPath, { recursive: true });
        }

        const extension = language === 'typescript' ? '.ts' : '.js';
        const filePath = path.join(targetPath, `${sanitizedName}${extension}`);

        await fsPromises.writeFile(filePath, validatedContent, 'utf-8');
        context.savedFiles.add(filePath);
        return createSuccessResponse({ path: filePath });
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to save file');
      }
    },

    'file:save-as': async (
      event: IpcMainInvokeEvent,
      content: unknown,
      defaultName?: unknown
    ): Promise<IpcResponse<{ path: string }>> => {
      try {
        const validatedContent = validateFileContent(content);
        const sanitizedName = sanitizeFileName(defaultName);

        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return createErrorResponse(new Error('No window found'));
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
          return createErrorResponse(new Error('Save canceled'), true);
        }

        await fsPromises.writeFile(result.filePath, validatedContent, 'utf-8');
        return createSuccessResponse({ path: result.filePath });
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to save file');
      }
    },

    'file:browse-folder': async (event: IpcMainInvokeEvent): Promise<string | null> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window!, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Save Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    },

    'file:get-default-save-path': async (): Promise<string> => {
      return path.join(app.getPath('documents'), 'CodaJS');
    },

    'file:open': async (
      event: IpcMainInvokeEvent
    ): Promise<
      IpcResponse<{ content: string; fileName: string; language: string; path: string }>
    > => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return createErrorResponse(new Error('No window found'));
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
          return createErrorResponse(new Error('Open canceled'), true);
        }

        const filePath = result.filePaths[0];
        const content = await fsPromises.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath);
        const language = ext === '.ts' ? 'typescript' : 'javascript';

        return createSuccessResponse({ content, fileName, language, path: filePath });
      } catch (error: unknown) {
        return handleIpcError(error, 'Failed to open file');
      }
    },
  };
}
