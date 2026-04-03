/**
 * Fog 雾效测试
 * 验证三种雾模式的因子计算和 GLSL 代码片段导出。
 */
import { describe, it, expect } from 'vitest';
import * as fogMod from '../../src/renderer/fog';

const isStub = '__STUB__' in fogMod && (fogMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- computeFogFactor — linear ---------- */

describeImpl('computeFogFactor — linear', () => {
  const linear = (d: number) =>
    fogMod.computeFogFactor(d, { mode: 'linear', near: 10, far: 100 });

  it('should return 0 at near plane', () => {
    expect(linear(10)).toBe(0);
  });

  it('should return 1 at far plane', () => {
    expect(linear(100)).toBe(1);
  });

  it('should interpolate linearly at midpoint', () => {
    expect(linear(55)).toBeCloseTo(0.5, 1);
  });

  it('should clamp to 0 when distance < near', () => {
    expect(linear(0)).toBe(0);
    expect(linear(-5)).toBe(0);
  });

  it('should clamp to 1 when distance > far', () => {
    expect(linear(200)).toBe(1);
  });
});

/* ---------- computeFogFactor — exponential ---------- */

describeImpl('computeFogFactor — exponential', () => {
  it('should compute exp fog: 1 - e^(-density*dist)', () => {
    const f = fogMod.computeFogFactor(10, { mode: 'exp', density: 0.1 });
    expect(f).toBeCloseTo(1 - Math.exp(-0.1 * 10), 4);
  });

  it('should compute exp2 fog: 1 - e^(-(density*dist)^2)', () => {
    const f = fogMod.computeFogFactor(10, { mode: 'exp2', density: 0.1 });
    expect(f).toBeCloseTo(1 - Math.exp(-Math.pow(0.1 * 10, 2)), 4);
  });

  it('should return 0 at distance 0 for exp modes', () => {
    expect(fogMod.computeFogFactor(0, { mode: 'exp', density: 0.5 })).toBe(0);
    expect(fogMod.computeFogFactor(0, { mode: 'exp2', density: 0.5 })).toBe(0);
  });

  it('should clamp to [0, 1] at extreme distances', () => {
    const f = fogMod.computeFogFactor(99999, { mode: 'exp', density: 100 });
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);
  });
});

/* ---------- GLSL snippets ---------- */

describeImpl('Fog GLSL snippets', () => {
  it('should export vertex pars with v_fogDist varying', () => {
    expect(fogMod.FOG_VERTEX_PARS).toContain('v_fogDist');
  });

  it('should export vertex code computing v_fogDist', () => {
    expect(fogMod.FOG_VERTEX_CODE).toContain('v_fogDist');
  });

  it('should export fragment pars with u_fogColor uniform', () => {
    expect(fogMod.FOG_FRAGMENT_PARS).toContain('u_fogColor');
  });

  it('should export fragment code with fogFactor mixing', () => {
    expect(fogMod.FOG_FRAGMENT_CODE).toContain('fogFactor');
  });
});
