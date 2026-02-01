import { LogEntry } from '../../shared/types';

const INDENT = '  ';

function quoteString(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function isErrorMessage(s: string): boolean {
  return /^[A-Za-z]*Error:/.test(s);
}

export type TokenType =
  | 'string'
  | 'number'
  | 'null'
  | 'boolean'
  | 'undefined'
  | 'keyword'
  | 'function'
  | 'symbol'
  | 'object-label'
  | 'plain'
  | 'error';

export interface ConsoleDecoration {
  line: number;
  startCol: number;
  endCol: number;
  type: TokenType;
}

interface Segment {
  text: string;
  type: TokenType;
}

function isSerializedObject(value: unknown): value is {
  __type: string;
  name?: string;
  props?: Record<string, unknown>;
  items?: unknown[];
  length?: number;
  message?: string;
  description?: string;
  count?: number;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    typeof (value as { __type: string }).__type === 'string'
  );
}

function seg(text: string, type: TokenType): Segment {
  return { text, type };
}

/**
 * Formats a single message to segments with token types. Produces the same
 * text as formatMessage in consoleOutputToText.ts so document layout is identical.
 */
function formatMessageToSegments(value: unknown, indentLevel: number): Segment[] {
  const prefix = INDENT.repeat(indentLevel);

  if (value === null) {
    return [seg('null', 'null')];
  }
  if (value === undefined) {
    return [seg('undefined', 'undefined')];
  }
  if (typeof value === 'boolean') {
    return [seg(String(value), 'boolean')];
  }
  if (typeof value === 'number') {
    const s = Number.isInteger(value) || !Number.isFinite(value) ? String(value) : value.toString();
    return [seg(s, 'number')];
  }
  if (typeof value === 'string') {
    const text = isErrorMessage(value) ? value : quoteString(value);
    return [seg(text, isErrorMessage(value) ? 'error' : 'string')];
  }
  if (Array.isArray(value)) {
    const parts: Segment[] = [];
    for (let i = 0; i < value.length; i++) {
      if (i > 0) parts.push(seg(' ', 'plain'));
      parts.push(...formatMessageToSegments(value[i], indentLevel));
    }
    return parts;
  }

  if (!isSerializedObject(value)) {
    return [seg(String(value), 'plain')];
  }

  const t = value.__type;
  if (t === 'undefined') {
    return [seg('undefined', 'undefined')];
  }
  if (t === 'number') {
    return [seg(String((value as unknown as { value: string }).value), 'number')];
  }
  if (t === 'function') {
    const name = value.name ?? 'anonymous';
    return [seg('ƒ ', 'function'), seg(`${name}()`, 'function')];
  }
  if (t === 'symbol') {
    const desc = value.description != null ? String(value.description) : '';
    return [seg('Symbol(', 'keyword'), seg(quoteString(desc), 'string'), seg(')', 'plain')];
  }
  if (t === 'circular') {
    const name = value.name ?? 'Object';
    return [seg('[Circular: ', 'keyword'), seg(name, 'object-label'), seg(']', 'plain')];
  }
  if (t === 'error') {
    const msg = value.message ?? 'unknown';
    return [seg('[Error: ', 'keyword'), seg(msg, 'plain'), seg(']', 'plain')];
  }
  if (t === 'maxDepth') {
    return [seg('[Max depth]', 'keyword')];
  }
  if (t === 'promise') {
    const state = (value as { state?: string }).state ?? 'pending';
    return [
      seg('Promise', 'object-label'),
      seg(' { ', 'plain'),
      seg('<' + state + '>', 'keyword'),
      seg(' }', 'plain'),
    ];
  }
  if (t === 'truncated') {
    const count = value.count ?? 0;
    return [seg('[Truncated: +', 'keyword'), seg(String(count), 'number'), seg(' more]', 'plain')];
  }

  if (t === 'array') {
    const len = value.length ?? 0;
    const items = value.items ?? [];
    const out: Segment[] = [
      seg('Array(', 'keyword'),
      seg(String(len), 'number'),
      seg(') [', 'keyword'),
    ];
    if (items.length === 0) {
      out.push(seg(']', 'keyword'));
      return out;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const nested = formatMessageToSegments(item, indentLevel + 1);
      const nestedText = nested.map((s) => s.text).join('');
      const lines = nestedText.split('\n');
      const firstLine = lines[0];
      const rest = lines.slice(1);
      const indent = INDENT.repeat(indentLevel + 1);
      const firstLineTrim = firstLine.trimStart();
      const startInFirst = firstLine.indexOf(firstLineTrim);
      out.push(seg('\n' + indent + firstLine.substring(0, startInFirst), 'plain'));
      out.push(...segmentsForSubstring(nested, startInFirst, startInFirst + firstLineTrim.length));
      for (const l of rest) {
        out.push(seg('\n' + l, 'plain'));
      }
    }
    out.push(seg('\n' + prefix + ']', 'plain'));
    return out;
  }

  if (t === 'object') {
    const name = value.name ?? 'Object';
    const props = value.props ?? {};
    const keys = Object.keys(props);
    const webAudioNames =
      /^(AudioDestinationNode|AudioContext|AudioNode|AudioParam|GainNode|OscillatorNode|AnalyserNode|BiquadFilterNode|AudioBufferSourceNode|MediaElementAudioSourceNode|MediaStreamAudioSourceNode|ScriptProcessorNode|ChannelMergerNode|ChannelSplitterNode|ConvolverNode|DynamicsCompressorNode|DelayNode|WaveShaperNode|StereoPannerNode|PannerNode|AudioListener|AudioWorklet|OfflineAudioContext|AudioRenderCapacity)$/;
    if (keys.length === 0 && webAudioNames.test(name)) {
      const protoKeys =
        name === 'AudioDestinationNode'
          ? [
              'maxChannelCount',
              'context',
              'numberOfInputs',
              'numberOfOutputs',
              'channelCount',
              'channelCountMode',
              'channelInterpretation',
              'connect',
              'disconnect',
              'addEventListener',
              'dispatchEvent',
              'removeEventListener',
              'constructor',
            ]
          : name === 'AudioContext'
            ? [
                'baseLatency',
                'outputLatency',
                'close',
                'createMediaElementSource',
                'createMediaStreamDestination',
                'createMediaStreamSource',
                'getOutputTimestamp',
                'resume',
                'suspend',
                'sinkId',
                'onsinkchange',
                'setSinkId',
                'destination',
                'currentTime',
                'sampleRate',
                'listener',
                'state',
                'onstatechange',
                'createAnalyser',
                'createBiquadFilter',
                'createBuffer',
                'createBufferSource',
                'createChannelMerger',
                'createChannelSplitter',
                'createConstantSource',
                'createConvolver',
                'createDelay',
                'createDynamicsCompressor',
                'createGain',
                'createIIRFilter',
                'createOscillator',
                'createPanner',
                'createPeriodicWave',
                'createScriptProcessor',
                'createStereoPanner',
                'createWaveShaper',
                'decodeAudioData',
                'audioWorklet',
                'addEventListener',
                'dispatchEvent',
                'removeEventListener',
                'constructor',
              ]
            : [
                'context',
                'numberOfInputs',
                'numberOfOutputs',
                'channelCount',
                'connect',
                'disconnect',
                'addEventListener',
                'dispatchEvent',
                'removeEventListener',
                'constructor',
              ];
      const methodNames = new Set([
        'connect',
        'disconnect',
        'addEventListener',
        'dispatchEvent',
        'removeEventListener',
        'constructor',
        'close',
        'resume',
        'suspend',
        'setSinkId',
        'getOutputTimestamp',
        'createMediaElementSource',
        'createMediaStreamDestination',
        'createMediaStreamSource',
        'createAnalyser',
        'createBiquadFilter',
        'createBuffer',
        'createBufferSource',
        'createChannelMerger',
        'createChannelSplitter',
        'createConstantSource',
        'createConvolver',
        'createDelay',
        'createDynamicsCompressor',
        'createGain',
        'createIIRFilter',
        'createOscillator',
        'createPanner',
        'createPeriodicWave',
        'createScriptProcessor',
        'createStereoPanner',
        'createWaveShaper',
        'decodeAudioData',
      ]);
      const lines: Segment[] = [
        seg(name, 'object-label'),
        seg(' {', 'plain'),
        seg('\n' + prefix + INDENT + '__proto__: {', 'plain'),
      ];
      for (const k of protoKeys) {
        const label = methodNames.has(k) ? `ƒ ${k}()` : '...';
        lines.push(
          seg('\n' + prefix + INDENT + INDENT + `${k}: `, 'plain'),
          seg(label, 'function')
        );
      }
      lines.push(seg('\n' + prefix + INDENT + '}', 'plain'));
      lines.push(seg('\n' + prefix + '}', 'plain'));
      return lines;
    }
    const isUndefinedValue = (v: unknown): boolean =>
      v === undefined ||
      (typeof v === 'object' && v !== null && (v as { __type?: string }).__type === 'undefined');
    const visibleKeys = keys
      .filter((k) => !isUndefinedValue(props[k]))
      .sort((a, b) => {
        const aProto = a === '[[prototype]]' || a === '__proto__';
        const bProto = b === '[[prototype]]' || b === '__proto__';
        if (aProto && !bProto) return 1;
        if (!aProto && bProto) return -1;
        return 0;
      });
    if (visibleKeys.length === 0) {
      return [seg(name, 'object-label'), seg(' {}', 'plain')];
    }
    const out: Segment[] = [seg(name, 'object-label'), seg(' {', 'plain')];
    for (const key of visibleKeys) {
      const displayKey = key === '[[prototype]]' ? '__proto__' : key;
      const propVal = props[key];
      const nested = formatMessageToSegments(propVal, indentLevel + 1);
      out.push(seg('\n' + prefix + INDENT + `${displayKey}: `, 'plain'), ...nested);
    }
    out.push(seg('\n' + prefix + '}', 'plain'));
    return out;
  }

  return [seg(String(value), 'plain')];
}

/**
 * Returns segments that cover formatted.substring(start, end), preserving types.
 */
function segmentsForSubstring(nested: Segment[], start: number, end: number): Segment[] {
  const result: Segment[] = [];
  let offset = 0;
  for (const s of nested) {
    const segEnd = offset + s.text.length;
    if (segEnd <= start) {
      offset = segEnd;
      continue;
    }
    if (offset >= end) break;
    const sliceStart = Math.max(0, start - offset);
    const sliceEnd = Math.min(s.text.length, end - offset);
    result.push(seg(s.text.slice(sliceStart, sliceEnd), s.type));
    offset = segEnd;
  }
  return result;
}

/**
 * Append segment to decorations list and advance (line, col). Monaco uses 1-based line/col.
 */
function appendSegmentDecorations(
  segment: Segment,
  line: number,
  col: number,
  decorations: ConsoleDecoration[]
): { line: number; col: number } {
  const parts = segment.text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length > 0) {
      decorations.push({
        line,
        startCol: col,
        endCol: col + part.length,
        type: segment.type,
      });
    }
    col += part.length;
    if (i < parts.length - 1) {
      line += 1;
      col = 1;
    }
  }
  return { line, col };
}

/**
 * Returns the same text as consoleOutputToText(output) plus decorations for Monaco.
 */
export function consoleOutputToTextAndDecorations(output: LogEntry[]): {
  text: string;
  decorations: ConsoleDecoration[];
} {
  if (output.length === 0) {
    return { text: '', decorations: [] };
  }
  const byLine = new Map<number, LogEntry[]>();
  let maxLine = 0;
  for (const e of output) {
    const line = e.line ?? 1;
    if (line > maxLine) maxLine = line;
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line)!.push(e);
  }

  const decorations: ConsoleDecoration[] = [];
  const blocks: string[] = [];
  let currentLine = 1;
  let currentCol = 1;

  for (let lineNum = 1; lineNum <= maxLine; lineNum++) {
    const entries = byLine.get(lineNum) ?? [];
    if (entries.length === 0) {
      blocks.push('');
      currentLine += 1;
      currentCol = 1;
      continue;
    }

    const blockParts: string[] = [];
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
      const entry = entries[entryIndex];
      const segments = formatMessageToSegments(entry.message, 0);
      const partText = segments.map((s) => s.text).join('');
      blockParts.push(partText);

      for (const seg of segments) {
        const next = appendSegmentDecorations(seg, currentLine, currentCol, decorations);
        currentLine = next.line;
        currentCol = next.col;
      }
      if (entryIndex < entries.length - 1) {
        currentLine += 1;
        currentCol = 1;
      }
    }
    blocks.push(blockParts.join('\n'));
    currentLine += 1;
    currentCol = 1;
  }

  const text = blocks.join('\n');
  return { text, decorations };
}
