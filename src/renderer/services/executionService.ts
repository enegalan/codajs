import { LogEntry, ScriptLog } from '../../shared/types';
import { DEFAULT_RUNTIME } from '../constants';
import { serializeForConsole } from '../utils/serializeForConsole';

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
  const normalizeResultMessage = (value: unknown): unknown =>
    typeof value === 'string' && value.startsWith('\n') ? value.slice(1) : value;
  if (resultLine != null && outputValue !== undefined && outputValue !== null) {
    if (resultLine > lastLineWithOutput) {
      lastLineWithOutput = resultLine;
    }
  }

  // If we have code and a last line with output, generate entries for all lines
  if (code && lastLineWithOutput > 0) {
    // Create a map to store entries by line number
    const entriesByLine = new Map<number, LogEntry[]>();

    const isUndefinedResult = (msg: unknown): boolean =>
      msg === undefined ||
      (typeof msg === 'object' &&
        msg !== null &&
        (msg as { __type?: string }).__type === 'undefined');

    if (result.output?.logs && result.output.logs.length > 0) {
      result.output.logs.forEach((log: ScriptLog, index: number) => {
        if ((log.type === 'result' || log.type === 'log') && isUndefinedResult(log.message)) {
          return;
        }
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

    // Process result value (only if no log entry for that line already, and not undefined)
    if (
      resultLine != null &&
      outputValue !== undefined &&
      outputValue !== null &&
      !isUndefinedResult(outputValue) &&
      !entriesByLine.has(resultLine)
    ) {
      entriesByLine.set(resultLine, []);
      entriesByLine.get(resultLine)!.push({
        type: 'result',
        level: 'info',
        message: normalizeResultMessage(outputValue),
        timestamp: now + (result.output?.logs?.length || 0) + 1000,
        line: resultLine,
      });
    }

    for (let lineNum = 1; lineNum <= lastLineWithOutput; lineNum++) {
      const lineEntries = entriesByLine.get(lineNum);
      if (lineEntries && lineEntries.length > 0) {
        entries.push(...lineEntries);
      }
    }
  } else {
    const isUndefinedResult = (msg: unknown): boolean =>
      msg === undefined ||
      (typeof msg === 'object' &&
        msg !== null &&
        (msg as { __type?: string }).__type === 'undefined');

    if (result.output?.logs && result.output.logs.length > 0) {
      result.output.logs.forEach((log: ScriptLog, index: number) => {
        if ((log.type === 'result' || log.type === 'log') && isUndefinedResult(log.message)) {
          return;
        }
        entries.push({
          type: (log.type as LogEntry['type']) || 'log',
          level: log.level || 'info',
          message: log.message,
          timestamp: now + index + 1,
          line: log.line,
        });
      });
    }

    if (
      resultLine != null &&
      outputValue !== undefined &&
      outputValue !== null &&
      !isUndefinedResult(outputValue)
    ) {
      entries.push({
        type: 'result',
        level: 'info',
        message: normalizeResultMessage(outputValue),
        timestamp: now + (result.output?.logs?.length || 0) + 1000,
        line: resultLine,
      });
    }
  }

  return entries;
}

const CODA_AUDIO_CONTEXTS = '__codaAudioContexts';
const CODA_ORIGINAL_AUDIO_CONTEXT = '__codaOriginalAudioContext';
const CODA_ORIGINAL_OFFLINE_AUDIO_CONTEXT = '__codaOriginalOfflineAudioContext';
const CODA_AUDIO_STATE_LISTENER = '__codaAudioStateListener';

type AudioStateListener = (playing: boolean) => void;

interface WindowWithAudio extends Window {
  AudioContext: typeof AudioContext;
  OfflineAudioContext?: typeof OfflineAudioContext;
}

function getAudioContextSet(win: Window): Set<BaseAudioContext> | undefined {
  return (win as unknown as Record<string, unknown>)[CODA_AUDIO_CONTEXTS] as
    | Set<BaseAudioContext>
    | undefined;
}

function notifyAudioState(win: Window): void {
  const set = getAudioContextSet(win);
  const listener = (win as unknown as Record<string, unknown>)[CODA_AUDIO_STATE_LISTENER] as
    | AudioStateListener
    | undefined;
  if (!listener) {
    return;
  }
  const playing =
    set !== undefined && Array.from(set).some((ctx) => (ctx as AudioContext).state === 'running');
  listener(playing);
}

function patchAudioContexts(win: Window): void {
  const w = win as unknown as Record<string, unknown>;
  if (!w[CODA_AUDIO_CONTEXTS]) {
    w[CODA_AUDIO_CONTEXTS] = new Set<BaseAudioContext>();
  }
  const winAudio = win as WindowWithAudio;
  const orig = winAudio.AudioContext;
  const origOffline = winAudio.OfflineAudioContext;
  if (!w[CODA_ORIGINAL_AUDIO_CONTEXT]) {
    w[CODA_ORIGINAL_AUDIO_CONTEXT] = orig;
    w[CODA_ORIGINAL_OFFLINE_AUDIO_CONTEXT] = origOffline;
    winAudio.AudioContext = function (this: AudioContext, ...args: unknown[]) {
      const ctx = new (orig as new (...a: unknown[]) => AudioContext)(...args);
      const set = w[CODA_AUDIO_CONTEXTS] as Set<BaseAudioContext>;
      set.add(ctx);
      ctx.addEventListener('statechange', () => notifyAudioState(win));
      return ctx;
    } as unknown as typeof AudioContext;
    winAudio.AudioContext.prototype = orig.prototype;
    if (origOffline) {
      winAudio.OfflineAudioContext = function (this: OfflineAudioContext, ...args: unknown[]) {
        const ctx = new (origOffline as new (...a: unknown[]) => OfflineAudioContext)(...args);
        const set = w[CODA_AUDIO_CONTEXTS] as Set<BaseAudioContext>;
        set.add(ctx);
        ctx.addEventListener('statechange', () => notifyAudioState(win));
        return ctx;
      } as unknown as typeof OfflineAudioContext;
      winAudio.OfflineAudioContext.prototype = origOffline.prototype;
    }
  }
}

/**
 * Returns true if any AudioContext tracked during browser execution is in 'running' state.
 */
export function hasActiveAudio(): boolean {
  const set = getAudioContextSet(window);
  if (!set) {
    return false;
  }
  return Array.from(set).some((ctx) => (ctx as AudioContext).state === 'running');
}

/**
 * Subscribe to audio playing state changes (e.g. when any tracked AudioContext starts/stops).
 * Only one listener is stored; calling again overwrites the previous.
 */
export function setAudioStateListener(listener: AudioStateListener | null): void {
  (window as unknown as Record<string, unknown>)[CODA_AUDIO_STATE_LISTENER] = listener;
}

const BROWSER_PROMISE_TIMEOUT_MS = 30000;

/**
 * Execute a script in the browser context (main thread) so Web Audio API (AudioContext, etc.) is available.
 * Runs on the main thread because AudioContext is not defined in Web Workers.
 * Stop closes all AudioContexts created during the run to silence audio.
 */
async function executeInBrowser(
  code: string,
  timeoutMs?: number
): Promise<{
  success: boolean;
  output?: { logs: ScriptLog[]; output?: unknown; resultLine?: number };
  error?: string;
  errorLine?: number;
}> {
  const prepared = await window.electronAPI.prepareScriptForBrowser(code);
  if (!prepared.success || !prepared.wrappedScript) {
    return {
      success: false,
      error: prepared.error || 'Failed to prepare script for browser',
    };
  }

  cancelBrowserExecution();
  patchAudioContexts(window);

  const captured: Array<{ type: string; level: string; message: unknown; line: number }> = [];
  const captureResult = (value: unknown, line: number): unknown => {
    captured.push({ type: 'result', level: 'info', message: value, line });
    return value;
  };

  (window as unknown as { __captureResult?: (v: unknown, l: number) => unknown }).__captureResult =
    captureResult;

  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };
  const pushLog =
    (level: 'info' | 'warn' | 'error') =>
    (...args: unknown[]) => {
      captured.push({
        type: 'log',
        level,
        message: args.length === 1 ? args[0] : args,
        line: 0,
      });
      (originalConsole[level === 'info' ? 'log' : level] as (...a: unknown[]) => void).apply(
        console,
        args
      );
    };
  console.log = pushLog('info');
  console.error = pushLog('error');
  console.warn = pushLog('warn');
  console.info = pushLog('info');

  try {
    let lastResult = eval(prepared.wrappedScript) as unknown;
    const thenable =
      lastResult != null && typeof (lastResult as { then?: unknown }).then === 'function';
    if (thenable) {
      const resultLine = prepared.resultLine ?? 1;
      captured.push({
        type: 'result',
        level: 'info',
        message: { __type: 'promise', state: 'pending' },
        line: resultLine,
      });
      const t = Math.max(timeoutMs ?? BROWSER_PROMISE_TIMEOUT_MS, 20000);
      lastResult = await Promise.race([
        Promise.resolve(lastResult),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Promise did not settle within ${t / 1000}s`)), t)
        ),
      ]);
    }
    setTimeout(() => notifyAudioState(window), 0);
    const resultLine = prepared.resultLine ?? 1;
    const serializedLogs: ScriptLog[] = captured.map((entry) => ({
      type: entry.type,
      level: (entry.level as 'info' | 'warn' | 'error') || 'info',
      message: serializeForConsole(entry.message),
      line: entry.line,
    }));
    const serializedOutput = serializeForConsole(lastResult);
    return {
      success: true,
      output: {
        logs: serializedLogs,
        output: serializedOutput,
        resultLine,
      },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error && err.name && err.message
        ? `${err.name}: ${err.message}`
        : err instanceof Error
          ? err.message || String(err)
          : String(err);
    const WRAPPER_LINE_OFFSET = 1;
    const stackLine =
      err instanceof Error && err.stack
        ? parseInt(/:(\d+):\d+/.exec(err.stack)?.[1] ?? '1', 10)
        : undefined;
    const errorLine = stackLine != null ? Math.max(1, stackLine - WRAPPER_LINE_OFFSET) : undefined;
    return {
      success: false,
      error: errorMessage,
      errorLine,
    };
  } finally {
    delete (window as unknown as { __captureResult?: unknown }).__captureResult;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
}

/**
 * Closes all AudioContexts created during browser execution so Stop silences any playing audio.
 */
export function cancelBrowserExecution(): void {
  const set = getAudioContextSet(window);
  if (set) {
    for (const ctx of set) {
      try {
        if (ctx.state !== 'closed') {
          (ctx as unknown as { close: () => Promise<void> }).close();
        }
      } catch {
        // ignore
      }
    }
    set.clear();
  }
  const listener = (window as unknown as Record<string, unknown>)[CODA_AUDIO_STATE_LISTENER] as
    | AudioStateListener
    | undefined;
  if (listener) {
    listener(false);
  }
}

const HAS_IMPORT_OR_REQUIRE = /\b(import\s|from\s+['"]|require\s*\()/;
const HAS_NETWORK_FETCH = /\bfetch\s*\(/;

/**
 * Execute a script and return processed log entries
 */
export async function executeScript(code: string, options: ExecutionOptions): Promise<LogEntry[]> {
  const runtime = options.runtime || DEFAULT_RUNTIME;

  if (runtime === 'browser') {
    if (HAS_IMPORT_OR_REQUIRE.test(code) || HAS_NETWORK_FETCH.test(code)) {
      const result = await window.electronAPI.executeScript(code, {
        runtime: 'node',
        timeout: options.timeout,
      });
      return processExecutionResult(result, code);
    }
    const result = await executeInBrowser(code, options.timeout);
    const normalized = result.success
      ? result
      : {
          success: false,
          error: result.error,
          output: result.error ? { error: result.error, errorLine: result.errorLine } : undefined,
        };
    return processExecutionResult(normalized, code);
  }

  const result = await window.electronAPI.executeScript(code, {
    runtime,
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
