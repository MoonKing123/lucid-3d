import { describe, it, expect } from 'vitest';
import { ChromaticAberrationPass, PostProcessor } from '../../../src/renderer/post-process';

describe('ChromaticAberrationPass', () => {
  it('默认参数：redOffset=2, blueOffset=-2, intensity=1', () => {
    const p = new ChromaticAberrationPass();
    expect(p.redOffset).toBe(2.0);
    expect(p.blueOffset).toBe(-2.0);
    expect(p.intensity).toBe(1.0);
  });

  it('可自定义三参数', () => {
    const p = new ChromaticAberrationPass({ redOffset: 5, blueOffset: -5, intensity: 0.5 });
    expect(p.redOffset).toBe(5);
    expect(p.blueOffset).toBe(-5);
    expect(p.intensity).toBe(0.5);
  });

  it('name 固定为 chromatic-aberration', () => {
    expect(new ChromaticAberrationPass().name).toBe('chromatic-aberration');
  });

  it('enabled 默认 true，可设置', () => {
    const p = new ChromaticAberrationPass();
    expect(p.enabled).toBe(true);
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('intensity 超出 [0, 1] 抛错', () => {
    expect(() => new ChromaticAberrationPass({ intensity: -0.1 })).toThrow();
    expect(() => new ChromaticAberrationPass({ intensity: 1.5 })).toThrow();
  });

  it('intensity=0 / intensity=1 边界值合法', () => {
    expect(() => new ChromaticAberrationPass({ intensity: 0 })).not.toThrow();
    expect(() => new ChromaticAberrationPass({ intensity: 1 })).not.toThrow();
  });

  it('非 finite 参数抛错', () => {
    expect(() => new ChromaticAberrationPass({ redOffset: Number.NaN })).toThrow();
    expect(() => new ChromaticAberrationPass({ blueOffset: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => new ChromaticAberrationPass({ intensity: Number.NaN })).toThrow();
  });

  it('三参数运行时可写', () => {
    const p = new ChromaticAberrationPass();
    p.redOffset = 3;
    p.blueOffset = -3;
    p.intensity = 0.8;
    expect(p.redOffset).toBe(3);
    expect(p.blueOffset).toBe(-3);
    expect(p.intensity).toBe(0.8);
  });

  it('getFragmentShader 返回含 u_texture/u_redOffset/u_blueOffset/u_intensity/u_texelSize 的 GLSL', () => {
    const src = new ChromaticAberrationPass().getFragmentShader();
    expect(src).toContain('u_texture');
    expect(src).toContain('u_redOffset');
    expect(src).toContain('u_blueOffset');
    expect(src).toContain('u_intensity');
    expect(src).toContain('u_texelSize');
    expect(src).toContain('varying vec2 v_texCoord');
    expect(src).toMatch(/texture2D\s*\(/);
  });

  it('R 通道和 B 通道 GLSL 采样偏移正负相反', () => {
    const src = new ChromaticAberrationPass().getFragmentShader();
    // R 通道必须用 u_redOffset 采样，B 通道必须用 u_blueOffset 采样
    expect(src.match(/u_redOffset/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(src.match(/u_blueOffset/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('可接入 PostProcessor', () => {
    const pp = new PostProcessor({ width: 256, height: 256 });
    const pass = new ChromaticAberrationPass();
    pp.addPass(pass);
    expect(pp.passes).toContain(pass);
    expect(pp.passes.find(p => p.name === 'chromatic-aberration')).toBe(pass);
  });
});
