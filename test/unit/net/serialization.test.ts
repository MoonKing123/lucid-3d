import { describe, it, expect } from 'vitest';
import { encode, decode } from '../../../src/net/serialization';

describe('序列化 round-trip', () => {
  it('null', () => {
    expect(decode(encode(null))).toBeNull();
  });

  it('布尔值 false', () => {
    expect(decode(encode(false))).toBe(false);
  });

  it('布尔值 true', () => {
    expect(decode(encode(true))).toBe(true);
  });

  it('整数', () => {
    expect(decode(encode(42))).toBe(42);
  });

  it('负数', () => {
    expect(decode(encode(-100))).toBe(-100);
  });

  it('浮点数', () => {
    expect(decode(encode(3.14))).toBeCloseTo(3.14, 10);
  });

  it('零', () => {
    expect(decode(encode(0))).toBe(0);
  });

  it('空字符串', () => {
    expect(decode(encode(''))).toBe('');
  });

  it('ASCII 字符串', () => {
    expect(decode(encode('hello world'))).toBe('hello world');
  });

  it('中文字符串', () => {
    expect(decode(encode('你好世界'))).toBe('你好世界');
  });

  it('空数组', () => {
    expect(decode(encode([]))).toEqual([]);
  });

  it('数字数组', () => {
    expect(decode(encode([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it('混合数组', () => {
    expect(decode(encode([1, 'a', true, null]))).toEqual([1, 'a', true, null]);
  });

  it('空对象', () => {
    expect(decode(encode({}))).toEqual({});
  });

  it('简单对象', () => {
    expect(decode(encode({ x: 1, y: 2 }))).toEqual({ x: 1, y: 2 });
  });

  it('嵌套对象', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(decode(encode(obj))).toEqual(obj);
  });

  it('对象数组嵌套', () => {
    const val = { items: [{ id: 1 }, { id: 2 }], count: 2 };
    expect(decode(encode(val))).toEqual(val);
  });

  it('Vec3 对象', () => {
    const vec = { x: 1.5, y: -2.5, z: 0.0 };
    expect(decode(encode(vec))).toEqual(vec);
  });

  it('encode 返回 Uint8Array', () => {
    expect(encode(42)).toBeInstanceOf(Uint8Array);
  });
});
