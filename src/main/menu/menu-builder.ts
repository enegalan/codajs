import { BrowserWindow, Menu, ipcMain, shell } from 'electron';
import { exec } from 'child_process';
import { getMenuTranslations } from '../menu-translations';
import {
  createPlayIcon,
  createStopIcon,
  createVerticalLayoutIcon,
  createHorizontalLayoutIcon,
  createThemePreviewIcon,
} from './icons';
import { getThemeColors, THEME_NAMES, formatThemeName } from '../../shared/themes/theme-colors';
import { app } from 'electron';
import { AppStore } from '../store';

export interface MenuState {
  currentTheme: string;
  currentLocale: 'en' | 'es';
  currentLayout: 'vertical' | 'horizontal';
  sidebarVisible: boolean;
  consoleVisible: boolean;
}

export class MenuBuilder {
  private appStore: AppStore;
  private state: MenuState;

  constructor(appStore: AppStore, initialState: MenuState) {
    this.appStore = appStore;
    this.state = initialState;
  }

  public setupMacMenu(currentTheme?: string, locale?: 'en' | 'es'): void {
    const theme = currentTheme || this.state.currentTheme;
    this.state.currentTheme = theme;
    const lang = locale || this.state.currentLocale;
    this.state.currentLocale = lang;
    const t = getMenuTranslations(lang);

    const themeMenuItems: Electron.MenuItemConstructorOptions[] = THEME_NAMES.map((themeName) => {
      const colors = getThemeColors(themeName);
      const icon = createThemePreviewIcon(colors);
      const label = formatThemeName(themeName);
      return {
        label: label,
        type: 'radio',
        checked: themeName === theme,
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.webContents.send('menu:set-theme', themeName);
            this.state.currentTheme = themeName;
            this.updateThemeMenu(themeName);
          }
        },
        icon: icon,
      };
    });

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'CodaJS',
        submenu: [
          { role: 'about', label: 'About CodaJS' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide CodaJS' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit CodaJS' },
        ],
      },
      {
        label: t.file,
        submenu: [
          {
            label: t.newTab,
            accelerator: 'CmdOrCtrl+T',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:new-tab');
              }
            },
          },
          {
            label: t.reopenClosedTab,
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:restore-tab');
              }
            },
          },
          {
            label: t.open,
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:open-file');
              }
            },
          },
          { type: 'separator' },
          {
            label: t.save,
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:save');
              }
            },
          },
          {
            label: t.saveAs,
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:save-as');
              }
            },
          },
          { type: 'separator' },
          {
            label: t.close,
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:close-tab');
              }
            },
          },
        ],
      },
      {
        label: t.edit,
        submenu: [
          { role: 'undo', label: t.undo },
          { role: 'redo', label: t.redo, accelerator: 'CmdOrCtrl+Shift+Z' },
          { type: 'separator' },
          { role: 'cut', label: t.cut },
          { role: 'copy', label: t.copy },
          { role: 'paste', label: t.paste },
          { role: 'selectAll', label: t.selectAll },
          {
            label: t.deleteAll,
            accelerator: 'CmdOrCtrl+Shift+K',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:editor-command', 'deleteAll');
              }
            },
          },
          { type: 'separator' },
          {
            label: t.find,
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:editor-command', 'find');
              }
            },
          },
          {
            label: t.replace,
            accelerator: 'CmdOrCtrl+Alt+F',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:editor-command', 'replace');
              }
            },
          },
          { type: 'separator' },
          {
            label: t.toggleLineComment,
            accelerator: "CmdOrCtrl+'",
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:editor-command', 'commentLine');
              }
            },
          },
          {
            label: t.toggleBlockComment,
            accelerator: "CmdOrCtrl+Alt+'",
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:editor-command', 'blockComment');
              }
            },
          },
        ],
      },
      {
        label: t.action,
        submenu: [
          {
            label: t.execute,
            icon: createPlayIcon(),
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:execute');
              }
            },
          },
          {
            label: t.stop,
            icon: createStopIcon(),
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:stop');
              }
            },
          },
          {
            label: t.kill,
            accelerator: 'CmdOrCtrl+K',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:kill');
              }
            },
          },
          { type: 'separator' },
          {
            label: t.setWorkingDirectory,
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:set-working-directory');
              }
            },
          },
          {
            label: t.formatCode,
            accelerator: 'CmdOrCtrl+Alt+F',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:format-code');
              }
            },
          },
        ],
      },
      {
        label: t.view,
        submenu: [
          {
            label: t.actualSize,
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:reset-font-size');
              }
            },
          },
          {
            label: t.increaseFontSize,
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:font-size-increase');
              }
            },
          },
          {
            label: t.decreaseFontSize,
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send('menu:font-size-decrease');
              }
            },
          },
          { role: 'togglefullscreen', label: t.fullscreen },
          { type: 'separator' },
          ...(this.isDevelopmentMode()
            ? [
                {
                  label: t.toggleDevTools,
                  accelerator: 'CmdOrCtrl+Shift+I',
                  click: () => {
                    const window = BrowserWindow.getFocusedWindow();
                    if (window) {
                      if (window.webContents.isDevToolsOpened()) {
                        window.webContents.closeDevTools();
                      } else {
                        window.webContents.openDevTools();
                      }
                    }
                  },
                } as Electron.MenuItemConstructorOptions,
                { type: 'separator' as const } as Electron.MenuItemConstructorOptions,
              ]
            : []),
          {
            label: t.sidebar,
            id: 'sidebar-menu-item',
            type: 'checkbox' as const,
            checked: this.state.sidebarVisible,
            click: (menuItem) => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                this.state.sidebarVisible = menuItem.checked;
                window.webContents.send('menu:toggle-sidebar', menuItem.checked);
                this.updateSidebarMenu(menuItem.checked);
              }
            },
          },
          {
            label: t.output,
            id: 'console-menu-item',
            type: 'checkbox' as const,
            checked: this.state.consoleVisible,
            click: (menuItem) => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                this.state.consoleVisible = menuItem.checked;
                window.webContents.send('menu:toggle-console', menuItem.checked);
                this.updateConsoleMenu(menuItem.checked);
              }
            },
          },
          {
            label: t.layout,
            id: 'layout-menu',
            submenu: [
              {
                label: t.vertical,
                id: 'layout-vertical',
                icon: createVerticalLayoutIcon(),
                type: 'radio',
                checked: this.state.currentLayout === 'vertical',
                click: () => {
                  const window = BrowserWindow.getFocusedWindow();
                  if (window) {
                    window.webContents.send('menu:set-layout', 'vertical');
                    this.state.currentLayout = 'vertical';
                    this.updateLayoutMenu('vertical');
                  }
                },
              },
              {
                label: t.horizontal,
                id: 'layout-horizontal',
                icon: createHorizontalLayoutIcon(),
                type: 'radio',
                checked: this.state.currentLayout === 'horizontal',
                click: () => {
                  const window = BrowserWindow.getFocusedWindow();
                  if (window) {
                    window.webContents.send('menu:set-layout', 'horizontal');
                    this.state.currentLayout = 'horizontal';
                    this.updateLayoutMenu('horizontal');
                  }
                },
              },
            ],
          },
        ],
      },
      {
        label: t.window,
        submenu: [
          {
            label: t.minimize,
            role: 'minimize' as const,
            accelerator: 'CmdOrCtrl+M',
          },
          {
            label: t.zoom,
            role: 'zoom' as const,
          },
          { type: 'separator' as const },
          {
            label: t.bringAllToFront,
            role: 'front' as const,
          },
        ],
      },
      {
        label: t.themes,
        id: 'themes-menu',
        submenu: themeMenuItems,
      },
      {
        label: t.help,
        submenu: [
          {
            label: t.sendFeedbackToApple,
            click: () => {
              exec('open -a "Feedback Assistant"', (error: Error | null) => {
                if (error) {
                  shell.openExternal('https://www.apple.com/feedback/');
                }
              });
            },
          },
          { type: 'separator' },
          {
            label: t.documentation,
            click: () => {
              shell.openExternal('https://github.com/enegalan/codajs');
            },
          },
          {
            label: t.reportIssue,
            click: () => {
              shell.openExternal('https://github.com/enegalan/codajs/issues');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  public setupMenuUpdateListener(): void {
    ipcMain.on('menu:update-theme', (_event: Electron.IpcMainEvent, theme: string) => {
      this.updateThemeMenu(theme);
    });

    ipcMain.on('menu:update-locale', (_event: Electron.IpcMainEvent, locale: 'en' | 'es') => {
      this.state.currentLocale = locale;
      this.appStore.setSetting('uiLanguage', locale);
      this.setupMacMenu(this.state.currentTheme, locale);
    });

    ipcMain.on(
      'menu:update-layout',
      (_event: Electron.IpcMainEvent, layout: 'vertical' | 'horizontal') => {
        this.updateLayoutMenu(layout);
      }
    );

    ipcMain.on('menu:update-sidebar', (_event: Electron.IpcMainEvent, visible: boolean) => {
      this.updateSidebarMenu(visible);
    });

    ipcMain.on('menu:update-console', (_event: Electron.IpcMainEvent, visible: boolean) => {
      this.updateConsoleMenu(visible);
    });
  }

  public updateThemeMenu(theme: string): void {
    this.state.currentTheme = theme;
    this.setupMacMenu(theme);
  }

  public updateLayoutMenu(layout: 'vertical' | 'horizontal'): void {
    this.state.currentLayout = layout;
    this.setupMacMenu(this.state.currentTheme, this.state.currentLocale);
  }

  public updateSidebarMenu(visible: boolean): void {
    this.state.sidebarVisible = visible;
    const menuBar = Menu.getApplicationMenu();
    if (!menuBar) {
      return;
    }

    const viewMenuItem = menuBar.items.find((item) => {
      const t = getMenuTranslations(this.state.currentLocale);
      return item.label === t.view;
    });
    if (viewMenuItem && viewMenuItem.submenu) {
      const sidebarMenuItem = viewMenuItem.submenu.items.find(
        (item) => item.id === 'sidebar-menu-item'
      );
      if (sidebarMenuItem && sidebarMenuItem.type === 'checkbox') {
        sidebarMenuItem.checked = visible;
        Menu.setApplicationMenu(menuBar);
      }
    }
  }

  public updateConsoleMenu(visible: boolean): void {
    this.state.consoleVisible = visible;
    const menuBar = Menu.getApplicationMenu();
    if (!menuBar) {
      return;
    }

    const viewMenuItem = menuBar.items.find((item) => {
      const t = getMenuTranslations(this.state.currentLocale);
      return item.label === t.view;
    });
    if (viewMenuItem && viewMenuItem.submenu) {
      const consoleMenuItem = viewMenuItem.submenu.items.find(
        (item) => item.id === 'console-menu-item'
      );
      if (consoleMenuItem && consoleMenuItem.type === 'checkbox') {
        consoleMenuItem.checked = visible;
        Menu.setApplicationMenu(menuBar);
      }
    }
  }

  private isDevelopmentMode(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_DEVTOOLS === 'true' ||
      !app.isPackaged
    );
  }
}
