/**
 * Serializes JS values to the console format expected by consoleOutputToText.
 * Used when running in the browser (renderer) for real Web Audio API.
 */

const PROTO_KEY = '[[prototype]]';
const MAX_DEPTH = 10;

type Serialized =
  | null
  | string
  | number
  | boolean
  | {
      __type: string;
      name?: string;
      props?: Record<string, Serialized>;
      items?: Serialized[];
      length?: number;
      value?: string;
      message?: string;
      description?: string;
      count?: number;
    };

const INSTANCE_KEYS_BY_TYPE: Record<string, string[]> = {
  AudioDestinationNode: [
    'channelCount',
    'channelCountMode',
    'channelInterpretation',
    'context',
    'maxChannelCount',
    'numberOfInputs',
    'numberOfOutputs',
  ],
  AudioContext: [
    'baseLatency',
    'outputLatency',
    'currentTime',
    'sampleRate',
    'listener',
    'state',
    'destination',
    'audioWorklet',
    'onerror',
    'onsinkchange',
    'onstatechange',
    'sinkId',
  ],
  AudioNode: [
    'channelCount',
    'channelCountMode',
    'channelInterpretation',
    'context',
    'numberOfInputs',
    'numberOfOutputs',
  ],
};

const WEB_AUDIO_NAMES =
  /^(AudioDestinationNode|AudioContext|AudioNode|AudioParam|GainNode|OscillatorNode|AnalyserNode|BiquadFilterNode|AudioBufferSourceNode|MediaElementAudioSourceNode|MediaStreamAudioSourceNode|ScriptProcessorNode|ChannelMergerNode|ChannelSplitterNode|ConvolverNode|DynamicsCompressorNode|DelayNode|WaveShaperNode|StereoPannerNode|PannerNode|AudioListener|AudioWorklet|OfflineAudioContext|AudioRenderCapacity)$/;

function serializeValue(value: unknown, depth: number, seen: WeakSet<object>): Serialized {
  if (depth > MAX_DEPTH) {
    return { __type: 'maxDepth' };
  }
  if (value === null) return null;
  if (value === undefined) return { __type: 'undefined' };
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isInteger(value) || !Number.isFinite(value)) return value;
    return { __type: 'number', value: value.toString() };
  }
  if (typeof value === 'function') {
    return { __type: 'function', name: (value as { name?: string }).name || 'anonymous' };
  }
  if (typeof value === 'symbol') {
    return {
      __type: 'symbol',
      description: String((value as { description?: string }).description ?? ''),
    };
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { __type?: string }).__type === 'promise'
  ) {
    return value as Serialized;
  }
  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      const name =
        (value as object).constructor && typeof (value as object).constructor === 'function'
          ? ((value as object).constructor as { name?: string }).name
          : 'Object';
      return { __type: 'circular', name: name || 'Object' };
    }
    seen.add(value as object);

    try {
      if (Array.isArray(value)) {
        const items = (value as unknown[])
          .slice(0, 100)
          .map((item) => serializeValue(item, depth + 1, seen));
        if ((value as unknown[]).length > 100) {
          items.push({ __type: 'truncated', count: (value as unknown[]).length - 100 });
        }
        return { __type: 'array', length: (value as unknown[]).length, items };
      }

      const obj = value as Record<string, unknown>;
      const name =
        obj.constructor && typeof obj.constructor === 'function'
          ? (obj.constructor as { name?: string }).name
          : 'Object';
      const props: Record<string, Serialized> = {};

      const instanceKeys =
        name && WEB_AUDIO_NAMES.test(name)
          ? INSTANCE_KEYS_BY_TYPE[name] || INSTANCE_KEYS_BY_TYPE.AudioNode
          : null;

      if (instanceKeys) {
        for (const k of instanceKeys) {
          try {
            const val = obj[k];
            props[k] = serializeValue(val, depth + 1, seen);
          } catch {
            props[k] = { __type: 'error', message: 'Cannot read property' };
          }
        }
        props[PROTO_KEY] = { __type: 'object', name, props: {} };
      } else {
        try {
          const keys = Object.getOwnPropertyNames(obj);
          for (const key of keys) {
            try {
              props[key] = serializeValue(obj[key], depth + 1, seen);
            } catch {
              props[key] = { __type: 'error', message: 'Cannot read property' };
            }
          }
        } catch {
          // ignore
        }
        try {
          const proto = Object.getPrototypeOf(obj);
          if (proto !== null && proto !== Object.prototype) {
            const protoName =
              (proto as { constructor?: { name?: string } }).constructor?.name ?? 'Object';
            props[PROTO_KEY] = { __type: 'object', name: protoName, props: {} };
          }
        } catch {
          // ignore
        }
      }

      return { __type: 'object', name: name || 'Object', props };
    } finally {
      seen.delete(value as object);
    }
  }
  return String(value);
}

export function serializeForConsole(value: unknown): Serialized {
  return serializeValue(value, 0, new WeakSet());
}
