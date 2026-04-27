import { describe, it, expect } from 'vitest';
import { AtmosphericPerspectivePass } from '../../../src/renderer/post-process';

describe('AtmosphericPerspectivePass', () => {
  it('默认参数', () => {
    const p = new AtmosphericPerspectivePass();
    expect(p.name).toBe('atmosphericPerspective');
    expect(p.enabled).toBe(true);
    expect(p.usesDepth).toBe(true);
    expect(p.skyColor).toEqual([0.6, 0.75, 0.9]);
    expect(p.density).toBe(0.02);
    expect(p.desaturation).toBe(0.5);
    expect(p.near).toBe(5);
    expect(p.far).toBe(100);
  });

  it('自定义参数', () => {
    const p = new AtmosphericPerspectivePass({
      skyColor: [1, 0.5, 0.5],
      density: 0.1,
      desaturation: 0.8,
      near: 10,
      far: 200,
    });
    expect(p.skyColor).toEqual([1, 0.5, 0.5]);
    expect(p.density).toBe(0.1);
    expect(p.desaturation).toBe(0.8);
    expect(p.near).toBe(10);
    expect(p.far).toBe(200);
  });

  it('校验 skyColor 必须是 3 元素数组', () => {
    expect(() => new AtmosphericPerspectivePass({ skyColor: [1, 0] as any })).toThrow(/skyColor/i);
    expect(() => new AtmosphericPerspectivePass({ skyColor: [1, 0, 0, 0] as any })).toThrow(/skyColor/i);
  });

  it('校验 density > 0', () => {
    expect(() => new AtmosphericPerspectivePass({ density: 0 })).toThrow(/density/i);
    expect(() => new AtmosphericPerspectivePass({ density: -0.01 })).toThrow(/density/i);
    expect(() => new AtmosphericPerspectivePass({ density: NaN })).toThrow(/density/i);
  });

  it('校验 desaturation 在 [0, 1]', () => {
    expect(() => new AtmosphericPerspectivePass({ desaturation: -0.1 })).toThrow(/desaturation/i);
    expect(() => new AtmosphericPerspectivePass({ desaturation: 1.01 })).toThrow(/desaturation/i);
    // 边界值合法
    expect(() => new AtmosphericPerspectivePass({ desaturation: 0 })).not.toThrow();
    expect(() => new AtmosphericPerspectivePass({ desaturation: 1 })).not.toThrow();
  });

  it('校验 near >= 0', () => {
    expect(() => new AtmosphericPerspectivePass({ near: -1 })).toThrow(/near/i);
    expect(() => new AtmosphericPerspectivePass({ near: 0 })).not.toThrow();
  });

  it('校验 far > near', () => {
    expect(() => new AtmosphericPerspectivePass({ near: 50, far: 50 })).toThrow(/far/i);
    expect(() => new AtmosphericPerspectivePass({ near: 50, far: 30 })).toThrow(/far/i);
  });

  it('getFragmentShader 包含必要的 uniform', () => {
    const p = new AtmosphericPerspectivePass();
    const src = p.getFragmentShader();
    expect(src).toContain('u_texture');
    expect(src).toContain('u_depthTexture');
    expect(src).toContain('u_skyColor');
    expect(src).toContain('u_density');
    expect(src).toContain('u_desaturation');
    expect(src).toContain('u_near');
    expect(src).toContain('u_far');
    expect(src).toContain('linearizeDepth');
  });

  it('shader 包含 luma 饱和度计算', () => {
    const p = new AtmosphericPerspectivePass();
    const src = p.getFragmentShader();
    // Rec. 709 luma 系数 0.299/0.587/0.114
    expect(src).toMatch(/0\.299/);
    expect(src).toMatch(/0\.587/);
    expect(src).toMatch(/0\.114/);
  });

  it('shader 使用 mix 做颜色混合', () => {
    const p = new AtmosphericPerspectivePass();
    const src = p.getFragmentShader();
    expect(src).toContain('mix(');
  });

  it('修改运行时参数', () => {
    const p = new AtmosphericPerspectivePass();
    p.skyColor = [0.5, 0.5, 0.5];
    p.density = 0.05;
    p.desaturation = 0.3;
    expect(p.skyColor).toEqual([0.5, 0.5, 0.5]);
    expect(p.density).toBe(0.05);
    expect(p.desaturation).toBe(0.3);
  });

  it('enabled 默认 true 可关闭', () => {
    const p = new AtmosphericPerspectivePass();
    expect(p.enabled).toBe(true);
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('alpha 通道在 shader 中保持原值', () => {
    const p = new AtmosphericPerspectivePass();
    const src = p.getFragmentShader();
    // 应有 src.a 或 source alpha 的引用
    expect(src).toMatch(/\.a/);
  });
});
