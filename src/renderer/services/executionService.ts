import { LogEntry, ScriptLog } from '../../shared/types';
import { DEFAULT_RUNTIME } from '../constants';

export interface ExecutionOptions {
  runtime?: string;
  timeout: number;
}

export interface ExecutionCallbacks {
  onStart?: () => void;
  onComplete?: (entries: LogEntry[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Processes the execution result and converts it to LogEntry array
 */
export function processExecutionResult(
  result: {
    success: boolean;
    output?: {
      logs?: ScriptLog[];
      output?: unknown;
      error?: string;
      errorLine?: number;
      resultLine?: number;
    };
    error?: string;
  },
  code?: string
): LogEntry[] {
  const entries: LogEntry[] = [];
  const now = Date.now();
  let hasError = false;

  // Check for script error first
  if (result.output?.error) {
    hasError = true;
    entries.push({
      type: 'error',
      level: 'error',
      message: result.output.error,
      timestamp: now,
      line: result.output.errorLine,
    });
  } else if (!result.success) {
    hasError = true;
    entries.push({
      type: 'error',
      level: 'error',
      message: result.error || 'Unknown error',
      timestamp: now,
    });
  }

  // Process console logs (only if no error)
  if (!hasError && result.output?.logs && result.output.logs.length > 0) {
    result.output.logs.forEach((log: ScriptLog, index: number) => {
      entries.push({
        type: (log.type as LogEntry['type']) || 'log',
        level: log.level || 'info',
        message: log.message,
        timestamp: now + index + 1,
        line: log.line,
      });
    });
  }

  // If there's a meaningful return value and no error, show it
  const outputValue = result.output?.output;
  const resultLine = result.output?.resultLine;
  if (!hasError && outputValue !== undefined && outputValue !== null && resultLine != null) {
    // Generate empty entries for lines 1 to resultLine-1 to show line numbers
    if (code && resultLine > 1) {
      for (let lineNum = 1; lineNum < resultLine; lineNum++) {
        entries.push({
          type: 'log',
          level: 'info',
          message: '',
          timestamp: now + (result.output?.logs?.length || 0) + lineNum,
          line: lineNum,
        });
      }
    }

    entries.push({
      type: 'result',
      level: 'info',
      message: outputValue,
      timestamp: now + (result.output?.logs?.length || 0) + (resultLine || 1) + 1,
      line: resultLine,
    });
  }

  return entries;
}

/**
 * Execute a script and return processed log entries
 */
export async function executeScript(code: string, options: ExecutionOptions): Promise<LogEntry[]> {
  const result = await window.electronAPI.executeScript(code, {
    runtime: options.runtime || DEFAULT_RUNTIME,
    timeout: options.timeout,
  });

  return processExecutionResult(result, code);
}

/**
 * Creates an error log entry from an exception
 */
export function createErrorEntry(error: unknown): LogEntry {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    type: 'error',
    level: 'error',
    message: errorMessage,
    timestamp: Date.now(),
  };
}
