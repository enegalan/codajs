import { IpcMainInvokeEvent, BrowserWindow, Menu } from 'electron';

export function createTabHandlers() {
  return {
    'tab:show-context-menu': async (
      event: IpcMainInvokeEvent,
      tabId: string,
      tabCount: number
    ): Promise<string | null> => {
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
    },
  };
}
