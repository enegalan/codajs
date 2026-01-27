/**
 * Constants for the renderer process
 */

// Debounce delays in milliseconds
export const DEBOUNCE_DELAYS = {
  AUTO_EXECUTE: 1000,
  TAB_SAVE: 500,
  PERIODIC_BACKUP: 10000,
} as const;

// Layout defaults
export const LAYOUT_DEFAULTS = {
  MIN_SIZE: 100,
  DEFAULT_SIDEBAR_WIDTH: 250,
  DEFAULT_CONSOLE_HEIGHT: 200,
} as const;

// Editor defaults
export const EDITOR_DEFAULTS = {
  FONT_SIZE: 14,
  THEME: 'vs-dark',
} as const;

// Console defaults
export const CONSOLE_DEFAULTS = {
  FONT_SIZE: 12,
} as const;

// Default runtime
export const DEFAULT_RUNTIME = 'node' as const;
