import { contextBridge, ipcRenderer } from 'electron';

// Listen for menu actions from main process
ipcRenderer.on('menu:new-tab', () => {
  window.dispatchEvent(new CustomEvent('menu:new-tab'));
});

ipcRenderer.on('menu:restore-tab', () => {
  window.dispatchEvent(new CustomEvent('menu:restore-tab'));
});

ipcRenderer.on('menu:open-file', () => {
  window.dispatchEvent(new CustomEvent('menu:open-file'));
});

ipcRenderer.on('menu:save', () => {
  window.dispatchEvent(new CustomEvent('menu:save'));
});

ipcRenderer.on('menu:save-as', () => {
  window.dispatchEvent(new CustomEvent('menu:save-as'));
});

ipcRenderer.on('menu:close-tab', () => {
  window.dispatchEvent(new CustomEvent('menu:close-tab'));
});

ipcRenderer.on('menu:editor-command', (_event, command: string) => {
  window.dispatchEvent(new CustomEvent('menu:editor-command', { detail: command }));
});

ipcRenderer.on('menu:execute', () => {
  window.dispatchEvent(new CustomEvent('menu:execute'));
});

ipcRenderer.on('menu:stop', () => {
  window.dispatchEvent(new CustomEvent('menu:stop'));
});

ipcRenderer.on('menu:kill', () => {
  window.dispatchEvent(new CustomEvent('menu:kill'));
});

ipcRenderer.on('menu:set-working-directory', () => {
  window.dispatchEvent(new CustomEvent('menu:set-working-directory'));
});

ipcRenderer.on('menu:format-code', () => {
  window.dispatchEvent(new CustomEvent('menu:format-code'));
});

ipcRenderer.on('menu:font-size-increase', () => {
  window.dispatchEvent(new CustomEvent('menu:font-size-increase'));
});

ipcRenderer.on('menu:font-size-decrease', () => {
  window.dispatchEvent(new CustomEvent('menu:font-size-decrease'));
});

ipcRenderer.on('menu:toggle-sidebar', (_event, visible: boolean) => {
  window.dispatchEvent(new CustomEvent('menu:toggle-sidebar', { detail: visible }));
  // Notify main process to update menu
  ipcRenderer.send('menu:update-sidebar', visible);
});

ipcRenderer.on('menu:toggle-console', (_event, visible: boolean) => {
  window.dispatchEvent(new CustomEvent('menu:toggle-console', { detail: visible }));
  // Notify main process to update menu
  ipcRenderer.send('menu:update-console', visible);
});

ipcRenderer.on('menu:set-layout', (_event, orientation: string) => {
  window.dispatchEvent(new CustomEvent('menu:set-layout', { detail: orientation }));
  // Notify main process to update menu
  ipcRenderer.send('menu:update-layout', orientation);
});

ipcRenderer.on('menu:set-theme', (_event, theme: string) => {
  window.dispatchEvent(new CustomEvent('menu:set-theme', { detail: theme }));
  // Notify main process to update menu
  ipcRenderer.send('menu:update-theme', theme);
});

ipcRenderer.on('menu:reset-font-size', () => {
  window.dispatchEvent(new CustomEvent('menu:reset-font-size'));
});

// Listen for theme changes from renderer and notify main process
window.addEventListener('app:theme-changed', ((event: CustomEvent<string>) => {
  ipcRenderer.send('menu:update-theme', event.detail);
}) as EventListener);

// Listen for locale changes from renderer and notify main process
window.addEventListener('app:locale-changed', ((event: CustomEvent<string>) => {
  ipcRenderer.send('menu:update-locale', event.detail);
}) as EventListener);

// Listen for layout changes from renderer and notify main process
window.addEventListener('app:layout-changed', ((event: CustomEvent<string>) => {
  ipcRenderer.send('menu:update-layout', event.detail);
}) as EventListener);

// Listen for sidebar changes from renderer and notify main process
window.addEventListener('app:sidebar-changed', ((event: CustomEvent<boolean>) => {
  ipcRenderer.send('menu:update-sidebar', event.detail);
}) as EventListener);

// Listen for console changes from renderer and notify main process
window.addEventListener('app:console-changed', ((event: CustomEvent<boolean>) => {
  ipcRenderer.send('menu:update-console', event.detail);
}) as EventListener);

contextBridge.exposeInMainWorld('electronAPI', {
  // Runtime API
  executeScript: (script: string, options?: Record<string, unknown>) =>
    ipcRenderer.invoke('runtime:execute', script, options),
  prepareScriptForBrowser: (script: string) =>
    ipcRenderer.invoke('runtime:prepare-for-browser', script),
  cancelExecution: () => ipcRenderer.invoke('runtime:cancel'),
  getAvailableRuntimes: () => ipcRenderer.invoke('runtime:get-available'),
  setDefaultRuntime: (runtime: string) => ipcRenderer.invoke('runtime:set-default', runtime),

  // File API
  saveFileAuto: (content: string, fileName: string, savePath: string, language: string) =>
    ipcRenderer.invoke('file:save-auto', content, fileName, savePath, language),
  saveFileAs: (content: string, defaultName?: string) =>
    ipcRenderer.invoke('file:save-as', content, defaultName),
  openFile: () => ipcRenderer.invoke('file:open'),
  browseFolder: () => ipcRenderer.invoke('file:browse-folder'),
  getDefaultSavePath: () => ipcRenderer.invoke('file:get-default-save-path'),

  // Permission API
  checkPermission: (permission: string) => ipcRenderer.invoke('permission:check', permission),
  requestPermission: (permission: string) => ipcRenderer.invoke('permission:request', permission),

  // Workspace API
  listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
  createWorkspace: (name: string) => ipcRenderer.invoke('workspace:create', name),

  // Dependency API
  resolveDependencies: (imports: string[]) => ipcRenderer.invoke('dependency:resolve', imports),
  installDependency: (packageName: string) => ipcRenderer.invoke('dependency:install', packageName),

  // Tab context menu
  showTabContextMenu: (tabId: string, tabCount: number) =>
    ipcRenderer.invoke('tab:show-context-menu', tabId, tabCount),
});
