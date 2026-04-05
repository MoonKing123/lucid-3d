/**
 * MathUtils 单元测试 — 集中式数学工具函数。
 * Architect 预写测试，Dev 实现 src/math/utils.ts 后所有测试应通过。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/math/utils';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('clamp', () => {
  it('should clamp value below min to min', () => {
    expect(mod.clamp(-5, 0, 10)).toBe(0);
  });
  it('should clamp value above max to max', () => {
    expect(mod.clamp(15, 0, 10)).toBe(10);
  });
  it('should return value when within range', () => {
    expect(mod.clamp(5, 0, 10)).toBe(5);
  });
  it('should handle min === max', () => {
    expect(mod.clamp(5, 3, 3)).toBe(3);
  });
});

describeImpl('lerp', () => {
  it('should return a when t=0', () => {
    expect(mod.lerp(10, 20, 0)).toBe(10);
  });
  it('should return b when t=1', () => {
    expect(mod.lerp(10, 20, 1)).toBe(20);
  });
  it('should return midpoint when t=0.5', () => {
    expect(mod.lerp(0, 100, 0.5)).toBe(50);
  });
  it('should extrapolate when t > 1', () => {
    expect(mod.lerp(0, 10, 2)).toBe(20);
  });
});

describeImpl('inverseLerp', () => {
  it('should return 0 when value === a', () => {
    expect(mod.inverseLerp(10, 20, 10)).toBe(0);
  });
  it('should return 1 when value === b', () => {
    expect(mod.inverseLerp(10, 20, 20)).toBe(1);
  });
  it('should return 0.5 for midpoint', () => {
    expect(mod.inverseLerp(0, 100, 50)).toBe(0.5);
  });
  it('should return 0 when a === b (degenerate)', () => {
    expect(mod.inverseLerp(5, 5, 5)).toBe(0);
  });
});

describeImpl('smoothstep', () => {
  it('should return 0 when x <= edge0', () => {
    expect(mod.smoothstep(0, 1, -0.5)).toBe(0);
    expect(mod.smoothstep(0, 1, 0)).toBe(0);
  });
  it('should return 1 when x >= edge1', () => {
    expect(mod.smoothstep(0, 1, 1)).toBe(1);
    expect(mod.smoothstep(0, 1, 2)).toBe(1);
  });
  it('should return 0.5 at midpoint', () => {
    expect(mod.smoothstep(0, 1, 0.5)).toBe(0.5);
  });
  it('should produce S-curve values', () => {
    const v = mod.smoothstep(0, 1, 0.25);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.5);
  });
});

describeImpl('degToRad / radToDeg', () => {
  it('should convert 180° to π', () => {
    expect(mod.degToRad(180)).toBeCloseTo(Math.PI, 10);
  });
  it('should convert 90° to π/2', () => {
    expect(mod.degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
  });
  it('should convert π to 180°', () => {
    expect(mod.radToDeg(Math.PI)).toBeCloseTo(180, 10);
  });
  it('should be inverse operations', () => {
    expect(mod.radToDeg(mod.degToRad(45))).toBeCloseTo(45, 10);
  });
});

describeImpl('mapRange', () => {
  it('should map 0.5 from [0,1] to [0,100]', () => {
    expect(mod.mapRange(0.5, 0, 1, 0, 100)).toBe(50);
  });
  it('should map across different ranges', () => {
    expect(mod.mapRange(5, 0, 10, 100, 200)).toBe(150);
  });
  it('should handle inverted output range', () => {
    expect(mod.mapRange(0, 0, 1, 100, 0)).toBe(100);
    expect(mod.mapRange(1, 0, 1, 100, 0)).toBe(0);
  });
});

describeImpl('randomRange', () => {
  it('should return value within [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const v = mod.randomRange(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });
  it('should return min when min === max', () => {
    expect(mod.randomRange(7, 7)).toBe(7);
  });
});

describeImpl('isPowerOfTwo', () => {
  it('should return true for powers of 2', () => {
    expect(mod.isPowerOfTwo(1)).toBe(true);
    expect(mod.isPowerOfTwo(2)).toBe(true);
    expect(mod.isPowerOfTwo(4)).toBe(true);
    expect(mod.isPowerOfTwo(256)).toBe(true);
    expect(mod.isPowerOfTwo(1024)).toBe(true);
  });
  it('should return false for non-powers of 2', () => {
    expect(mod.isPowerOfTwo(0)).toBe(false);
    expect(mod.isPowerOfTwo(3)).toBe(false);
    expect(mod.isPowerOfTwo(5)).toBe(false);
    expect(mod.isPowerOfTwo(100)).toBe(false);
  });
});

describeImpl('nextPowerOfTwo', () => {
  it('should return same value if already power of 2', () => {
    expect(mod.nextPowerOfTwo(1)).toBe(1);
    expect(mod.nextPowerOfTwo(4)).toBe(4);
    expect(mod.nextPowerOfTwo(256)).toBe(256);
  });
  it('should round up to next power of 2', () => {
    expect(mod.nextPowerOfTwo(3)).toBe(4);
    expect(mod.nextPowerOfTwo(5)).toBe(8);
    expect(mod.nextPowerOfTwo(100)).toBe(128);
    expect(mod.nextPowerOfTwo(1000)).toBe(1024);
  });
  it('should handle 0 → 1', () => {
    expect(mod.nextPowerOfTwo(0)).toBe(1);
  });
});
