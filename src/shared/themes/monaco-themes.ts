import * as monaco from 'monaco-editor';

export function getMonacoThemeName(theme: string): string {
  return theme === 'dark' || !theme ? 'codajs-dark' : `codajs-${theme}`;
}

export function initializeMonacoThemes(): void {
  monaco.editor.defineTheme('codajs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#5a5a5a',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd', fontStyle: 'italic' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'bd93f9' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#44475a',
      'editor.lineHighlightBackground': '#44475a',
      'editorCursor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-neon', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '636d83', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff00ff' },
      { token: 'string', foreground: '00ff88' },
      { token: 'number', foreground: 'ff6600' },
      { token: 'type', foreground: '00ffff' },
      { token: 'function', foreground: 'ffff00' },
      { token: 'variable', foreground: 'ffffff' },
    ],
    colors: {
      'editor.background': '#0a0a0f',
      'editor.foreground': '#ffffff',
      'editor.selectionBackground': '#3d1f5c',
      'editor.lineHighlightBackground': '#1a1a2e',
      'editorCursor.foreground': '#00ffff',
      'editorLineNumber.foreground': '#444466',
      'editorLineNumber.activeForeground': '#00ffff',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'ae81ff' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#49483e',
      'editor.lineHighlightBackground': '#3e3d32',
      'editorCursor.foreground': '#f8f8f0',
      'editorLineNumber.foreground': '#90908a',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb', fontStyle: 'italic' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'eceff4' },
      { token: 'constant', foreground: 'b48ead' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#eceff4',
      'editor.selectionBackground': '#434c5e',
      'editor.lineHighlightBackground': '#3b4252',
      'editorCursor.foreground': '#eceff4',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#eceff4',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-one-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b', fontStyle: 'italic' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'abb2bf' },
      { token: 'constant', foreground: 'e06c75' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.selectionBackground': '#3e4451',
      'editor.lineHighlightBackground': '#2c313c',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#5c6370',
      'editorLineNumber.activeForeground': '#abb2bf',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-solarized-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'type', foreground: '268bd2', fontStyle: 'italic' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '839496' },
      { token: 'constant', foreground: 'cb4b16' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.selectionBackground': '#073642',
      'editor.lineHighlightBackground': '#073642',
      'editorCursor.foreground': '#93a1a1',
      'editorLineNumber.foreground': '#586e75',
      'editorLineNumber.activeForeground': '#93a1a1',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-solarized-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'type', foreground: '268bd2', fontStyle: 'italic' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '657b83' },
      { token: 'constant', foreground: 'cb4b16' },
    ],
    colors: {
      'editor.background': '#fdf6e3',
      'editor.foreground': '#657b83',
      'editor.selectionBackground': '#eee8d5',
      'editor.lineHighlightBackground': '#eee8d5',
      'editorCursor.foreground': '#586e75',
      'editorLineNumber.foreground': '#93a1a1',
      'editorLineNumber.activeForeground': '#586e75',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-gruvbox', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fe8019' },
      { token: 'string', foreground: 'b8bb26' },
      { token: 'number', foreground: 'd3869b' },
      { token: 'type', foreground: '83a598', fontStyle: 'italic' },
      { token: 'function', foreground: '8ec07c' },
      { token: 'variable', foreground: 'ebdbb2' },
      { token: 'constant', foreground: 'fb4934' },
    ],
    colors: {
      'editor.background': '#282828',
      'editor.foreground': '#ebdbb2',
      'editor.selectionBackground': '#504945',
      'editor.lineHighlightBackground': '#3c3836',
      'editorCursor.foreground': '#ebdbb2',
      'editorLineNumber.foreground': '#928374',
      'editorLineNumber.activeForeground': '#ebdbb2',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-tokyo-night', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'bb9af7' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'type', foreground: '7dcfff', fontStyle: 'italic' },
      { token: 'function', foreground: '7aa2f7' },
      { token: 'variable', foreground: 'c0caf5' },
      { token: 'constant', foreground: 'f7768e' },
    ],
    colors: {
      'editor.background': '#1a1b26',
      'editor.foreground': '#c0caf5',
      'editor.selectionBackground': '#2f3549',
      'editor.lineHighlightBackground': '#24283b',
      'editorCursor.foreground': '#c0caf5',
      'editorLineNumber.foreground': '#565f89',
      'editorLineNumber.activeForeground': '#c0caf5',
      'editor.lineHighlightBorder': '#00000000',
    },
  });

  monaco.editor.defineTheme('codajs-synthwave-84', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6d77b3', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92aad' },
      { token: 'string', foreground: 'fdfdfd' },
      { token: 'number', foreground: 'f97e72' },
      { token: 'type', foreground: 'fff5f6', fontStyle: 'italic' },
      { token: 'function', foreground: '72f1b8' },
      { token: 'variable', foreground: 'f4eee4' },
      { token: 'constant', foreground: 'f97e72' },
      { token: 'operator', foreground: 'f92aad' },
      { token: 'storage', foreground: 'f92aad' },
      { token: 'entity.name', foreground: 'fff5f6' },
      { token: 'support.function', foreground: '72f1b8' },
      { token: 'support.variable', foreground: 'f4eee4' },
      { token: 'support.type', foreground: 'fff5f6' },
    ],
    colors: {
      'editor.background': '#1a1032',
      'editor.foreground': '#fdfdfd',
      'editor.selectionBackground': '#2d1b4e',
      'editor.lineHighlightBackground': '#241b3d',
      'editorCursor.foreground': '#f97e72',
      'editorLineNumber.foreground': '#ff7edb',
      'editorLineNumber.activeForeground': '#36f9f6',
      'editor.lineHighlightBorder': '#00000000',
    },
  });
}
