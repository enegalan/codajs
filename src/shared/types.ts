export interface Workspace {
  id: string;
  name: string;
  files: VirtualFile[];
  createdAt: number;
  updatedAt: number;
}

export interface VirtualFile {
  uri: string;
  content: string;
  language: string;
  modified: boolean;
}

/**
 * Log entry from script execution (raw from runtime)
 */
export interface ScriptLog {
  type?: string;
  level?: 'info' | 'warn' | 'error';
  message: unknown;
  line?: number;
}

/**
 * Output from script execution
 */
export interface ScriptOutput {
  logs?: ScriptLog[];
  output?: unknown;
  error?: string;
  errorLine?: number;
}

/**
 * Result from script execution via IPC
 */
export interface ExecutionResult {
  success: boolean;
  output?: ScriptOutput;
  error?: string;
  executionTime?: number;
}

/**
 * Processed log entry for display in console
 */
export interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info' | 'result';
  level: 'info' | 'warn' | 'error';
  message: unknown;
  timestamp: number;
  line?: number;
  executionIndex?: number;
}

export interface RuntimeInfo {
  name: string;
  version: string;
  available: boolean;
}

export interface Dependency {
  name: string;
  version: string;
  resolved: boolean;
  path?: string;
}

export interface Permission {
  module: string;
  action: string;
  level: 'always-allow' | 'allow-once' | 'deny';
  workspaceId?: string;
}

export interface Tab {
  id: string;
  title: string;
  code: string;
  output: LogEntry[];
  runtime: string;
  inspectedValue: any;
  createdAt: number;
  modifiedAt: number;
  savedAt?: number;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string;
}
