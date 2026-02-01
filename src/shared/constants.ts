export const DEFAULT_TIMEOUT = 5000;
export const DEFAULT_RUNTIME = 'browser';
export const MAX_HEAP_SIZE = 128; // MB
export const COLD_START_TARGET = 500; // ms

export const PERMISSION_MODULES = {
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  NET: 'net',
  ENV: 'env',
  CHILD_PROCESS: 'child_process',
} as const;

export const MAGIC_COMMENT_TYPES = {
  RUNTIME: 'coda-runtime',
  PERMISSION: 'coda-permission',
  TIMEOUT: 'coda-timeout',
  PACKAGE: 'pkg',
} as const;
