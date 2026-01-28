import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Layout,
  Editor,
  Console,
  ValueInspector,
  TabBar,
  Sidebar,
  SettingsModal,
  ErrorBoundary,
} from './components';
import { useTabManager, useSettings } from './hooks';
import { executeScript, createErrorEntry } from './services';
import { DEBOUNCE_DELAYS } from './constants';
import { I18nProvider, useI18n } from './i18n';
import { AppSettings } from './utils/settingsPersistence';
import './App.css';

const AppContent: React.FC = () => {
  const { t } = useI18n();
  const [isMac, setIsMac] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const autoExecuteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutedCodeRef = useRef<string>('');
  const handleTabCloseRef = useRef<(tabId: string) => void>(() => {});

  const {
    settings,
    isLoaded: settingsLoaded,
    updateGeneralSettings,
    updateCompilationSettings,
    updateAppearanceSettings,
    resetSettings,
  } = useSettings();

  useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    setIsMac(platform.includes('mac'));
  }, []);

  // Send theme, locale, layout, sidebar, and console to main process for menu whenever they change
  useEffect(() => {
    if (settingsLoaded) {
      // Use a custom event that preload will handle
      // Small delay to ensure preload script is ready on initial load
      const delay = 100;
      setTimeout(() => {
        if (settings.appearance.theme) {
          window.dispatchEvent(
            new CustomEvent('app:theme-changed', { detail: settings.appearance.theme })
          );
        }
        if (settings.general.uiLanguage) {
          window.dispatchEvent(
            new CustomEvent('app:locale-changed', { detail: settings.general.uiLanguage })
          );
        }
        if (settings.appearance.layoutOrientation) {
          window.dispatchEvent(
            new CustomEvent('app:layout-changed', { detail: settings.appearance.layoutOrientation })
          );
        }
        if (settings.appearance.sidebarVisible !== undefined) {
          window.dispatchEvent(
            new CustomEvent('app:sidebar-changed', { detail: settings.appearance.sidebarVisible })
          );
        }
        if (settings.appearance.consoleVisible !== undefined) {
          window.dispatchEvent(
            new CustomEvent('app:console-changed', { detail: settings.appearance.consoleVisible })
          );
        }
      }, delay);
    }
  }, [
    settingsLoaded,
    settings.appearance.theme,
    settings.general.uiLanguage,
    settings.appearance.layoutOrientation,
    settings.appearance.sidebarVisible,
    settings.appearance.consoleVisible,
  ]);

  const {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    switchTab,
    updateTab,
    renameTab,
    reorderTabs,
    restoreLastClosedTab,
  } = useTabManager();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMacPlatform = navigator.platform.toLowerCase().includes('mac');
      const modifierKey = isMacPlatform ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        restoreLastClosedTab();
      }

      if (modifierKey && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          handleTabCloseRef.current(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restoreLastClosedTab, activeTabId]);

  const handleCodeChange = useCallback(
    (code: string) => {
      if (activeTab) {
        updateTab(activeTab.id, { code });
      }
    },
    [activeTab, updateTab]
  );

  // Auto-execution when code changes
  useEffect(() => {
    if (!settings.general.autoExecution || !activeTab || isExecuting) {
      return;
    }

    // Clear output and reset ref when code is empty
    if (!activeTab.code.trim()) {
      if (lastExecutedCodeRef.current !== '') {
        lastExecutedCodeRef.current = '';
        updateTab(activeTab.id, { output: [] });
      }
      return;
    }

    // Don't re-execute the same code
    if (activeTab.code === lastExecutedCodeRef.current) {
      return;
    }

    // Clear previous timeout
    if (autoExecuteTimeoutRef.current) {
      clearTimeout(autoExecuteTimeoutRef.current);
    }

    // Debounce execution
    autoExecuteTimeoutRef.current = setTimeout(async () => {
      if (!activeTab || !activeTab.code.trim()) {
        return;
      }

      lastExecutedCodeRef.current = activeTab.code;
      setIsExecuting(true);

      try {
        const entries = await executeScript(activeTab.code, {
          runtime: settings.compilation.defaultRuntime,
          timeout: settings.compilation.timeout,
        });
        updateTab(activeTab.id, { output: entries });
      } catch (error: unknown) {
        updateTab(activeTab.id, { output: [createErrorEntry(error)] });
      } finally {
        setIsExecuting(false);
      }
    }, DEBOUNCE_DELAYS.AUTO_EXECUTE);

    return () => {
      if (autoExecuteTimeoutRef.current) {
        clearTimeout(autoExecuteTimeoutRef.current);
      }
    };
  }, [activeTab?.code, activeTab?.id, settings.general.autoExecution, updateTab]);

  const handleExecute = useCallback(async () => {
    if (!activeTab || isExecuting || !activeTab.code.trim()) {
      return;
    }

    setIsExecuting(true);
    try {
      const entries = await executeScript(activeTab.code, {
        runtime: settings.compilation.defaultRuntime,
        timeout: settings.compilation.timeout,
      });
      updateTab(activeTab.id, { output: entries, savedAt: Date.now() });
    } catch (error: unknown) {
      updateTab(activeTab.id, { output: [createErrorEntry(error)] });
    } finally {
      setIsExecuting(false);
    }
  }, [activeTab, isExecuting, settings.compilation, updateTab]);

  const handleTabClose = useCallback(
    (tabId: string) => {
      const tab = tabs.find((tabItem) => tabItem.id === tabId);
      if (!tab) {
        closeTab(tabId);
        return;
      }

      const isModified = tab.modifiedAt > (tab.savedAt || tab.createdAt);

      if (settings.general.confirmClose && isModified) {
        const confirmed = window.confirm(t.app.confirmCloseTab);
        if (!confirmed) {
          return;
        }
      }

      closeTab(tabId);
    },
    [tabs, settings.general.confirmClose, closeTab, t.app.confirmCloseTab]
  );

  handleTabCloseRef.current = handleTabClose;

  const handleTabCloseOthers = useCallback(
    (tabId: string) => {
      const otherTabs = tabs.filter((tabItem) => tabItem.id !== tabId);
      const hasModified = otherTabs.some(
        (tabItem) => tabItem.modifiedAt > (tabItem.savedAt || tabItem.createdAt)
      );

      if (settings.general.confirmClose && hasModified) {
        const confirmed = window.confirm(t.app.confirmCloseOthers);
        if (!confirmed) {
          return;
        }
      }

      closeOtherTabs(tabId);
    },
    [tabs, settings.general.confirmClose, closeOtherTabs, t.app.confirmCloseOthers]
  );

  const handleTabCloseAll = useCallback(() => {
    const hasModified = tabs.some(
      (tabItem) => tabItem.modifiedAt > (tabItem.savedAt || tabItem.createdAt)
    );

    if (settings.general.confirmClose && hasModified) {
      const confirmed = window.confirm(t.app.confirmCloseAll);
      if (!confirmed) {
        return;
      }
    }

    closeAllTabs();
  }, [tabs, settings.general.confirmClose, closeAllTabs, t.app.confirmCloseAll]);

  const handleCreateTab = useCallback(async () => {
    // Auto-save current tab if enabled and has unsaved changes
    if (settings.general.autoSave && activeTab) {
      const isModified = activeTab.modifiedAt > (activeTab.savedAt || activeTab.createdAt);
      if (isModified) {
        try {
          const result = await window.electronAPI.saveFileAuto(
            activeTab.code,
            activeTab.title,
            settings.general.savePath,
            settings.general.language
          );
          if (result.success) {
            updateTab(activeTab.id, { savedAt: Date.now() });
          }
        } catch (error) {
          console.error('Failed to auto-save:', error);
        }
      }
    }
    createTab(settings.compilation.defaultRuntime);
  }, [createTab, settings.compilation.defaultRuntime, settings.general, activeTab, updateTab]);

  const handleStop = useCallback(async () => {
    if (!isExecuting) {
      return;
    }
    try {
      await window.electronAPI.cancelExecution();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
    setIsExecuting(false);
  }, [isExecuting]);

  const handleSaveToFile = useCallback(async () => {
    if (!activeTab) {
      return;
    }
    try {
      const result = await window.electronAPI.saveFileAuto(
        activeTab.code,
        activeTab.title,
        settings.general.savePath,
        settings.general.language
      );
      if (result.success) {
        updateTab(activeTab.id, { savedAt: Date.now() });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [activeTab, settings.general, updateTab]);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // Menu event listeners
  useEffect(() => {
    const handleNewTab = () => {
      handleCreateTab();
    };

    const handleRestoreTab = () => {
      restoreLastClosedTab();
    };

    const handleOpenFile = async () => {
      try {
        const result = await window.electronAPI.openFile();
        if (result.success && result.content) {
          const newTabId = createTab(settings.compilation.defaultRuntime);
          updateTab(newTabId, {
            code: result.content,
            title: result.fileName || 'Untitled',
          });
          if (result.language) {
            updateGeneralSettings({ language: result.language });
          }
        }
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    };

    const handleSave = () => {
      handleSaveToFile();
    };

    const handleSaveAs = async () => {
      if (!activeTab) {
        return;
      }
      try {
        const result = await window.electronAPI.saveFileAs(activeTab.code, activeTab.title);
        if (result.success && result.path) {
          updateTab(activeTab.id, { savedAt: Date.now() });
        }
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    };

    const handleCloseTab = () => {
      if (activeTabId) {
        handleTabClose(activeTabId);
      }
    };

    const handleMenuExecute = () => {
      if (!activeTab || isExecuting || !activeTab.code.trim()) {
        return;
      }
      handleExecute();
    };

    const handleMenuStop = () => {
      if (!isExecuting) {
        return;
      }
      handleStop();
    };

    const handleKill = async () => {
      try {
        await window.electronAPI.cancelExecution();
        setIsExecuting(false);
      } catch (error) {
        console.error('Failed to kill execution:', error);
      }
    };

    const handleSetWorkingDirectory = async () => {
      try {
        const path = await window.electronAPI.browseFolder();
        if (path) {
          updateGeneralSettings({ workingDirectory: path });
        }
      } catch (error) {
        console.error('Failed to set working directory:', error);
      }
    };

    const handleFontSizeIncrease = () => {
      const newSize = Math.min(24, settings.appearance.fontSize + 1);
      updateAppearanceSettings({ fontSize: newSize });
    };

    const handleFontSizeDecrease = () => {
      const newSize = Math.max(10, settings.appearance.fontSize - 1);
      updateAppearanceSettings({ fontSize: newSize });
    };

    const handleResetFontSize = () => {
      updateAppearanceSettings({ fontSize: 14 });
    };

    const handleToggleSidebar = (event: CustomEvent<boolean>) => {
      updateAppearanceSettings({ sidebarVisible: event.detail });
    };

    const handleToggleConsole = (event: CustomEvent<boolean>) => {
      updateAppearanceSettings({ consoleVisible: event.detail });
    };

    const handleSetLayout = (event: CustomEvent<string>) => {
      const newLayout = event.detail as 'vertical' | 'horizontal';
      updateAppearanceSettings({
        layoutOrientation: newLayout,
      });
      // Notify main process immediately when layout changes from menu
      window.dispatchEvent(new CustomEvent('app:layout-changed', { detail: newLayout }));
    };

    const handleSetTheme = (event: CustomEvent<string>) => {
      const newTheme = event.detail as AppSettings['appearance']['theme'];
      updateAppearanceSettings({ theme: newTheme });
      // Notify main process immediately when theme changes from menu
      window.dispatchEvent(new CustomEvent('app:theme-changed', { detail: newTheme }));
    };

    window.addEventListener('menu:new-tab', handleNewTab);
    window.addEventListener('menu:restore-tab', handleRestoreTab);
    window.addEventListener('menu:open-file', handleOpenFile);
    window.addEventListener('menu:save', handleSave);
    window.addEventListener('menu:save-as', handleSaveAs);
    window.addEventListener('menu:close-tab', handleCloseTab);
    window.addEventListener('menu:execute', handleMenuExecute);
    window.addEventListener('menu:stop', handleMenuStop);
    window.addEventListener('menu:kill', handleKill);
    window.addEventListener('menu:set-working-directory', handleSetWorkingDirectory);
    window.addEventListener('menu:font-size-increase', handleFontSizeIncrease);
    window.addEventListener('menu:font-size-decrease', handleFontSizeDecrease);
    window.addEventListener('menu:reset-font-size', handleResetFontSize);
    window.addEventListener('menu:toggle-sidebar', handleToggleSidebar as EventListener);
    window.addEventListener('menu:toggle-console', handleToggleConsole as EventListener);
    window.addEventListener('menu:set-layout', handleSetLayout as EventListener);
    window.addEventListener('menu:set-theme', handleSetTheme as EventListener);

    return () => {
      window.removeEventListener('menu:new-tab', handleNewTab);
      window.removeEventListener('menu:restore-tab', handleRestoreTab);
      window.removeEventListener('menu:open-file', handleOpenFile);
      window.removeEventListener('menu:save', handleSave);
      window.removeEventListener('menu:save-as', handleSaveAs);
      window.removeEventListener('menu:close-tab', handleCloseTab);
      window.removeEventListener('menu:execute', handleMenuExecute);
      window.removeEventListener('menu:stop', handleMenuStop);
      window.removeEventListener('menu:kill', handleKill);
      window.removeEventListener('menu:set-working-directory', handleSetWorkingDirectory);
      window.removeEventListener('menu:font-size-increase', handleFontSizeIncrease);
      window.removeEventListener('menu:font-size-decrease', handleFontSizeDecrease);
      window.removeEventListener('menu:reset-font-size', handleResetFontSize);
      window.removeEventListener('menu:toggle-sidebar', handleToggleSidebar as EventListener);
      window.removeEventListener('menu:toggle-console', handleToggleConsole as EventListener);
      window.removeEventListener('menu:set-layout', handleSetLayout as EventListener);
      window.removeEventListener('menu:set-theme', handleSetTheme as EventListener);
    };
  }, [
    handleCreateTab,
    restoreLastClosedTab,
    createTab,
    updateTab,
    settings,
    activeTab,
    activeTabId,
    handleTabClose,
    handleExecute,
    handleStop,
    handleSaveToFile,
    updateGeneralSettings,
    updateAppearanceSettings,
  ]);

  const handleTabSwitch = async (tabId: string) => {
    if (tabId === activeTabId) {
      // Save current tab when clicking on active tab
      if (activeTab) {
        await handleSaveToFile();
      }
      return;
    }

    // Auto-save current tab if enabled and has unsaved changes
    if (settings.general.autoSave && activeTab) {
      const isModified = activeTab.modifiedAt > (activeTab.savedAt || activeTab.createdAt);
      if (isModified) {
        try {
          const result = await window.electronAPI.saveFileAuto(
            activeTab.code,
            activeTab.title,
            settings.general.savePath,
            settings.general.language
          );
          if (result.success) {
            updateTab(activeTab.id, { savedAt: Date.now() });
          }
        } catch (error) {
          console.error('Failed to auto-save:', error);
        }
      }
    }

    switchTab(tabId);
  };

  if (!activeTab) {
    return (
      <div className="app-container">
        <div className="app-empty">{t.app.noTabs}</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <div className={`app-header ${isMac ? 'app-header-mac' : ''}`}>
          <div className="app-header-drag-area" />
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSwitch={handleTabSwitch}
            onTabClose={handleTabClose}
            onTabCloseOthers={handleTabCloseOthers}
            onTabCloseAll={handleTabCloseAll}
            onTabCreate={handleCreateTab}
            onTabRename={renameTab}
            onTabReorder={reorderTabs}
          />
        </div>
        <div className="app-main">
          <Sidebar
            onExecute={handleExecute}
            onStop={handleStop}
            onSettings={handleOpenSettings}
            isExecuting={isExecuting}
            visible={settings.appearance.sidebarVisible}
          />
          {settings.appearance.consoleVisible ? (
            <Layout
              orientation={settings.appearance.layoutOrientation}
              left={
                <Editor
                  code={activeTab.code}
                  onChange={handleCodeChange}
                  onExecute={handleExecute}
                  onSave={handleSaveToFile}
                  language={settings.general.language}
                  fontSize={settings.appearance.fontSize}
                  theme={settings.appearance.theme}
                />
              }
              right={
                <div className="app-right-panel">
                  <Console
                    output={activeTab.output}
                    fontSize={settings.appearance.fontSize}
                    visible={settings.appearance.consoleVisible}
                  />
                  {activeTab.inspectedValue && <ValueInspector value={activeTab.inspectedValue} />}
                </div>
              }
            />
          ) : (
            <div className="app-editor-full">
              <Editor
                code={activeTab.code}
                onChange={handleCodeChange}
                onExecute={handleExecute}
                onSave={handleSaveToFile}
                language={settings.general.language}
                fontSize={settings.appearance.fontSize}
                theme={settings.appearance.theme}
              />
            </div>
          )}
        </div>
        <SettingsModal
          isOpen={showSettings}
          onClose={handleCloseSettings}
          settings={settings}
          onUpdateGeneral={updateGeneralSettings}
          onUpdateCompilation={updateCompilationSettings}
          onUpdateAppearance={updateAppearanceSettings}
          onReset={resetSettings}
        />
      </div>
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  const { settings } = useSettings();

  return (
    <I18nProvider locale={settings.general.uiLanguage}>
      <AppContent />
    </I18nProvider>
  );
};
