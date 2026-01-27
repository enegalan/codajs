import { useState, useEffect, useCallback } from 'react';
import {
  AppSettings,
  loadSettings,
  saveSettings,
  getDefaultSettings,
} from '../utils/settingsPersistence';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
      applyTheme(settings.appearance.theme);
      // Notify main process when theme changes
      if (settings.appearance.theme) {
        window.dispatchEvent(
          new CustomEvent('app:theme-changed', { detail: settings.appearance.theme })
        );
      }
      // Notify main process when locale changes
      if (settings.general.uiLanguage) {
        window.dispatchEvent(
          new CustomEvent('app:locale-changed', { detail: settings.general.uiLanguage })
        );
      }
      // Notify main process when layout changes
      if (settings.appearance.layoutOrientation) {
        window.dispatchEvent(
          new CustomEvent('app:layout-changed', { detail: settings.appearance.layoutOrientation })
        );
      }
      // Notify main process when sidebar visibility changes
      if (settings.appearance.sidebarVisible !== undefined) {
        window.dispatchEvent(
          new CustomEvent('app:sidebar-changed', { detail: settings.appearance.sidebarVisible })
        );
      }
      // Notify main process when console visibility changes
      if (settings.appearance.consoleVisible !== undefined) {
        window.dispatchEvent(
          new CustomEvent('app:console-changed', { detail: settings.appearance.consoleVisible })
        );
      }
    }
  }, [settings, isLoaded]);

  const updateGeneralSettings = useCallback((updates: Partial<AppSettings['general']>) => {
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, ...updates },
    }));
  }, []);

  const updateCompilationSettings = useCallback((updates: Partial<AppSettings['compilation']>) => {
    setSettings((prev) => ({
      ...prev,
      compilation: { ...prev.compilation, ...updates },
    }));
  }, []);

  const updateAppearanceSettings = useCallback((updates: Partial<AppSettings['appearance']>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(getDefaultSettings());
  }, []);

  return {
    settings,
    isLoaded,
    updateGeneralSettings,
    updateCompilationSettings,
    updateAppearanceSettings,
    resetSettings,
  };
};

const applyTheme = (theme: AppSettings['appearance']['theme']) => {
  document.documentElement.setAttribute('data-theme', theme);
};
