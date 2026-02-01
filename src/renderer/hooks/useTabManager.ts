import { useState, useEffect, useCallback, useRef } from 'react';
import { Tab } from '../../shared/types';
import { loadTabs, saveTabs } from '../utils/tabPersistence';

const DEFAULT_CODE = 'console.log("Hello, CodaJS!");';
const DEFAULT_RUNTIME = 'browser';

const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getNextUntitledNumber = (tabs: Tab[]): number => {
  const untitledPattern = /^Untitled(?: (\d+))?$/;
  let maxNumber = 0;

  for (const tab of tabs) {
    const match = tab.title.match(untitledPattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return maxNumber + 1;
};

const getDefaultTabTitle = (code: string, existingTabs: Tab[] = []): string => {
  const firstLine = code.split('\n').find((line) => line.trim().length > 0);
  if (!firstLine) {
    const nextNum = getNextUntitledNumber(existingTabs);
    return `Untitled ${nextNum}`;
  }
  const trimmed = firstLine.trim();
  return trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
};

const createNewTab = (
  code: string = DEFAULT_CODE,
  runtime: string = DEFAULT_RUNTIME,
  existingTabs: Tab[] = []
): Tab => {
  const now = Date.now();
  return {
    id: generateTabId(),
    title: getDefaultTabTitle(code, existingTabs),
    code,
    output: [],
    runtime,
    inspectedValue: null,
    createdAt: now,
    modifiedAt: now,
  };
};

const MAX_CLOSED_TABS_HISTORY = 20;

interface ClosedTabEntry {
  tab: Tab;
  index: number;
}

export const useTabManager = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [closedTabsHistory, setClosedTabsHistory] = useState<ClosedTabEntry[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loaded = loadTabs();
    if (loaded && loaded.tabs.length > 0) {
      setTabs(loaded.tabs);
      setActiveTabId(loaded.activeTabId);
    } else {
      const initialTab = createNewTab();
      setTabs([initialTab]);
      setActiveTabId(initialTab.id);
    }
    setTimeout(() => setIsInitialized(true), 100);
  }, []);

  const createTab = useCallback((runtime?: string): string => {
    let newTabId = '';
    setTabs((prev) => {
      const newTab = createNewTab('', runtime || DEFAULT_RUNTIME, prev);
      newTabId = newTab.id;
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
    return newTabId;
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const tabIndex = prev.findIndex((tab) => tab.id === id);
        const tabToClose = prev[tabIndex];

        if (tabToClose) {
          setClosedTabsHistory((history) => {
            const newHistory = [{ tab: tabToClose, index: tabIndex }, ...history];
            return newHistory.slice(0, MAX_CLOSED_TABS_HISTORY);
          });
        }

        if (prev.length <= 1) {
          const newTab = createNewTab('', DEFAULT_RUNTIME, []);
          setActiveTabId(newTab.id);
          return [newTab];
        }
        const filtered = prev.filter((tab) => tab.id !== id);
        if (activeTabId === id) {
          const newIndex = tabIndex > 0 ? tabIndex - 1 : 0;
          setActiveTabId(filtered[newIndex]?.id || filtered[0]?.id || '');
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((prev) => {
      const tabToKeepIndex = prev.findIndex((tab) => tab.id === id);
      const tabToKeep = prev[tabToKeepIndex];
      if (!tabToKeep) {
        return prev;
      }

      const tabsToClose = prev
        .map((tab, index) => ({ tab, index }))
        .filter((entry) => entry.tab.id !== id);

      if (tabsToClose.length > 0) {
        setClosedTabsHistory((history) => {
          const newEntries = tabsToClose.reverse();
          const newHistory = [...newEntries, ...history];
          return newHistory.slice(0, MAX_CLOSED_TABS_HISTORY);
        });
      }

      setActiveTabId(id);
      return [tabToKeep];
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => {
      const tabsToClose = prev.map((tab, index) => ({ tab, index }));

      if (tabsToClose.length > 0) {
        setClosedTabsHistory((history) => {
          const newEntries = tabsToClose.reverse();
          const newHistory = [...newEntries, ...history];
          return newHistory.slice(0, MAX_CLOSED_TABS_HISTORY);
        });
      }

      const newTab = createNewTab('', DEFAULT_RUNTIME, []);
      setActiveTabId(newTab.id);
      return [newTab];
    });
  }, []);

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) => {
      return prev.map((tab) => {
        if (tab.id === id) {
          const updatedTab = { ...tab, ...updates };
          // Only update modifiedAt when code changes
          if (updates.code !== undefined && updates.code !== tab.code) {
            updatedTab.modifiedAt = Date.now();
            if (updates.title === undefined) {
              updatedTab.title = getDefaultTabTitle(updates.code, prev);
            }
          }
          return updatedTab;
        }
        return tab;
      });
    });
  }, []);

  const renameTab = useCallback(
    (id: string, title: string) => {
      updateTab(id, { title });
    },
    [updateTab]
  );

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      if (fromIndex === toIndex) {
        return prev;
      }
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const restoreLastClosedTab = useCallback(() => {
    if (closedTabsHistory.length === 0) {
      return false;
    }

    const [lastClosed, ...remainingHistory] = closedTabsHistory;
    setClosedTabsHistory(remainingHistory);

    const restoredTab: Tab = {
      ...lastClosed.tab,
      id: generateTabId(),
    };

    setTabs((prev) => {
      const insertIndex = Math.min(lastClosed.index, prev.length);
      const result = [...prev];
      result.splice(insertIndex, 0, restoredTab);
      return result;
    });

    setActiveTabId(restoredTab.id);
    return true;
  }, [closedTabsHistory]);

  const canRestoreTab = closedTabsHistory.length > 0;

  useEffect(() => {
    if (!isInitialized || tabs.length === 0 || !activeTabId) {
      return;
    }

    // Debounced save for performance
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTabs({ tabs, activeTabId });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, activeTabId, isInitialized]);

  // Save immediately before window closes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      if (tabs.length > 0 && activeTabId) {
        saveTabs({ tabs, activeTabId });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && tabs.length > 0 && activeTabId) {
        saveTabs({ tabs, activeTabId });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tabs, activeTabId]);

  // Periodic backup save every 10 seconds
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const intervalId = setInterval(() => {
      if (tabs.length > 0 && activeTabId) {
        saveTabs({ tabs, activeTabId });
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [tabs, activeTabId, isInitialized]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return {
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
    canRestoreTab,
  };
};
