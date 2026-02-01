'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (require.main !== module) {
  module.exports = fs.readFileSync(__filename, 'utf8');
} else {
const dataPath = process.argv[2];
if (!dataPath) {
  process.stderr.write(JSON.stringify({ success: false, error: 'Missing data file path' }) + '\n');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const output = [];
const LINE_OFFSET = 1;
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

const __captureResult = (value, lineNumber) => {
  output.push({ type: 'result', level: 'info', message: value, line: lineNumber });
  return value;
};

const getCallerLine = () => {
  const stack = new Error().stack;
  if (!stack) return null;
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i++) {
    const match = lines[i].match(/(?:script\.js|<anonymous>):(\d+):(\d+)/);
    if (match) {
      return Math.max(1, parseInt(match[1], 10) - LINE_OFFSET);
    }
  }
  return null;
};

console.log = (...args) => {
  output.push({ type: 'log', level: 'info', message: args, line: getCallerLine() });
  originalLog(...args);
};
console.error = (...args) => {
  output.push({ type: 'error', level: 'error', message: args, line: getCallerLine() });
  originalError(...args);
};
console.warn = (...args) => {
  output.push({ type: 'warn', level: 'warn', message: args, line: getCallerLine() });
  originalWarn(...args);
};
console.info = (...args) => {
  output.push({ type: 'info', level: 'info', message: args, line: getCallerLine() });
  originalInfo(...args);
};

const getErrorLine = (error) => {
  if (!error || !error.stack) return null;
  const stackLines = error.stack.split('\n');
  for (let i = 0; i < stackLines.length; i++) {
    const match = stackLines[i].match(/(?:script\.js|<anonymous>):(\d+):(\d+)/);
    if (match) {
      return Math.max(1, parseInt(match[1], 10) - LINE_OFFSET);
    }
  }
  return null;
};

const MAX_INSPECT_DEPTH = 10;
const PROTO_KEY = '[[prototype]]';

function inspectForOutput(value, depth, seen) {
  if (depth > MAX_INSPECT_DEPTH) {
    return { __type: 'maxDepth' };
  }
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return { __type: 'undefined' };
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value) || !Number.isFinite(value)) {
      return value;
    }
    return { __type: 'number', value: value.toString() };
  }
  if (typeof value === 'function') {
    return { __type: 'function', name: value.name || 'anonymous' };
  }
  if (typeof value === 'symbol') {
    return { __type: 'symbol', description: String(value.description || '') };
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      const name = value.constructor && value.constructor.name ? value.constructor.name : 'Object';
      return { __type: 'circular', name };
    }
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        const items = [];
        const len = Math.min(value.length, 100);
        for (let i = 0; i < len; i++) {
          items.push(inspectForOutput(value[i], depth + 1, seen));
        }
        if (value.length > 100) {
          items.push({ __type: 'truncated', count: value.length - 100 });
        }
        return { __type: 'array', length: value.length, items };
      }
      const name = value.constructor && value.constructor.name ? value.constructor.name : 'Object';
      const props = {};
      const webAudioNames = /^(AudioDestinationNode|AudioContext|AudioNode|AudioParam|GainNode|OscillatorNode|AnalyserNode|BiquadFilterNode|AudioBufferSourceNode|MediaElementAudioSourceNode|MediaStreamAudioSourceNode|ScriptProcessorNode|ChannelMergerNode|ChannelSplitterNode|ConvolverNode|DynamicsCompressorNode|DelayNode|WaveShaperNode|StereoPannerNode|PannerNode|AudioListener|AudioWorklet|OfflineAudioContext|AudioRenderCapacity)$/;
      let isWebAudioLike = false;
      try {
        if (value.numberOfInputs !== undefined || value.context !== undefined || value.connect !== undefined || value.numberOfOutputs !== undefined) {
          isWebAudioLike = true;
        }
      } catch (_) {}
      if (isWebAudioLike) {
        let displayName = name;
        if (name === 'Object') {
          try {
            if (value.numberOfOutputs === 0 && value.numberOfInputs === 1) displayName = 'AudioDestinationNode';
            else if (typeof value.createOscillator === 'function') displayName = 'AudioContext';
            else displayName = 'AudioNode';
          } catch (_) {}
        }
        const instanceKeysByType = {
          AudioDestinationNode: ['channelCount', 'channelCountMode', 'channelInterpretation', 'context', 'maxChannelCount', 'numberOfInputs', 'numberOfOutputs'],
          AudioContext: ['baseLatency', 'outputLatency', 'currentTime', 'sampleRate', 'listener', 'state', 'destination', 'audioWorklet', 'onerror', 'onsinkchange', 'onstatechange', 'sinkId'],
          AudioNode: ['channelCount', 'channelCountMode', 'channelInterpretation', 'context', 'numberOfInputs', 'numberOfOutputs']
        };
        const instanceKeys = instanceKeysByType[displayName] || instanceKeysByType.AudioNode;
        for (const k of instanceKeys) {
          try {
            const val = value[k];
            props[k] = inspectForOutput(val, depth + 1, seen);
          } catch (err) {
            props[k] = { __type: 'error', message: String(err && err.message || err) };
          }
        }
        props[PROTO_KEY] = { __type: 'object', name: displayName, props: {} };
        return { __type: 'object', name: displayName, props };
      }
      if (webAudioNames.test(name)) {
        try {
          const instanceKeysByType = {
            AudioDestinationNode: ['channelCount', 'channelCountMode', 'channelInterpretation', 'context', 'maxChannelCount', 'numberOfInputs', 'numberOfOutputs'],
            AudioContext: ['baseLatency', 'outputLatency', 'currentTime', 'sampleRate', 'listener', 'state', 'destination', 'audioWorklet', 'onerror', 'onsinkchange', 'onstatechange', 'sinkId'],
            AudioNode: ['channelCount', 'channelCountMode', 'channelInterpretation', 'context', 'numberOfInputs', 'numberOfOutputs']
          };
          const instanceKeys = instanceKeysByType[name] || instanceKeysByType.AudioNode;
          for (const k of instanceKeys) {
            try {
              const val = value[k];
              props[k] = inspectForOutput(val, depth + 1, seen);
            } catch (err) {
              props[k] = { __type: 'error', message: String(err && err.message || err) };
            }
          }
          props[PROTO_KEY] = { __type: 'object', name: name, props: {} };
        } catch (outerErr) {
          props[PROTO_KEY] = { __type: 'object', name: 'prototype', props: { _err: { __type: 'error', message: String(outerErr && outerErr.message || outerErr) } } };
        }
        return { __type: 'object', name, props };
      }
      const webAudioProtoKeys = [
        'context', 'numberOfInputs', 'numberOfOutputs', 'channelCount',
        'channelCountMode', 'channelInterpretation', 'maxChannelCount',
        'connect', 'disconnect', 'addEventListener', 'removeEventListener', 'dispatchEvent',
        'baseLatency', 'outputLatency', 'close', 'createOscillator', 'createGain', 'createAnalyser',
        'createBiquadFilter', 'createBuffer', 'createBufferSource', 'createChannelMerger',
        'createChannelSplitter', 'createConstantSource', 'createConvolver', 'createDelay',
        'createDynamicsCompressor', 'createIIRFilter', 'createPanner', 'createPeriodicWave',
        'createScriptProcessor', 'createStereoPanner', 'createWaveShaper', 'decodeAudioData',
        'currentTime', 'sampleRate', 'listener', 'state', 'destination', 'audioWorklet'
      ];
      let webAudioProto = null;
      const protoPropsForWebAudio = {};
      for (const k of webAudioProtoKeys) {
        try {
          const val = value[k];
          protoPropsForWebAudio[k] = inspectForOutput(val, depth + 1, seen);
        } catch (err) {
          protoPropsForWebAudio[k] = { __type: 'error', message: String(err && err.message || err) };
        }
      }
      webAudioProto = { __type: 'object', name: name + ' prototype', props: protoPropsForWebAudio };
      try {
        const ownKeys = Object.getOwnPropertyNames(value);
        for (const key of ownKeys) {
          try {
            props[key] = inspectForOutput(value[key], depth + 1, seen);
          } catch (e) {
            props[key] = { __type: 'error', message: String(e.message || e) };
          }
        }
      } catch (e) {
        props['__ownKeysError'] = { __type: 'error', message: String(e.message || e) };
      }
      try {
        const proto = Object.getPrototypeOf(value);
        if (proto !== null) {
          const protoName = proto.constructor && proto.constructor.name ? proto.constructor.name : 'Object';
          try {
            props[PROTO_KEY] = inspectForOutput(proto, depth + 1, seen);
          } catch (protoErr) {
            const protoProps = {};
            try {
              const protoKeys = Object.getOwnPropertyNames(proto);
              for (const k of protoKeys) {
                try {
                  protoProps[k] = inspectForOutput(proto[k], depth + 2, seen);
                } catch (err) {
                  protoProps[k] = { __type: 'error', message: String(err.message || err) };
                }
              }
              props[PROTO_KEY] = { __type: 'object', name: protoName, props: protoProps };
            } catch (keysErr) {
              props[PROTO_KEY] = { __type: 'object', name: protoName, props: {} };
            }
          }
        }
      } catch (e) {
        props[PROTO_KEY] = { __type: 'error', message: String(e.message || e) };
      }
      if (Object.keys(props).length === 0) {
        try {
          const enumKeys = Object.keys(value);
          for (const k of enumKeys) {
            try {
              props[k] = inspectForOutput(value[k], depth + 1, seen);
            } catch (err) {
              props[k] = { __type: 'error', message: String(err.message || err) };
            }
          }
        } catch (_) {}
      }
      if (Object.keys(props).length === 0) {
        try {
          const ownKeys = Reflect.ownKeys(value);
          for (const k of ownKeys) {
            const keyStr = typeof k === 'symbol' ? k.toString() : k;
            if (Object.prototype.hasOwnProperty.call(props, keyStr)) continue;
            try {
              props[keyStr] = inspectForOutput(value[k], depth + 1, seen);
            } catch (err) {
              props[keyStr] = { __type: 'error', message: String(err.message || err) };
            }
          }
        } catch (_) {}
      }
      if (Object.keys(props).length === 0 && value.constructor && value.constructor.prototype) {
        const ctorProto = value.constructor.prototype;
        if (!seen.has(ctorProto)) {
          const protoName = ctorProto.constructor && ctorProto.constructor.name ? ctorProto.constructor.name : 'Object';
          try {
            const protoKeys = Object.getOwnPropertyNames(ctorProto);
            const protoProps = {};
            for (const k of protoKeys) {
              try {
                protoProps[k] = inspectForOutput(ctorProto[k], depth + 1, seen);
              } catch (err) {
                protoProps[k] = { __type: 'error', message: String(err.message || err) };
              }
            }
            props[PROTO_KEY] = { __type: 'object', name: protoName, props: protoProps };
          } catch (_) {}
        }
      }
      if (Object.keys(props).length === 0) {
        const knownWebAudioKeys = [
          'context', 'numberOfInputs', 'numberOfOutputs', 'channelCount',
          'channelCountMode', 'channelInterpretation', 'maxChannelCount',
          'connect', 'disconnect'
        ];
        for (const k of knownWebAudioKeys) {
          try {
            const val = value[k];
            if (val !== undefined) props[k] = inspectForOutput(val, depth + 1, seen);
          } catch (_) {}
        }
      }
      let napiInner = null;
      function tryGetNapiInner(obj) {
        const keys = typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(obj) : Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));
        for (const k of keys) {
          if (typeof k === 'symbol') {
            const desc = k.toString();
            if (desc.includes('node-web-audio-api') || (k.description && k.description.includes('napi-obj'))) {
              try {
                const v = obj[k];
                if (v && typeof v === 'object') return v;
              } catch (_) {}
            }
          }
        }
        return null;
      }
      napiInner = tryGetNapiInner(value);
      if (napiInner) {
        const proto = Object.getPrototypeOf(napiInner) || (napiInner.constructor && napiInner.constructor.prototype);
        if (proto && !seen.has(proto)) {
          const protoName = proto.constructor && proto.constructor.name ? proto.constructor.name : 'Object';
          let protoProps = null;
          try {
            const protoKeys = Object.getOwnPropertyNames(proto);
            const built = {};
            for (const k of protoKeys) {
              try {
                built[k] = inspectForOutput(proto[k], depth + 1, seen);
              } catch (err) {
                built[k] = { __type: 'error', message: String(err.message || err) };
              }
            }
            protoProps = built;
          } catch (_) {}
          if (protoProps !== null) {
            for (const key of Object.keys(props)) {
              if (typeof key === 'string' && key.startsWith('Symbol(')) delete props[key];
            }
            props[PROTO_KEY] = { __type: 'object', name: protoName, props: protoProps };
          }
        }
      }
      if (Object.keys(props).length === 0) {
        const ctorProto = value.constructor && value.constructor.prototype;
        if (ctorProto && !seen.has(ctorProto)) {
          const protoName = ctorProto.constructor && ctorProto.constructor.name ? ctorProto.constructor.name : 'Object';
          const protoProps = {};
          try {
            const protoKeys = Object.getOwnPropertyNames(ctorProto);
            for (const k of protoKeys) {
              try {
                protoProps[k] = inspectForOutput(ctorProto[k], depth + 1, seen);
              } catch (err) {
                protoProps[k] = { __type: 'error', message: String(err.message || err) };
              }
            }
            props[PROTO_KEY] = { __type: 'object', name: protoName, props: protoProps };
          } catch (_) {}
        }
      }
      if (Object.keys(props).length === 0 || (webAudioNames.test(name) && !props[PROTO_KEY])) {
        const protoProps = {};
        for (const k of webAudioProtoKeys) {
          try {
            const val = value[k];
            protoProps[k] = inspectForOutput(val, depth + 1, seen);
          } catch (err) {
            protoProps[k] = { __type: 'error', message: String(err.message || err) };
          }
        }
        if (Object.keys(protoProps).length > 0 || webAudioNames.test(name)) {
          for (const key of Object.keys(props)) {
            if (typeof key === 'string' && key.startsWith('Symbol(')) delete props[key];
          }
          props[PROTO_KEY] = { __type: 'object', name: name + ' prototype', props: protoProps };
        }
      }
      if (Object.keys(props).length === 0 && webAudioProto) {
        props[PROTO_KEY] = webAudioProto;
      }
      if (webAudioNames.test(name) && Object.keys(props).length === 0) {
        props[PROTO_KEY] = webAudioProto || { __type: 'object', name: 'prototype', props: { _inspection: { __type: 'error', message: 'Could not enumerate' } } };
      }
      if (webAudioNames.test(name) && Object.keys(props).length === 0) {
        const fallbackProtoKeys = [
          'maxChannelCount', 'context', 'numberOfInputs', 'numberOfOutputs', 'channelCount',
          'channelCountMode', 'channelInterpretation', 'connect', 'disconnect',
          'addEventListener', 'removeEventListener', 'dispatchEvent', 'constructor'
        ];
        const fallbackProtoProps = {};
        for (const k of fallbackProtoKeys) {
          try {
            const val = value[k];
            fallbackProtoProps[k] = inspectForOutput(val, depth + 1, seen);
          } catch (err) {
            fallbackProtoProps[k] = { __type: 'error', message: String(err && err.message || err) };
          }
        }
        props[PROTO_KEY] = { __type: 'object', name: name + ' prototype', props: fallbackProtoProps };
      }
      return { __type: 'object', name, props };
    } finally {
      seen.delete(value);
    }
  }
  return String(value);
}

function serializeResult(result) {
  const seen = new WeakSet();
  return inspectForOutput(result, 0, seen);
}

function serializeOutput(outputArray) {
  return outputArray.map((entry) => {
    const msg = entry.message;
    if (msg && typeof msg === 'object' && msg.__type === 'promise') {
      return { ...entry, message: msg };
    }
    if (Array.isArray(msg)) {
      return { ...entry, message: msg.map((m) => inspectForOutput(m, 0, new WeakSet())) };
    }
    return { ...entry, message: inspectForOutput(msg, 0, new WeakSet()) };
  });
}

let AudioContextStub = null;
const projectRoot = data.projectRoot || process.cwd();
const webAudioPaths = [
  'node-web-audio-api',
  path.join(projectRoot, 'node_modules', 'node-web-audio-api'),
];
for (const webAudioPath of webAudioPaths) {
  try {
    const webAudio = require(webAudioPath);
    AudioContextStub = webAudio.AudioContext;
    break;
  } catch (_) {
    /* try next path */
  }
}
if (!AudioContextStub) {
  AudioContextStub = function AudioContext() {
    throw new Error(
      'AudioContext is not available. Install optional dependency: npm install node-web-audio-api'
    );
  };
}

try {
  new vm.Script(data.cjsScript, { filename: 'input.js' });
} catch (syntaxError) {
  const message = syntaxError.message || '';
  const srcLines = data.script.split('\n');
  let line = 1;
  const fileMatch = (syntaxError.stack || '').match(/input\.js:(\d+)/);
  if (fileMatch) {
    line = parseInt(fileMatch[1], 10);
  }
  const srcLine = line > 0 && line <= srcLines.length ? srcLines[line - 1] : '';
  const column = /missing/.test(message) ? srcLine.length : 1;
  process.stdout.write(JSON.stringify({
    success: false,
    syntaxError: { message, line, column },
    output: []
  }) + '\n');
  process.exit(0);
}

try {
  const normalizedScript = data.transformedScript.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const wrappedCode = '(function() {\n' + normalizedScript + '\n})();';
  const scriptObj = new vm.Script(wrappedCode, { filename: 'script.js' });
  const sandbox = {
    require,
    module,
    exports,
    __dirname,
    __filename,
    console,
    process,
    Buffer,
    setTimeout,
    setInterval,
    setImmediate,
    clearTimeout,
    clearInterval,
    clearImmediate,
    global,
    globalThis,
    __captureResult
  };
  if (typeof globalThis.fetch === 'function') {
    sandbox.fetch = globalThis.fetch;
  }
  sandbox.AudioContext = AudioContextStub;
  vm.createContext(sandbox);
  const result = scriptObj.runInContext(sandbox);
  const sendResult = (valueToSerialize) => {
    const serializedResult = serializeResult(valueToSerialize);
    const serializedOutput = serializeOutput(output);
    process.stdout.write(JSON.stringify({
      success: true,
      result: serializedResult,
      resultLine: data.resultLine,
      output: serializedOutput
    }) + '\n');
  };
  const sendError = (err) => {
    const errorMessage = (err.name || 'Error') + ': ' + (err.message || String(err));
    const errorLine = getErrorLine(err);
    process.stdout.write(JSON.stringify({
      success: false,
      error: errorMessage,
      errorLine: errorLine || null,
      output
    }) + '\n');
  };
  if (result != null && typeof result.then === 'function') {
    output.push({
      type: 'result',
      level: 'info',
      message: { __type: 'promise', state: 'pending' },
      line: data.resultLine
    });
    Promise.resolve(result).then(
      (resolved) => sendResult(resolved),
      (err) => sendError(err)
    );
  } else {
    setImmediate(() => setTimeout(() => sendResult(result), 10));
  }
} catch (error) {
  const errorMessage = (error.name || 'Error') + ': ' + (error.message || String(error));
  const errorLine = getErrorLine(error);
  process.stdout.write(JSON.stringify({
    success: false,
    error: errorMessage,
    errorLine: errorLine || null,
    output
  }) + '\n');
}
}
