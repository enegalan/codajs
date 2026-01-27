export type Locale = 'en' | 'es';

export interface AllTranslations {
  menu: {
    file: string;
    newTab: string;
    reopenClosedTab: string;
    open: string;
    save: string;
    saveAs: string;
    close: string;
    edit: string;
    undo: string;
    redo: string;
    cut: string;
    copy: string;
    paste: string;
    selectAll: string;
    deleteAll: string;
    find: string;
    replace: string;
    toggleLineComment: string;
    toggleBlockComment: string;
    action: string;
    execute: string;
    stop: string;
    kill: string;
    setWorkingDirectory: string;
    formatCode: string;
    view: string;
    actualSize: string;
    increaseFontSize: string;
    decreaseFontSize: string;
    fullscreen: string;
    sidebar: string;
    output: string;
    layout: string;
    vertical: string;
    horizontal: string;
    toggleDevTools: string;
    window: string;
    minimize: string;
    zoom: string;
    bringAllToFront: string;
    themes: string;
    help: string;
    sendFeedbackToApple: string;
    documentation: string;
    reportIssue: string;
  };
  settings: {
    title: string;
    tabs: {
      general: string;
      compilation: string;
      appearance: string;
    };
    resetToDefaults: string;
  };
  general: {
    codeLanguage: string;
    uiLanguage: string;
    saveFolder: string;
    saveFolderPlaceholder: string;
    saveFolderDescription: string;
    browse: string;
    autoExecution: string;
    autoExecutionDescription: string;
    autoSave: string;
    autoSaveDescription: string;
    confirmClose: string;
    confirmCloseDescription: string;
    languages: {
      english: string;
      spanish: string;
    };
  };
  compilation: {
    executionTimeout: string;
    executionTimeoutDescription: string;
    defaultRuntime: string;
  };
  appearance: {
    theme: string;
    themes: {
      dark: string;
      light: string;
      dracula: string;
      neon: string;
      monokai: string;
      nord: string;
      oneDark: string;
      solarizedDark: string;
      solarizedLight: string;
      gruvbox: string;
      tokyoNight: string;
      synthwave84: string;
    };
    fontSize: string;
  };
  console: {
    noOutput: string;
  };
  tabBar: {
    newTab: string;
  };
  sidebar: {
    execute: string;
    stop: string;
    settings: string;
  };
  valueInspector: {
    title: string;
    array: string;
    object: string;
  };
  errorBoundary: {
    title: string;
    defaultMessage: string;
    tryAgain: string;
  };
  app: {
    noTabs: string;
    confirmCloseTab: string;
    confirmCloseOthers: string;
    confirmCloseAll: string;
  };
}

export const translations: Record<Locale, AllTranslations> = {
  en: {
    menu: {
      file: 'File',
      newTab: 'New Tab',
      reopenClosedTab: 'Reopen Closed Tab',
      open: 'Open...',
      save: 'Save',
      saveAs: 'Save As...',
      close: 'Close',
      edit: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select All',
      deleteAll: 'Delete All',
      find: 'Find',
      replace: 'Replace',
      toggleLineComment: 'Toggle Line Comment',
      toggleBlockComment: 'Toggle Block Comment',
      action: 'Action',
      execute: 'Execute',
      stop: 'Stop',
      kill: 'Kill',
      setWorkingDirectory: 'Set Working Directory',
      formatCode: 'Format Code',
      view: 'View',
      actualSize: 'Actual Size',
      increaseFontSize: 'Increase Font Size',
      decreaseFontSize: 'Decrease Font Size',
      fullscreen: 'Full Screen',
      sidebar: 'Sidebar',
      output: 'Output',
      layout: 'Layout',
      vertical: 'Vertical',
      horizontal: 'Horizontal',
      toggleDevTools: 'Toggle Developer Tools',
      window: 'Window',
      minimize: 'Minimize',
      zoom: 'Zoom',
      bringAllToFront: 'Bring All to Front',
      themes: 'Themes',
      help: 'Help',
      sendFeedbackToApple: 'Send Feedback about CodaJS to Apple',
      documentation: 'Documentation',
      reportIssue: 'Report Issue',
    },
    settings: {
      title: 'Settings',
      tabs: {
        general: 'General',
        compilation: 'Compilation',
        appearance: 'Appearance',
      },
      resetToDefaults: 'Reset to Defaults',
    },
    general: {
      codeLanguage: 'Code Language',
      uiLanguage: 'Interface Language',
      saveFolder: 'Save Folder',
      saveFolderPlaceholder: 'Default: ~/Documents/CodaJS',
      saveFolderDescription: 'Folder where files are saved automatically (Cmd/Ctrl + S)',
      browse: 'Browse',
      autoExecution: 'Auto Execution',
      autoExecutionDescription: 'Automatically execute code on change',
      autoSave: 'Auto Save',
      autoSaveDescription: 'Automatically save when switching tabs',
      confirmClose: 'Confirm Close',
      confirmCloseDescription: 'Ask before closing a tab with unsaved changes',
      languages: {
        english: 'English',
        spanish: 'Spanish',
      },
    },
    compilation: {
      executionTimeout: 'Execution Timeout (ms)',
      executionTimeoutDescription: 'Maximum execution time before timeout (1000-60000ms)',
      defaultRuntime: 'Default Runtime',
    },
    appearance: {
      theme: 'Theme',
      themes: {
        dark: 'Dark',
        light: 'Light',
        dracula: 'Dracula',
        neon: 'Neon',
        monokai: 'Monokai',
        nord: 'Nord',
        oneDark: 'One Dark',
        solarizedDark: 'Solarized Dark',
        solarizedLight: 'Solarized Light',
        gruvbox: 'Gruvbox',
        tokyoNight: 'Tokyo Night',
        synthwave84: "Synthwave '84",
      },
      fontSize: 'Font Size',
    },
    console: {
      noOutput: 'No output yet. Execute code to see results.',
    },
    tabBar: {
      newTab: 'New Tab',
    },
    sidebar: {
      execute: 'Execute (Cmd/Ctrl + Enter)',
      stop: 'Stop Execution',
      settings: 'Settings',
    },
    valueInspector: {
      title: 'Value Inspector',
      array: 'Array',
      object: 'Object',
    },
    errorBoundary: {
      title: 'Something went wrong',
      defaultMessage: 'An unexpected error occurred',
      tryAgain: 'Try Again',
    },
    app: {
      noTabs: 'No tabs available',
      confirmCloseTab: 'This tab has unsaved changes. Are you sure you want to close it?',
      confirmCloseOthers: 'Some tabs have unsaved changes. Are you sure you want to close them?',
      confirmCloseAll: 'Some tabs have unsaved changes. Are you sure you want to close all?',
    },
  },
  es: {
    menu: {
      file: 'Archivo',
      newTab: 'Nueva pestaña',
      reopenClosedTab: 'Volver abrir pestaña cerrada',
      open: 'Abrir...',
      save: 'Guardar',
      saveAs: 'Guardar como...',
      close: 'Cerrar',
      edit: 'Editar',
      undo: 'Deshacer',
      redo: 'Rehacer',
      cut: 'Cortar',
      copy: 'Copiar',
      paste: 'Pegar',
      selectAll: 'Seleccionar todo',
      deleteAll: 'Borrar todo',
      find: 'Buscar',
      replace: 'Reemplazar',
      toggleLineComment: 'Alternar comentario de línea',
      toggleBlockComment: 'Alternar comentario de bloque',
      action: 'Acción',
      execute: 'Ejecutar',
      stop: 'Detener',
      kill: 'Matar',
      setWorkingDirectory: 'Establecer directorio de trabajo',
      formatCode: 'Formatear código',
      view: 'Ver',
      actualSize: 'Tamaño real',
      increaseFontSize: 'Aumentar tamaño de fuente',
      decreaseFontSize: 'Disminuir tamaño de fuente',
      fullscreen: 'Pantalla completa',
      sidebar: 'Barra lateral',
      output: 'Salida',
      layout: 'Disposición',
      vertical: 'Vertical',
      horizontal: 'Horizontal',
      toggleDevTools: 'Alternar herramientas de desarrollador',
      window: 'Ventana',
      minimize: 'Minimizar',
      zoom: 'Zoom',
      bringAllToFront: 'Traer todas al frente',
      themes: 'Temas',
      help: 'Ayuda',
      sendFeedbackToApple: 'Enviar opinión sobre CodaJS a Apple',
      documentation: 'Documentación',
      reportIssue: 'Reportar problema',
    },
    settings: {
      title: 'Ajustes',
      tabs: {
        general: 'General',
        compilation: 'Compilación',
        appearance: 'Apariencia',
      },
      resetToDefaults: 'Restablecer valores',
    },
    general: {
      codeLanguage: 'Lenguaje de código',
      uiLanguage: 'Idioma de la interfaz',
      saveFolder: 'Carpeta de guardado',
      saveFolderPlaceholder: 'Por defecto: ~/Documents/CodaJS',
      saveFolderDescription: 'Carpeta donde se guardan los archivos automáticamente (Cmd/Ctrl + S)',
      browse: 'Examinar',
      autoExecution: 'Ejecución automática',
      autoExecutionDescription: 'Ejecutar código automáticamente al cambiar',
      autoSave: 'Guardado automático',
      autoSaveDescription: 'Guardar automáticamente al cambiar de pestaña',
      confirmClose: 'Confirmar cierre',
      confirmCloseDescription: 'Preguntar antes de cerrar una pestaña con cambios sin guardar',
      languages: {
        english: 'Inglés',
        spanish: 'Español',
      },
    },
    compilation: {
      executionTimeout: 'Tiempo de espera (ms)',
      executionTimeoutDescription: 'Tiempo máximo de ejecución antes del timeout (1000-60000ms)',
      defaultRuntime: 'Entorno por defecto',
    },
    appearance: {
      theme: 'Tema',
      themes: {
        dark: 'Oscuro',
        light: 'Claro',
        dracula: 'Dracula',
        neon: 'Neon',
        monokai: 'Monokai',
        nord: 'Nord',
        oneDark: 'One Dark',
        solarizedDark: 'Solarized Dark',
        solarizedLight: 'Solarized Light',
        gruvbox: 'Gruvbox',
        tokyoNight: 'Tokyo Night',
        synthwave84: "Synthwave '84",
      },
      fontSize: 'Tamaño de fuente',
    },
    console: {
      noOutput: 'Sin resultados. Ejecuta código para ver los resultados.',
    },
    tabBar: {
      newTab: 'Nueva pestaña',
    },
    sidebar: {
      execute: 'Ejecutar (Cmd/Ctrl + Enter)',
      stop: 'Detener ejecución',
      settings: 'Ajustes',
    },
    valueInspector: {
      title: 'Inspector de valores',
      array: 'Array',
      object: 'Objeto',
    },
    errorBoundary: {
      title: 'Algo salió mal',
      defaultMessage: 'Ha ocurrido un error inesperado',
      tryAgain: 'Reintentar',
    },
    app: {
      noTabs: 'No hay pestanas disponibles',
      confirmCloseTab: 'Esta pestaña tiene cambios sin guardar. ¿Seguro que quieres cerrarla?',
      confirmCloseOthers:
        'Algunas pestañas tienen cambios sin guardar. ¿Seguro que quieres cerrarlas?',
      confirmCloseAll:
        'Algunas pestañas tienen cambios sin guardar. ¿Seguro que quieres cerrar todas?',
    },
  },
};

export const getTranslations = (locale: Locale = 'en'): AllTranslations => {
  return translations[locale] || translations.en;
};
