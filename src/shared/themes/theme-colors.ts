export type ThemeName =
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

export const THEME_NAMES: ThemeName[] = [
  'dark',
  'light',
  'dracula',
  'neon',
  'monokai',
  'nord',
  'one-dark',
  'solarized-dark',
  'solarized-light',
  'gruvbox',
  'tokyo-night',
  'synthwave-84',
];

export function getThemeColors(theme: string): string[] {
  const themeColors: Record<string, string[]> = {
    dark: ['#1e1e1e', '#007acc', '#3e3e3e', '#252526', '#d4d4d4'],
    light: ['#ffffff', '#007acc', '#e0e0e0', '#f3f3f3', '#333333'],
    dracula: ['#282a36', '#bd93f9', '#ff79c6', '#50fa7b', '#ffb86c'],
    neon: ['#0d0d0d', '#00ff00', '#36bf03', '#00ff00', '#0a0a0a'],
    monokai: ['#272822', '#1e1f1c', '#49483e', '#3e3d32', '#75715e'],
    nord: ['#2e3440', '#3b4252', '#434c5e', '#5e81ac', '#88c0d0'],
    'one-dark': ['#282c34', '#21252b', '#3e4451', '#5c6370', '#abb2bf'],
    'solarized-dark': ['#002b36', '#073642', '#586e75', '#657b83', '#839496'],
    'solarized-light': ['#fdf6e3', '#eee8d5', '#93a1a1', '#839496', '#657b83'],
    gruvbox: ['#282828', '#3c3836', '#504945', '#928374', '#ebdbb2'],
    'tokyo-night': ['#1a1b26', '#24283b', '#2f3549', '#565f89', '#c0caf5'],
    'synthwave-84': ['#1a1032', '#36f9f6', '#f92aad', '#f4d03f', '#ffb8d1'],
  };
  return themeColors[theme] || themeColors.dark;
}

export function formatThemeName(theme: string): string {
  return theme
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('84', "'84");
}
