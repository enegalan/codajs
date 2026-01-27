export interface SerializedValue {
  type: string;
  value: any;
  id?: string;
  circular?: boolean;
  ref?: string;
}

export class Serializer {
  private referenceMap: Map<any, string> = new Map();
  private idCounter = 0;

  public serialize(value: any): SerializedValue {
    this.referenceMap.clear();
    this.idCounter = 0;
    return this.serializeValue(value, new Set());
  }

  private serializeValue(value: any, seen: Set<any>): SerializedValue {
    if (value === null) {
      return { type: 'null', value: null };
    }

    if (value === undefined) {
      return { type: 'undefined', value: undefined };
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return { type: typeof value, value };
    }

    if (typeof value === 'function') {
      return { type: 'function', value: `[Function: ${value.name || 'anonymous'}]` };
    }

    if (typeof value === 'symbol') {
      return { type: 'symbol', value: value.toString() };
    }

    // Check for circular reference
    if (seen.has(value)) {
      const id = this.referenceMap.get(value);
      if (id) {
        return { type: 'circular', value: '[Circular Reference]', circular: true, ref: id };
      }
    }

    // Mark as seen
    const id = `ref-${++this.idCounter}`;
    this.referenceMap.set(value, id);
    seen.add(value);

    if (Array.isArray(value)) {
      return {
        type: 'array',
        id,
        value: value.map((item, index) => ({
          key: index,
          value: this.serializeValue(item, seen),
        })),
      };
    }

    if (value instanceof Date) {
      return { type: 'date', value: value.toISOString() };
    }

    if (value instanceof Error) {
      return {
        type: 'error',
        value: {
          name: value.name,
          message: value.message,
          stack: value.stack,
        },
      };
    }

    if (typeof value === 'object') {
      const serialized: SerializedValue = {
        type: 'object',
        id,
        value: {},
      };

      try {
        const keys = Object.keys(value);
        for (const key of keys) {
          try {
            (serialized.value as any)[key] = this.serializeValue(value[key], seen);
          } catch (error) {
            (serialized.value as any)[key] = {
              type: 'error',
              value: 'Failed to serialize property',
            };
          }
        }
      } catch (error) {
        return { type: 'error', value: 'Failed to serialize object' };
      }

      return serialized;
    }

    return { type: 'unknown', value: String(value) };
  }

  public deserialize(serialized: SerializedValue): any {
    const refs: Map<string, any> = new Map();

    return this.deserializeValue(serialized, refs);
  }

  private deserializeValue(serialized: SerializedValue, refs: Map<string, any>): any {
    if (serialized.circular && serialized.ref) {
      return refs.get(serialized.ref) || '[Circular Reference]';
    }

    switch (serialized.type) {
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'string':
      case 'number':
      case 'boolean':
        return serialized.value;
      case 'array': {
        const array: any[] = [];
        if (serialized.id) {
          refs.set(serialized.id, array);
        }
        if (Array.isArray(serialized.value)) {
          for (const item of serialized.value) {
            array.push(this.deserializeValue(item.value, refs));
          }
        }
        return array;
      }
      case 'object': {
        const obj: any = {};
        if (serialized.id) {
          refs.set(serialized.id, obj);
        }
        if (typeof serialized.value === 'object' && serialized.value !== null) {
          for (const [key, val] of Object.entries(serialized.value)) {
            obj[key] = this.deserializeValue(val as SerializedValue, refs);
          }
        }
        return obj;
      }
      case 'date':
        return new Date(serialized.value);
      default:
        return serialized.value;
    }
  }
}
