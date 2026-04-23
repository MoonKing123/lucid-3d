import { describe, it, expect, vi } from 'vitest';
import { TonemapPass, PostProcessor, GrayscalePass, BloomPass } from '../../../src/renderer/post-process';

describe('TonemapPass', () => {
  it('默认 mode=aces, exposure=1.0', () => {
    const p = new TonemapPass();
    expect(p.mode).toBe('aces');
    expect(p.exposure).toBe(1.0);
  });

  it('支持 mode=reinhard', () => {
    const p = new TonemapPass({ mode: 'reinhard' });
    expect(p.mode).toBe('reinhard');
  });

  it('exposure 可自定义', () => {
    const p = new TonemapPass({ exposure: 1.5 });
    expect(p.exposure).toBe(1.5);
  });

  it('aces 模式 fragment shader 包含 ACES 系数', () => {
    const p = new TonemapPass({ mode: 'aces' });
    const fs = p.getFragmentShader();
    expect(fs).toMatch(/2\.51/);
    expect(fs).toMatch(/0\.03/);
    expect(fs).toMatch(/2\.43/);
    expect(fs).toMatch(/0\.59/);
    expect(fs).toMatch(/0\.14/);
  });

  it('reinhard 模式 fragment shader 包含 color/(color+1) 公式', () => {
    const p = new TonemapPass({ mode: 'reinhard' });
    const fs = p.getFragmentShader();
    expect(fs).toMatch(/color\s*\/\s*\(\s*color\s*\+\s*(vec3\(1\.0\)|1\.0)\s*\)/);
  });

  it('fragment shader 包含 exposure uniform', () => {
    const p = new TonemapPass();
    const fs = p.getFragmentShader();
    expect(fs).toMatch(/uniform\s+float\s+u_exposure/);
  });

  it('exposure 修改可被外部读取（用于 dynamic exposure）', () => {
    const p = new TonemapPass({ exposure: 1.0 });
    p.exposure = 2.5;
    expect(p.exposure).toBe(2.5);
  });

  it('TonemapPass 实现 EffectPass 接口（duck typing）', () => {
    const p = new TonemapPass();
    expect(typeof p.apply).toBe('function');
  });

  it('不破坏 GrayscalePass / BloomPass 行为', () => {
    const gp = new GrayscalePass();
    const bp = new BloomPass({ threshold: 0.8, intensity: 1.2 });
    expect(typeof gp.apply).toBe('function');
    expect(typeof bp.apply).toBe('function');
  });

  it('PostProcessor 可串联 Bloom + Tonemap 链', () => {
    const proc = new PostProcessor({ width: 800, height: 600 });
    proc.addPass(new BloomPass());
    proc.addPass(new TonemapPass({ mode: 'aces', exposure: 1.2 }));
    expect(proc.passes.length).toBe(2);
    expect(proc.passes[1]).toBeInstanceOf(TonemapPass);
  });
});
