export interface AppSettings {
  general: {
    language: 'javascript' | 'typescript';
    uiLanguage: 'en' | 'es';
    autoExecution: boolean;
    autoSave: boolean;
    confirmClose: boolean;
    savePath: string;
    workingDirectory: string;
  };
  compilation: {
    timeout: number;
    defaultRuntime: 'node' | 'deno' | 'bun' | 'browser';
  };
  appearance: {
    theme:
      | 'dark'
      | 'light'
      | 'dracula'
      | 'neon'
      | 'monokai'
      | 'nord'
      | 'one-dark'
      | 'solarized-dark'
      | 'solarized-light'
      | 'gruvbox'
      | 'tokyo-night'
      | 'synthwave-84';
    fontSize: number;
    sidebarVisible: boolean;
    consoleVisible: boolean;
    layoutOrientation: 'vertical' | 'horizontal';
  };
}

const STORAGE_KEY = 'codajs-settings';

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: 'javascript',
    uiLanguage: 'en',
    autoExecution: false,
    autoSave: false,
    confirmClose: true,
    savePath: '',
    workingDirectory: '',
  },
  compilation: {
    timeout: 5000,
    defaultRuntime: 'browser',
  },
  appearance: {
    theme: 'dark',
    fontSize: 14,
    sidebarVisible: true,
    consoleVisible: true,
    layoutOrientation: 'vertical',
  },
};

export const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(stored);
    return {
      general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
      compilation: { ...DEFAULT_SETTINGS.compilation, ...parsed.compilation },
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        ...parsed.appearance,
        sidebarVisible:
          parsed.appearance?.sidebarVisible ?? DEFAULT_SETTINGS.appearance.sidebarVisible,
        consoleVisible:
          parsed.appearance?.consoleVisible ?? DEFAULT_SETTINGS.appearance.consoleVisible,
        layoutOrientation:
          parsed.appearance?.layoutOrientation ?? DEFAULT_SETTINGS.appearance.layoutOrientation,
      },
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const getDefaultSettings = (): AppSettings => {
  return { ...DEFAULT_SETTINGS };
};
