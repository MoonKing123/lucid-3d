const TAG_NULL = 0x00;
const TAG_FALSE = 0x01;
const TAG_TRUE = 0x02;
const TAG_NUMBER = 0x03;
const TAG_STRING = 0x04;
const TAG_ARRAY = 0x05;
const TAG_OBJECT = 0x06;

function encodeValue(value: unknown, parts: Uint8Array[]): void {
  if (value === null || value === undefined) {
    parts.push(new Uint8Array([TAG_NULL]));
    return;
  }
  if (typeof value === 'boolean') {
    parts.push(new Uint8Array([value ? TAG_TRUE : TAG_FALSE]));
    return;
  }
  if (typeof value === 'number') {
    const buf = new Uint8Array(9);
    buf[0] = TAG_NUMBER;
    new DataView(buf.buffer).setFloat64(1, value, false);
    parts.push(buf);
    return;
  }
  if (typeof value === 'string') {
    const encoded = new TextEncoder().encode(value);
    const header = new Uint8Array(5);
    header[0] = TAG_STRING;
    new DataView(header.buffer).setUint32(1, encoded.length, false);
    parts.push(header, encoded);
    return;
  }
  if (Array.isArray(value)) {
    const header = new Uint8Array(5);
    header[0] = TAG_ARRAY;
    new DataView(header.buffer).setUint32(1, value.length, false);
    parts.push(header);
    for (const item of value) encodeValue(item, parts);
    return;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    const header = new Uint8Array(5);
    header[0] = TAG_OBJECT;
    new DataView(header.buffer).setUint32(1, keys.length, false);
    parts.push(header);
    for (const key of keys) {
      encodeValue(key, parts);
      encodeValue((value as Record<string, unknown>)[key], parts);
    }
    return;
  }
  parts.push(new Uint8Array([TAG_NULL]));
}

export function encode(value: unknown): Uint8Array {
  const parts: Uint8Array[] = [];
  encodeValue(value, parts);
  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function decodeValue(buffer: Uint8Array, offset: number): [unknown, number] {
  const tag = buffer[offset++];
  switch (tag) {
    case TAG_NULL:
      return [null, offset];
    case TAG_FALSE:
      return [false, offset];
    case TAG_TRUE:
      return [true, offset];
    case TAG_NUMBER: {
      const v = new DataView(buffer.buffer, buffer.byteOffset + offset).getFloat64(0, false);
      return [v, offset + 8];
    }
    case TAG_STRING: {
      const len = new DataView(buffer.buffer, buffer.byteOffset + offset).getUint32(0, false);
      offset += 4;
      const str = new TextDecoder().decode(buffer.subarray(offset, offset + len));
      return [str, offset + len];
    }
    case TAG_ARRAY: {
      const count = new DataView(buffer.buffer, buffer.byteOffset + offset).getUint32(0, false);
      offset += 4;
      const arr: unknown[] = [];
      for (let i = 0; i < count; i++) {
        const [val, next] = decodeValue(buffer, offset);
        arr.push(val);
        offset = next;
      }
      return [arr, offset];
    }
    case TAG_OBJECT: {
      const count = new DataView(buffer.buffer, buffer.byteOffset + offset).getUint32(0, false);
      offset += 4;
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < count; i++) {
        const [key, afterKey] = decodeValue(buffer, offset);
        const [val, afterVal] = decodeValue(buffer, afterKey);
        obj[key as string] = val;
        offset = afterVal;
      }
      return [obj, offset];
    }
    default:
      throw new Error(`未知 tag: 0x${tag.toString(16)}`);
  }
}

export function decode(buffer: Uint8Array): unknown {
  const [value] = decodeValue(buffer, 0);
  return value;
}
