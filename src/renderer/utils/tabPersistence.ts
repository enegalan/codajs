import { TabState } from '../../shared/types';

const STORAGE_KEY = 'codajs-tabs';
const MAX_TABS = 20;

export const loadTabs = (): TabState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const state = JSON.parse(stored) as TabState;
    if (!state.tabs || !Array.isArray(state.tabs) || state.tabs.length === 0) {
      return null;
    }
    if (state.tabs.length > MAX_TABS) {
      state.tabs = state.tabs.slice(0, MAX_TABS);
    }
    if (!state.activeTabId || !state.tabs.find((t) => t.id === state.activeTabId)) {
      state.activeTabId = state.tabs[0].id;
    }
    return state;
  } catch (error) {
    console.error('Failed to load tabs from storage:', error);
    return null;
  }
};

export const saveTabs = (state: TabState): void => {
  try {
    const tabsToSave = state.tabs.slice(0, MAX_TABS);
    const stateToSave: TabState = {
      tabs: tabsToSave,
      activeTabId: state.activeTabId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save tabs to storage:', error);
  }
};

export const clearTabs = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear tabs from storage:', error);
  }
};
