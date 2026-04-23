import { describe, it, expect } from 'vitest';
import { VignettePass, PostProcessor, BloomPass } from '../../../src/renderer/post-process';

describe('VignettePass', () => {
  it('默认参数：inner=0.4, outer=0.8, intensity=0.6', () => {
    const p = new VignettePass();
    expect(p.innerRadius).toBe(0.4);
    expect(p.outerRadius).toBe(0.8);
    expect(p.intensity).toBe(0.6);
  });

  it('可自定义三参数', () => {
    const p = new VignettePass({ innerRadius: 0.2, outerRadius: 0.9, intensity: 1.0 });
    expect(p.innerRadius).toBe(0.2);
    expect(p.outerRadius).toBe(0.9);
    expect(p.intensity).toBe(1.0);
  });

  it('innerRadius >= outerRadius 抛错', () => {
    expect(() => new VignettePass({ innerRadius: 0.8, outerRadius: 0.4 })).toThrow();
    expect(() => new VignettePass({ innerRadius: 0.5, outerRadius: 0.5 })).toThrow();
  });

  it('intensity 超出 [0, 1] 抛错', () => {
    expect(() => new VignettePass({ intensity: -0.1 })).toThrow();
    expect(() => new VignettePass({ intensity: 1.5 })).toThrow();
  });

  it('intensity=0 / intensity=1 边界值合法', () => {
    expect(() => new VignettePass({ intensity: 0 })).not.toThrow();
    expect(() => new VignettePass({ intensity: 1 })).not.toThrow();
  });

  it('三参数运行时可写', () => {
    const p = new VignettePass();
    p.innerRadius = 0.3;
    p.outerRadius = 0.7;
    p.intensity = 0.8;
    expect(p.innerRadius).toBe(0.3);
    expect(p.outerRadius).toBe(0.7);
    expect(p.intensity).toBe(0.8);
  });

  it('fragment shader 包含必需 uniforms', () => {
    const p = new VignettePass();
    const fs = p.getFragmentShader();
    expect(fs).toMatch(/uniform\s+float\s+u_innerRadius/);
    expect(fs).toMatch(/uniform\s+float\s+u_outerRadius/);
    expect(fs).toMatch(/uniform\s+float\s+u_intensity/);
  });

  it('fragment shader 使用 smoothstep + distance 数学', () => {
    const p = new VignettePass();
    const fs = p.getFragmentShader();
    expect(fs).toMatch(/distance\s*\(/);
    expect(fs).toMatch(/smoothstep\s*\(/);
  });

  it('VignettePass 实现 EffectPass 接口（duck typing）', () => {
    const p = new VignettePass();
    expect(typeof p.apply).toBe('function');
  });

  it('PostProcessor 可串联 Bloom + Vignette 链', () => {
    const proc = new PostProcessor({ width: 800, height: 600 });
    proc.addPass(new BloomPass());
    proc.addPass(new VignettePass({ intensity: 0.7 }));
    expect(proc.passes.length).toBe(2);
    expect(proc.passes[1]).toBeInstanceOf(VignettePass);
  });
});
