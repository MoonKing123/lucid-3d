/**
 * Color 单元测试 — RGB 颜色类。
 * Architect 预写测试，Dev 实现 src/math/color.ts 后所有测试应通过。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/math/color';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('Color constructor', () => {
  it('should default to black (0, 0, 0)', () => {
    const c = new mod.Color();
    expect(c.r).toBe(0);
    expect(c.g).toBe(0);
    expect(c.b).toBe(0);
  });
  it('should accept r, g, b values', () => {
    const c = new mod.Color(0.2, 0.4, 0.6);
    expect(c.r).toBeCloseTo(0.2);
    expect(c.g).toBeCloseTo(0.4);
    expect(c.b).toBeCloseTo(0.6);
  });
});

describeImpl('Color.fromHex', () => {
  it('should parse hex string with #', () => {
    const c = mod.Color.fromHex('#ff0000');
    expect(c.r).toBeCloseTo(1);
    expect(c.g).toBeCloseTo(0);
    expect(c.b).toBeCloseTo(0);
  });
  it('should parse hex string without #', () => {
    const c = mod.Color.fromHex('00ff00');
    expect(c.r).toBeCloseTo(0);
    expect(c.g).toBeCloseTo(1);
    expect(c.b).toBeCloseTo(0);
  });
  it('should parse hex number', () => {
    const c = mod.Color.fromHex(0x0000ff);
    expect(c.r).toBeCloseTo(0);
    expect(c.g).toBeCloseTo(0);
    expect(c.b).toBeCloseTo(1);
  });
});

describeImpl('Color.toHex / toHexNumber', () => {
  it('should convert red to #ff0000', () => {
    const c = new mod.Color(1, 0, 0);
    expect(c.toHex()).toBe('#ff0000');
  });
  it('should convert white to #ffffff', () => {
    const c = new mod.Color(1, 1, 1);
    expect(c.toHex()).toBe('#ffffff');
  });
  it('should convert to hex number', () => {
    const c = new mod.Color(1, 0, 0);
    expect(c.toHexNumber()).toBe(0xff0000);
  });
  it('should round-trip fromHex → toHex', () => {
    const c = mod.Color.fromHex('#3a7bd5');
    expect(c.toHex()).toBe('#3a7bd5');
  });
});

describeImpl('Color.fromHSL / toHSL', () => {
  it('should create red from HSL(0, 1, 0.5)', () => {
    const c = mod.Color.fromHSL(0, 1, 0.5);
    expect(c.r).toBeCloseTo(1, 1);
    expect(c.g).toBeCloseTo(0, 1);
    expect(c.b).toBeCloseTo(0, 1);
  });
  it('should create green from HSL(1/3, 1, 0.5)', () => {
    const c = mod.Color.fromHSL(1 / 3, 1, 0.5);
    expect(c.r).toBeCloseTo(0, 1);
    expect(c.g).toBeCloseTo(1, 1);
    expect(c.b).toBeCloseTo(0, 1);
  });
  it('should create white from HSL(0, 0, 1)', () => {
    const c = mod.Color.fromHSL(0, 0, 1);
    expect(c.r).toBeCloseTo(1, 1);
    expect(c.g).toBeCloseTo(1, 1);
    expect(c.b).toBeCloseTo(1, 1);
  });
  it('should round-trip fromHSL → toHSL → fromHSL', () => {
    const c1 = mod.Color.fromHSL(0.6, 0.8, 0.4);
    const hsl = c1.toHSL();
    const c2 = mod.Color.fromHSL(hsl.h, hsl.s, hsl.l);
    expect(c2.r).toBeCloseTo(c1.r, 2);
    expect(c2.g).toBeCloseTo(c1.g, 2);
    expect(c2.b).toBeCloseTo(c1.b, 2);
  });
});

describeImpl('Color.set / clone / copy / equals', () => {
  it('should set RGB values', () => {
    const c = new mod.Color();
    c.set(0.1, 0.2, 0.3);
    expect(c.r).toBeCloseTo(0.1);
    expect(c.g).toBeCloseTo(0.2);
    expect(c.b).toBeCloseTo(0.3);
  });
  it('should clone as independent copy', () => {
    const a = new mod.Color(0.5, 0.6, 0.7);
    const b = a.clone();
    expect(b.r).toBeCloseTo(0.5);
    b.r = 0;
    expect(a.r).toBeCloseTo(0.5); // original unchanged
  });
  it('should copy from another Color', () => {
    const a = new mod.Color(0.1, 0.2, 0.3);
    const b = new mod.Color();
    b.copy(a);
    expect(b.r).toBeCloseTo(0.1);
    expect(b.g).toBeCloseTo(0.2);
  });
  it('should compare equality', () => {
    const a = new mod.Color(0.5, 0.5, 0.5);
    const b = new mod.Color(0.5, 0.5, 0.5);
    const c = new mod.Color(0.5, 0.5, 0.6);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describeImpl('Color.lerp', () => {
  it('should interpolate between black and white', () => {
    const a = new mod.Color(0, 0, 0);
    const b = new mod.Color(1, 1, 1);
    const mid = mod.Color.lerp(a, b, 0.5);
    expect(mid.r).toBeCloseTo(0.5);
    expect(mid.g).toBeCloseTo(0.5);
    expect(mid.b).toBeCloseTo(0.5);
  });
  it('should return a when t=0', () => {
    const a = new mod.Color(0.2, 0.3, 0.4);
    const b = new mod.Color(0.8, 0.9, 1.0);
    const result = mod.Color.lerp(a, b, 0);
    expect(result.r).toBeCloseTo(0.2);
  });
  it('should return b when t=1', () => {
    const a = new mod.Color(0.2, 0.3, 0.4);
    const b = new mod.Color(0.8, 0.9, 1.0);
    const result = mod.Color.lerp(a, b, 1);
    expect(result.r).toBeCloseTo(0.8);
  });
});

describeImpl('Color arithmetic — multiply, multiplyScalar, add', () => {
  it('should multiply component-wise', () => {
    const a = new mod.Color(0.5, 0.4, 0.8);
    const b = new mod.Color(0.5, 0.5, 0.5);
    a.multiply(b);
    expect(a.r).toBeCloseTo(0.25);
    expect(a.g).toBeCloseTo(0.2);
    expect(a.b).toBeCloseTo(0.4);
  });
  it('should multiply by scalar', () => {
    const c = new mod.Color(0.5, 0.5, 0.5);
    c.multiplyScalar(2);
    expect(c.r).toBeCloseTo(1.0);
    expect(c.g).toBeCloseTo(1.0);
  });
  it('should add component-wise', () => {
    const a = new mod.Color(0.3, 0.2, 0.1);
    const b = new mod.Color(0.1, 0.2, 0.3);
    a.add(b);
    expect(a.r).toBeCloseTo(0.4);
    expect(a.g).toBeCloseTo(0.4);
    expect(a.b).toBeCloseTo(0.4);
  });
});

describeImpl('Color.toArray / toVec3', () => {
  it('should convert to [r, g, b] array', () => {
    const c = new mod.Color(0.1, 0.2, 0.3);
    const arr = c.toArray();
    expect(arr).toEqual([
      expect.closeTo(0.1, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
    ]);
  });
  it('should convert to Vec3', () => {
    const c = new mod.Color(0.4, 0.5, 0.6);
    const v = c.toVec3();
    expect(v[0]).toBeCloseTo(0.4);
    expect(v[1]).toBeCloseTo(0.5);
    expect(v[2]).toBeCloseTo(0.6);
  });
});
