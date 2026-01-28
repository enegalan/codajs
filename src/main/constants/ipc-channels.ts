export const IPC_CHANNELS = {
  RUNTIME: {
    EXECUTE: 'runtime:execute',
    GET_AVAILABLE: 'runtime:get-available',
    SET_DEFAULT: 'runtime:set-default',
    CANCEL: 'runtime:cancel',
  },
  FILE: {
    SAVE_AUTO: 'file:save-auto',
    SAVE_AS: 'file:save-as',
    BROWSE_FOLDER: 'file:browse-folder',
    GET_DEFAULT_SAVE_PATH: 'file:get-default-save-path',
    OPEN: 'file:open',
  },
  PERMISSION: {
    CHECK: 'permission:check',
    REQUEST: 'permission:request',
  },
  DEPENDENCY: {
    RESOLVE: 'dependency:resolve',
    INSTALL: 'dependency:install',
    INSTALL_BATCH: 'dependency:install-batch',
  },
  WORKSPACE: {
    LIST: 'workspace:list',
    CREATE: 'workspace:create',
  },
  TAB: {
    SHOW_CONTEXT_MENU: 'tab:show-context-menu',
  },
  SETTINGS: {
    GET_UI_LANGUAGE: 'settings:get-ui-language',
  },
} as const;
