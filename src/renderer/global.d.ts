declare global {
  interface Window {
    electronAPI: {
      executeScript: (script: string, options?: Record<string, unknown>) => Promise<unknown>;
      prepareScriptForBrowser: (script: string) => Promise<{
        success: boolean;
        wrappedScript?: string;
        resultLine?: number;
        expressionLines?: Array<[number, string]>;
        error?: string;
      }>;
      cancelExecution: () => Promise<void>;
      getAvailableRuntimes: () => Promise<
        Array<{ name: string; version: string; available: boolean }>
      >;
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
      listWorkspaces: () => Promise<unknown[]>;
      createWorkspace: (name: string) => Promise<unknown>;
      resolveDependencies: (imports: string[]) => Promise<unknown>;
      installDependency: (packageName: string) => Promise<unknown>;
      showTabContextMenu: (tabId: string, tabCount: number) => Promise<string | null>;
    };
  }
}

export {};
