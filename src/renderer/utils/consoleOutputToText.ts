import { LogEntry } from '../../shared/types';

const INDENT = '  ';

function quoteString(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function isErrorMessage(s: string): boolean {
  return /^[A-Za-z]*Error:/.test(s);
}

function isSerializedObject(
  value: unknown
): value is {
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

/**
 * Formats a single message (primitive or serialized object tree) to readable text.
 * Nested structures use indentation so Monaco can fold by indent.
 */
function formatMessage(value: unknown, indentLevel: number): string {
  const prefix = INDENT.repeat(indentLevel);

  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) || !Number.isFinite(value) ? String(value) : value.toString();
  }
  if (typeof value === 'string') {
    return isErrorMessage(value) ? value : quoteString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatMessage(item, indentLevel)).join(' ');
  }

  if (!isSerializedObject(value)) {
    return String(value);
  }

  const t = value.__type;
  if (t === 'undefined') {
    return 'undefined';
  }
  if (t === 'number') {
    return String((value as unknown as { value: string }).value);
  }
  if (t === 'function') {
    return `ƒ ${value.name ?? 'anonymous'}()`;
  }
  if (t === 'symbol') {
    const desc = value.description != null ? String(value.description) : '';
    return `Symbol(${quoteString(desc)})`;
  }
  if (t === 'circular') {
    return `[Circular: ${value.name ?? 'Object'}]`;
  }
  if (t === 'error') {
    return `[Error: ${value.message ?? 'unknown'}]`;
  }
  if (t === 'maxDepth') {
    return '[Max depth]';
  }
  if (t === 'promise') {
    const state = (value as { state?: string }).state ?? 'pending';
    return `Promise { <${state}> }`;
  }
  if (t === 'truncated') {
    return `[Truncated: +${value.count ?? 0} more]`;
  }

  if (t === 'array') {
    const len = value.length ?? 0;
    const items = value.items ?? [];
    if (items.length === 0) {
      return `Array(${len}) []`;
    }
    const lines: string[] = [`Array(${len}) [`];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const formatted = formatMessage(item, indentLevel + 1);
      const nested = formatted.includes('\n');
      if (nested) {
        lines.push(INDENT.repeat(indentLevel + 1) + formatted.split('\n')[0]);
        formatted
          .split('\n')
          .slice(1)
          .forEach((l) => lines.push(INDENT.repeat(indentLevel + 1) + l));
      } else {
        lines.push(INDENT.repeat(indentLevel + 1) + formatted);
      }
    }
    lines.push(prefix + ']');
    return lines.join('\n');
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
      const lines: string[] = [`${name} {`, prefix + INDENT + '__proto__: {'];
      for (const k of protoKeys) {
        const label = methodNames.has(k) ? `ƒ ${k}()` : '...';
        lines.push(prefix + INDENT + INDENT + `${k}: ${label}`);
      }
      lines.push(prefix + INDENT + '}');
      lines.push(prefix + '}');
      return lines.join('\n');
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
      return `${name} {}`;
    }
    const lines: string[] = [`${name} {`];
    for (const key of visibleKeys) {
      const displayKey = key === '[[prototype]]' ? '__proto__' : key;
      const propVal = props[key];
      const formatted = formatMessage(propVal, indentLevel + 1);
      const firstLine = formatted.split('\n')[0];
      const rest = formatted.split('\n').slice(1);
      lines.push(prefix + INDENT + `${displayKey}: ${firstLine.trimStart()}`);
      rest.forEach((l) => lines.push(l));
    }
    lines.push(prefix + '}');
    return lines.join('\n');
  }

  return String(value);
}

/**
 * Converts the console output (LogEntry[]) to a single string for display in Monaco.
 * Monaco shows line numbers; each entry is placed at its source line, with blank
 * lines where there is no output. Multi-line values (e.g. objects) stay under
 * that line; continuation lines are indented.
 */
export function consoleOutputToText(output: LogEntry[]): string {
  if (output.length === 0) {
    return '';
  }
  const byLine = new Map<number, LogEntry[]>();
  let maxLine = 0;
  for (const e of output) {
    const line = e.line ?? 1;
    if (line > maxLine) maxLine = line;
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line)!.push(e);
  }
  const blocks: string[] = [];
  for (let lineNum = 1; lineNum <= maxLine; lineNum++) {
    const entries = byLine.get(lineNum) ?? [];
    if (entries.length === 0) {
      blocks.push('');
      continue;
    }
    const parts = entries.map((e) => formatMessage(e.message, 0));
    blocks.push(parts.join('\n'));
  }
  return blocks.join('\n');
}
