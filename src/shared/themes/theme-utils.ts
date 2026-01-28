import { ThemeName, THEME_NAMES } from './theme-colors';

export function isValidTheme(theme: string): theme is ThemeName {
  return THEME_NAMES.includes(theme as ThemeName);
}
