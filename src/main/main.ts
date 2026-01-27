import { app, BrowserWindow, Menu, nativeImage, shell, ipcMain } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';
import { WindowManager } from './window-manager';
import { IpcBridge } from './ipc-bridge';
import { AppStore } from './store';
import { getMenuTranslations } from './menu-translations';

// Set app name as early as possible (before app is ready)
app.setName('CodaJS');

class CodaJSApp {
  private windowManager: WindowManager;
  private ipcBridge: IpcBridge;
  private appStore: AppStore;
  private currentTheme: string = 'dark';
  private currentLocale: 'en' | 'es' = 'en';
  private currentLayout: 'vertical' | 'horizontal' = 'vertical';
  private sidebarVisible: boolean = true;
  private consoleVisible: boolean = true;

  constructor() {
    this.appStore = new AppStore();
    this.windowManager = new WindowManager(this.appStore);
    this.ipcBridge = new IpcBridge(this.appStore);
  }

  public async initialize(): Promise<void> {
    await app.whenReady();

    // Configure About panel
    const iconPath = path.join(__dirname, '../../assets/icon_macos.png');
    app.setAboutPanelOptions({
      applicationName: 'CodaJS',
      applicationVersion: app.getVersion(),
      version: '',
      copyright: 'Copyright © 2026 CodaJS',
      iconPath: iconPath,
      authors: ['enekogalanelorza@gmail.com'],
    });

    // Set app menu and dock icon for macOS
    if (process.platform === 'darwin') {
      // Get stored locale or fall back to system locale
      const storedLocale = this.appStore.getSetting('uiLanguage');
      if (storedLocale) {
        this.currentLocale = storedLocale;
      } else {
        const systemLocale = app.getLocale();
        this.currentLocale = systemLocale.startsWith('es') ? 'es' : 'en';
        this.appStore.setSetting('uiLanguage', this.currentLocale);
      }
      this.setupMacMenu('dark', this.currentLocale);
      // Set dock icon
      const dockIcon = nativeImage.createFromPath(iconPath);
      if (!dockIcon.isEmpty()) {
        app.dock.setIcon(dockIcon);
      }
    }

    this.windowManager.createMainWindow();
    this.ipcBridge.setupHandlers();
    this.setupMenuUpdateListener();

    app.on('window-all-closed', () => {
      this.ipcBridge.cleanupSavedFiles();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.ipcBridge.cleanupSavedFiles();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      }
    });
  }

  private createThemePreviewIcon(colors: string[]): Electron.NativeImage {
    const width = 100;
    const height = 16;
    const segmentWidth = Math.floor(width / colors.length);

    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
    };

    const buffer = Buffer.alloc(width * height * 4);
    let offset = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const segmentIndex = Math.floor(x / segmentWidth);
        const color = colors[Math.min(segmentIndex, colors.length - 1)];
        const [r, g, b] = hexToRgb(color);
        buffer[offset++] = b;
        buffer[offset++] = g;
        buffer[offset++] = r;
        buffer[offset++] = 255;
      }
    }

    return nativeImage.createFromBuffer(buffer, { width, height });
  }

  private createPlayIcon(): Electron.NativeImage {
    const size = 32; // Use larger size for better quality, macOS will scale down
    const scale = 2; // @2x for retina displays
    const buffer = Buffer.alloc(size * size * 4);
    let offset = 0;

    // Draw a triangle pointing right (play icon) with anti-aliasing
    // Triangle vertices: (8, 4), (8, 28), (24, 16)
    const x1 = 8;
    const y1 = 4;
    const x2 = 8;
    const y2 = 28;
    const x3 = 24;
    const y3 = 16;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Calculate distance to triangle edges for anti-aliasing
        const dist1 = this.distanceToLine(x, y, x1, y1, x2, y2);
        const dist2 = this.distanceToLine(x, y, x2, y2, x3, y3);
        const dist3 = this.distanceToLine(x, y, x3, y3, x1, y1);

        const inside = this.isPointInTriangle(x, y, x1, y1, x2, y2, x3, y3);

        if (inside) {
          // Calculate anti-aliasing based on distance to edges
          const minDist = Math.min(dist1, dist2, dist3);
          const alpha = Math.min(255, Math.max(0, 255 - minDist * 2));

          buffer[offset++] = 255; // R
          buffer[offset++] = 255; // G
          buffer[offset++] = 255; // B
          buffer[offset++] = alpha; // A (with anti-aliasing)
        } else {
          buffer[offset++] = 0; // R
          buffer[offset++] = 0; // G
          buffer[offset++] = 0; // B
          buffer[offset++] = 0; // A (transparent)
        }
      }
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
  }

  private distanceToLine(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createStopIcon(): Electron.NativeImage {
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    let offset = 0;

    // Draw a square (stop icon)
    const margin = 3;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x >= margin && x < size - margin && y >= margin && y < size - margin) {
          buffer[offset++] = 255; // R
          buffer[offset++] = 255; // G
          buffer[offset++] = 255; // B
          buffer[offset++] = 255; // A
        } else {
          buffer[offset++] = 0; // R
          buffer[offset++] = 0; // G
          buffer[offset++] = 0; // B
          buffer[offset++] = 0; // A (transparent)
        }
      }
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  private isPointInTriangle(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ): boolean {
    const d1 = this.sign(px, py, x1, y1, x2, y2);
    const d2 = this.sign(px, py, x2, y2, x3, y3);
    const d3 = this.sign(px, py, x3, y3, x1, y1);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  }

  private sign(
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number
  ): number {
    return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
  }

  private createVerticalLayoutIcon(): Electron.NativeImage {
    const size = 32;
    const scale = 2;
    const buffer = Buffer.alloc(size * size * 4);
    let offset = 0;

    // Draw two rectangles stacked vertically
    const rectWidth = 10;
    const rectHeight = 12;
    const spacing = 2;
    const startX = (size - rectWidth) / 2;
    const topY = (size - (rectHeight * 2 + spacing)) / 2;
    const bottomY = topY + rectHeight + spacing;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Top rectangle
        const inTopRect =
          x >= startX && x < startX + rectWidth && y >= topY && y < topY + rectHeight;
        // Bottom rectangle
        const inBottomRect =
          x >= startX && x < startX + rectWidth && y >= bottomY && y < bottomY + rectHeight;

        if (inTopRect || inBottomRect) {
          buffer[offset++] = 255; // R
          buffer[offset++] = 255; // G
          buffer[offset++] = 255; // B
          buffer[offset++] = 255; // A
        } else {
          buffer[offset++] = 0; // R
          buffer[offset++] = 0; // G
          buffer[offset++] = 0; // B
          buffer[offset++] = 0; // A (transparent)
        }
      }
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
  }

  private createHorizontalLayoutIcon(): Electron.NativeImage {
    const size = 32;
    const scale = 2;
    const buffer = Buffer.alloc(size * size * 4);
    let offset = 0;

    // Draw two rectangles side by side horizontally
    const rectWidth = 12;
    const rectHeight = 10;
    const spacing = 2;
    const startY = (size - rectHeight) / 2;
    const leftX = (size - (rectWidth * 2 + spacing)) / 2;
    const rightX = leftX + rectWidth + spacing;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Left rectangle
        const inLeftRect =
          x >= leftX && x < leftX + rectWidth && y >= startY && y < startY + rectHeight;
        // Right rectangle
        const inRightRect =
          x >= rightX && x < rightX + rectWidth && y >= startY && y < startY + rectHeight;

        if (inLeftRect || inRightRect) {
          buffer[offset++] = 255; // R
          buffer[offset++] = 255; // G
          buffer[offset++] = 255; // B
          buffer[offset++] = 255; // A
        } else {
          buffer[offset++] = 0; // R
          buffer[offset++] = 0; // G
          buffer[offset++] = 0; // B
          buffer[offset++] = 0; // A (transparent)
        }
      }
    }
    return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
  }

  private getThemeColors(theme: string): string[] {
    const themeColors: Record<string, string[]> = {
      dark: ['#1e1e1e', '#007acc', '#3e3e3e', '#252526', '#d4d4d4'],
      light: ['#ffffff', '#007acc', '#e0e0e0', '#f3f3f3', '#333333'],
      dracula: ['#282a36', '#bd93f9', '#ff79c6', '#50fa7b', '#ffb86c'],
      neon: ['#0d0d0d', '#00ff00', '#36bf03', '#00ff00', '#0a0a0a'],
      monokai: ['#272822', '#1e1f1c', '#49483e', '#3e3d32', '#75715e'],
      nord: ['#2e3440', '#3b4252', '#434c5e', '#5e81ac', '#88c0d0'],
      'one-dark': ['#282c34', '#21252b', '#3e4451', '#5c6370', '#abb2bf'],
      'solarized-dark': ['#002b36', '#073642', '#586e75', '#657b83', '#839496'],
      'solarized-light': ['#fdf6e3', '#eee8d5', '#93a1a1', '#839496', '#657b83'],
      gruvbox: ['#282828', '#3c3836', '#504945', '#928374', '#ebdbb2'],
      'tokyo-night': ['#1a1b26', '#24283b', '#2f3549', '#565f89', '#c0caf5'],
      'synthwave-84': ['#1a1032', '#36f9f6', '#f92aad', '#f4d03f', '#ffb8d1'],
    };
    return themeColors[theme] || themeColors.dark;
  }

  private setupMacMenu(currentTheme?: string, locale?: 'en' | 'es'): void {
    const theme = currentTheme || this.currentTheme;
    this.currentTheme = theme;
    const lang = locale || this.currentLocale;
    this.currentLocale = lang;
    const t = getMenuTranslations(lang);

    const themes = [
      'dark',
      'light',
      'dracula',
      'neon',
      'monokai',
      'nord',
      'one-dark',
      'solarized-dark',
      'solarized-light',
      'gruvbox',
      'tokyo-night',
      'synthwave-84',
    ];
    const themeMenuItems: Electron.MenuItemConstructorOptions[] = themes.map((themeName) => {
      const colors = this.getThemeColors(themeName);
      const icon = this.createThemePreviewIcon(colors);
      const label = themeName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace('84', "'84");
      return {
        label: label,
        type: 'radio',
        checked: themeName === theme,
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.webContents.send('menu:set-theme', themeName);
            this.currentTheme = themeName;
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
            icon: this.createPlayIcon(),
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
            icon: this.createStopIcon(),
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
            checked: this.sidebarVisible,
            click: (menuItem) => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                this.sidebarVisible = menuItem.checked;
                window.webContents.send('menu:toggle-sidebar', menuItem.checked);
                this.updateSidebarMenu(menuItem.checked);
              }
            },
          },
          {
            label: t.output,
            id: 'console-menu-item',
            type: 'checkbox' as const,
            checked: this.consoleVisible,
            click: (menuItem) => {
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                this.consoleVisible = menuItem.checked;
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
                icon: this.createVerticalLayoutIcon(),
                type: 'radio',
                checked: this.currentLayout === 'vertical',
                click: () => {
                  const window = BrowserWindow.getFocusedWindow();
                  if (window) {
                    window.webContents.send('menu:set-layout', 'vertical');
                    this.currentLayout = 'vertical';
                    this.updateLayoutMenu('vertical');
                  }
                },
              },
              {
                label: t.horizontal,
                id: 'layout-horizontal',
                icon: this.createHorizontalLayoutIcon(),
                type: 'radio',
                checked: this.currentLayout === 'horizontal',
                click: () => {
                  const window = BrowserWindow.getFocusedWindow();
                  if (window) {
                    window.webContents.send('menu:set-layout', 'horizontal');
                    this.currentLayout = 'horizontal';
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
              // Try to open Feedback Assistant using macOS 'open' command
              // This works for developers and beta testers who have Feedback Assistant installed
              exec('open -a "Feedback Assistant"', (error) => {
                if (error) {
                  // If Feedback Assistant is not available, open web feedback
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

  private setupMenuUpdateListener(): void {
    ipcMain.on('menu:update-theme', (_event: Electron.IpcMainEvent, theme: string) => {
      this.updateThemeMenu(theme);
    });

    ipcMain.on('menu:update-locale', (_event: Electron.IpcMainEvent, locale: 'en' | 'es') => {
      this.currentLocale = locale;
      this.appStore.setSetting('uiLanguage', locale);
      this.setupMacMenu(this.currentTheme, locale);
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

  private updateThemeMenu(theme: string): void {
    this.currentTheme = theme;
    // Rebuild the entire menu to ensure the checked state is updated
    this.setupMacMenu(theme);
  }

  private updateLayoutMenu(layout: 'vertical' | 'horizontal'): void {
    this.currentLayout = layout;
    // Rebuild the entire menu to ensure the checked state is updated
    this.setupMacMenu(this.currentTheme, this.currentLocale);
  }

  private updateSidebarMenu(visible: boolean): void {
    this.sidebarVisible = visible;
    const menuBar = Menu.getApplicationMenu();
    if (!menuBar) {
      return;
    }

    const viewMenuItem = menuBar.items.find((item) => {
      const t = getMenuTranslations(this.currentLocale);
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

  private updateConsoleMenu(visible: boolean): void {
    this.consoleVisible = visible;
    const menuBar = Menu.getApplicationMenu();
    if (!menuBar) {
      return;
    }

    const viewMenuItem = menuBar.items.find((item) => {
      const t = getMenuTranslations(this.currentLocale);
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

const codaJSApp = new CodaJSApp();
codaJSApp.initialize().catch(console.error);
