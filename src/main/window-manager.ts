import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { AppStore } from './store';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private appStore: AppStore;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
  }

  public createMainWindow(): BrowserWindow {
    const { width, height, x, y } = this.getWindowBounds();

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width,
      height,
      x,
      y,
      minWidth: 500,
      minHeight: 300,
      icon: path.join(__dirname, '../../assets/icon_macos.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../dist/preload/preload.js'),
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
      show: false,
    };

    if (process.platform === 'darwin') {
      windowOptions.titleBarStyle = 'hiddenInset';
      windowOptions.titleBarOverlay = {
        color: '#252526',
        symbolColor: '#d4d4d4',
        height: 35,
      };
    } else {
      windowOptions.frame = false;
    }

    this.mainWindow = new BrowserWindow(windowOptions);

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('close', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('resized', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('moved', () => {
      this.saveWindowState();
    });

    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  private getWindowBounds(): { width: number; height: number; x?: number; y?: number } {
    const defaultBounds = {
      width: 1200,
      height: 800,
    };

    try {
      const storedState = this.loadWindowState();
      if (storedState) {
        const { width, height, x, y } = storedState;
        const display = screen.getDisplayNearestPoint({ x: x || 0, y: y || 0 });
        const { bounds } = display;

        if (
          x !== undefined &&
          y !== undefined &&
          x >= bounds.x &&
          x < bounds.x + bounds.width &&
          y >= bounds.y &&
          y < bounds.y + bounds.height
        ) {
          return { width, height, x, y };
        }
      }
    } catch (error) {
      console.error('Failed to load window state:', error);
    }

    return defaultBounds;
  }

  private saveWindowState(): void {
    if (!this.mainWindow) {
      return;
    }

    const bounds = this.mainWindow.getBounds();
    this.appStore.setSetting('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    });
  }

  private loadWindowState(): { width: number; height: number; x?: number; y?: number } | null {
    try {
      return this.appStore.getSetting('windowState') || null;
    } catch (error) {
      console.error('Failed to load window state:', error);
      return null;
    }
  }
}
