import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import { WindowManager } from './window-manager';
import { IpcBridge } from './ipc-bridge';
import { AppStore } from './store';
import { MenuBuilder } from './menu/menu-builder';

// Set app name as early as possible (before app is ready)
app.setName('CodaJS');

class CodaJSApp {
  private windowManager: WindowManager;
  private ipcBridge: IpcBridge;
  private appStore: AppStore;
  private menuBuilder: MenuBuilder;

  constructor() {
    this.appStore = new AppStore();
    this.windowManager = new WindowManager(this.appStore);
    this.ipcBridge = new IpcBridge(this.appStore);
    this.menuBuilder = new MenuBuilder(this.appStore, {
      currentTheme: 'dark',
      currentLocale: 'en',
      currentLayout: 'vertical',
      sidebarVisible: true,
      consoleVisible: true,
    });
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
      let locale: 'en' | 'es' = 'en';
      if (storedLocale) {
        locale = storedLocale;
      } else {
        const systemLocale = app.getLocale();
        locale = systemLocale.startsWith('es') ? 'es' : 'en';
        this.appStore.setSetting('uiLanguage', locale);
      }
      this.menuBuilder.setupMacMenu('dark', locale);
      // Set dock icon
      const dockIcon = nativeImage.createFromPath(iconPath);
      if (!dockIcon.isEmpty()) {
        app.dock.setIcon(dockIcon);
      }
    }

    this.windowManager.createMainWindow();
    this.ipcBridge.setupHandlers();
    this.menuBuilder.setupMenuUpdateListener();

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
}

const codaJSApp = new CodaJSApp();
codaJSApp.initialize().catch(console.error);
