import Store from 'electron-store';

export interface AppSettings {
  defaultRuntime: string;
  theme: 'light' | 'dark' | 'high-contrast';
  uiLanguage?: 'en' | 'es';
  windowState?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  shortcuts?: Record<string, string>;
}

export interface WorkspaceSettings {
  runtime?: string;
  permissions?: Record<string, string>;
  eslintConfig?: unknown;
}

export class AppStore {
  private store: Store<AppSettings>;
  private workspaceStores: Map<string, Store<WorkspaceSettings>> = new Map();

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'app-settings',
      defaults: {
        defaultRuntime: 'browser',
        theme: 'dark',
        uiLanguage: undefined,
      },
    });
  }

  public getSettings(): AppSettings {
    return this.store.store;
  }

  public setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  public getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | undefined {
    return this.store.get(key);
  }

  public getWorkspaceStore(workspaceId: string): Store<WorkspaceSettings> {
    if (!this.workspaceStores.has(workspaceId)) {
      const workspaceStore = new Store<WorkspaceSettings>({
        name: `workspace-${workspaceId}`,
        defaults: {},
      });
      this.workspaceStores.set(workspaceId, workspaceStore);
    }
    return this.workspaceStores.get(workspaceId)!;
  }

  public getWorkspaceSettings(workspaceId: string): WorkspaceSettings {
    const workspaceStore = this.getWorkspaceStore(workspaceId);
    return workspaceStore.store;
  }

  public setWorkspaceSetting<K extends keyof WorkspaceSettings>(
    workspaceId: string,
    key: K,
    value: WorkspaceSettings[K]
  ): void {
    const workspaceStore = this.getWorkspaceStore(workspaceId);
    workspaceStore.set(key, value);
  }
}
