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

  if (hasError) {
    return entries;
  }

  // Determine the last line number that has output
  let lastLineWithOutput = 0;

  // Check logs for the highest line number
  if (result.output?.logs && result.output.logs.length > 0) {
    result.output.logs.forEach((log: ScriptLog) => {
      if (log.line != null && log.line > lastLineWithOutput) {
        lastLineWithOutput = log.line;
      }
    });
  }

  // Check result line
  const resultLine = result.output?.resultLine;
  const outputValue = result.output?.output;
  if (resultLine != null && outputValue !== undefined && outputValue !== null) {
    if (resultLine > lastLineWithOutput) {
      lastLineWithOutput = resultLine;
    }
  }

  // If we have code and a last line with output, generate entries for all lines
  if (code && lastLineWithOutput > 0) {
    // Create a map to store entries by line number
    const entriesByLine = new Map<number, LogEntry[]>();

    // Process console logs
    if (result.output?.logs && result.output.logs.length > 0) {
      result.output.logs.forEach((log: ScriptLog, index: number) => {
        const lineNum = log.line ?? lastLineWithOutput;
        if (!entriesByLine.has(lineNum)) {
          entriesByLine.set(lineNum, []);
        }
        entriesByLine.get(lineNum)!.push({
          type: (log.type as LogEntry['type']) || 'log',
          level: log.level || 'info',
          message: log.message,
          timestamp: now + index + 1,
          line: lineNum,
        });
      });
    }

    // Process result value
    if (resultLine != null && outputValue !== undefined && outputValue !== null) {
      if (!entriesByLine.has(resultLine)) {
        entriesByLine.set(resultLine, []);
      }
      entriesByLine.get(resultLine)!.push({
        type: 'result',
        level: 'info',
        message: outputValue,
        timestamp: now + (result.output?.logs?.length || 0) + 1000,
        line: resultLine,
      });
    }

    // Generate entries for all lines from 1 to lastLineWithOutput
    for (let lineNum = 1; lineNum <= lastLineWithOutput; lineNum++) {
      const lineEntries = entriesByLine.get(lineNum);
      if (lineEntries && lineEntries.length > 0) {
        // Add all entries for this line (they will be grouped by Console component)
        entries.push(...lineEntries);
      } else {
        // Add empty entry to show line number
        entries.push({
          type: 'log',
          level: 'info',
          message: '',
          timestamp: now + lineNum,
          line: lineNum,
        });
      }
    }
  } else {
    // Fallback: if no code or no last line, just add logs and result as before
    if (result.output?.logs && result.output.logs.length > 0) {
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

    if (resultLine != null && outputValue !== undefined && outputValue !== null) {
      entries.push({
        type: 'result',
        level: 'info',
        message: outputValue,
        timestamp: now + (result.output?.logs?.length || 0) + 1000,
        line: resultLine,
      });
    }
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
