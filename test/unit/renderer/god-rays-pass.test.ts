import { describe, it, expect } from 'vitest';
import { GodRaysPass } from '../../../src/renderer/post-process';

describe('GodRaysPass', () => {
  it('默认参数', () => {
    const p = new GodRaysPass();
    expect(p.name).toBe('godRays');
    expect(p.enabled).toBe(true);
    expect(p.usesDepth).toBe(true);
    expect(p.lightScreenPos).toEqual([0.5, 0.5]);
    expect(p.density).toBe(1.0);
    expect(p.decay).toBe(0.95);
    expect(p.weight).toBe(0.4);
    expect(p.samples).toBe(64);
    expect(p.exposure).toBe(0.8);
  });

  it('自定义参数', () => {
    const p = new GodRaysPass({
      lightScreenPos: [0.2, 0.8],
      density: 1.5,
      decay: 0.97,
      weight: 0.5,
      samples: 32,
      exposure: 1.2,
    });
    expect(p.lightScreenPos).toEqual([0.2, 0.8]);
    expect(p.density).toBe(1.5);
    expect(p.decay).toBe(0.97);
    expect(p.weight).toBe(0.5);
    expect(p.samples).toBe(32);
    expect(p.exposure).toBe(1.2);
  });

  it('lightScreenPos 必须是 2 元素数组', () => {
    expect(() => new GodRaysPass({ lightScreenPos: [0] as any })).toThrow(/lightScreenPos/i);
    expect(() => new GodRaysPass({ lightScreenPos: [0, 0, 0] as any })).toThrow(/lightScreenPos/i);
  });

  it('校验 density > 0', () => {
    expect(() => new GodRaysPass({ density: 0 })).toThrow(/density/i);
    expect(() => new GodRaysPass({ density: -1 })).toThrow(/density/i);
  });

  it('校验 decay 在 (0, 1]', () => {
    expect(() => new GodRaysPass({ decay: 0 })).toThrow(/decay/i);
    expect(() => new GodRaysPass({ decay: 1.01 })).toThrow(/decay/i);
    expect(() => new GodRaysPass({ decay: -0.1 })).toThrow(/decay/i);
    // 边界值 1 合法
    expect(() => new GodRaysPass({ decay: 1 })).not.toThrow();
  });

  it('校验 weight > 0', () => {
    expect(() => new GodRaysPass({ weight: 0 })).toThrow(/weight/i);
    expect(() => new GodRaysPass({ weight: -0.1 })).toThrow(/weight/i);
  });

  it('校验 samples 范围 [4, 128]', () => {
    expect(() => new GodRaysPass({ samples: 3 })).toThrow(/samples/i);
    expect(() => new GodRaysPass({ samples: 129 })).toThrow(/samples/i);
    expect(() => new GodRaysPass({ samples: 4 })).not.toThrow();
    expect(() => new GodRaysPass({ samples: 128 })).not.toThrow();
  });

  it('samples 必须是整数', () => {
    expect(() => new GodRaysPass({ samples: 32.5 })).toThrow(/samples/i);
  });

  it('校验 exposure > 0', () => {
    expect(() => new GodRaysPass({ exposure: 0 })).toThrow(/exposure/i);
    expect(() => new GodRaysPass({ exposure: -1 })).toThrow(/exposure/i);
  });

  it('getFragmentShader 包含必要的 uniform', () => {
    const p = new GodRaysPass();
    const src = p.getFragmentShader();
    expect(src).toContain('u_texture');
    expect(src).toContain('u_depthTexture');
    expect(src).toContain('u_lightScreenPos');
    expect(src).toContain('u_density');
    expect(src).toContain('u_decay');
    expect(src).toContain('u_weight');
    expect(src).toContain('u_exposure');
  });

  it('不同 samples 编译进不同 shader (#define SAMPLES)', () => {
    const a = new GodRaysPass({ samples: 32 }).getFragmentShader();
    const b = new GodRaysPass({ samples: 64 }).getFragmentShader();
    expect(a).not.toEqual(b);
    expect(a).toMatch(/SAMPLES\s+32/);
    expect(b).toMatch(/SAMPLES\s+64/);
  });

  it('修改运行时参数', () => {
    const p = new GodRaysPass();
    p.lightScreenPos = [0.3, 0.7];
    p.exposure = 1.5;
    expect(p.lightScreenPos).toEqual([0.3, 0.7]);
    expect(p.exposure).toBe(1.5);
  });

  it('enabled 默认 true 可关闭', () => {
    const p = new GodRaysPass();
    expect(p.enabled).toBe(true);
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('shader 包含遮挡判定逻辑（depth-based occlusion）', () => {
    const p = new GodRaysPass();
    const src = p.getFragmentShader();
    expect(src).toContain('texture2D(u_depthTexture');
    expect(src).toMatch(/step\s*\(/);
  });
});
