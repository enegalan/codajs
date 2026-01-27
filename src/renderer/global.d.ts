declare global {
  interface Window {
    electronAPI: {
      executeScript: (script: string, options?: any) => Promise<any>;
      cancelExecution: () => Promise<void>;
      getAvailableRuntimes: () => Promise<any>;
      setDefaultRuntime: (runtime: string) => Promise<void>;
      saveFileAuto: (
        content: string,
        fileName: string,
        savePath: string,
        language: string
      ) => Promise<{ success: boolean; path?: string; error?: string }>;
      saveFileAs: (
        content: string,
        defaultName?: string
      ) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      openFile: () => Promise<{
        success: boolean;
        content?: string;
        fileName?: string;
        language?: 'javascript' | 'typescript';
        path?: string;
        canceled?: boolean;
        error?: string;
      }>;
      browseFolder: () => Promise<string | null>;
      getDefaultSavePath: () => Promise<string>;
      checkPermission: (permission: string) => Promise<boolean>;
      requestPermission: (permission: string) => Promise<string>;
      listWorkspaces: () => Promise<any[]>;
      createWorkspace: (name: string) => Promise<any>;
      resolveDependencies: (imports: string[]) => Promise<any>;
      installDependency: (packageName: string) => Promise<any>;
      showTabContextMenu: (tabId: string, tabCount: number) => Promise<string | null>;
    };
  }
}

export {};
