import { describe, it, expect } from 'vitest';
import { PixelatePass, PostProcessor } from '../../../src/renderer/post-process';

describe('PixelatePass', () => {
  it('默认参数：pixelSize=8', () => {
    const p = new PixelatePass();
    expect(p.pixelSize).toBe(8);
  });

  it('可自定义 pixelSize', () => {
    const p = new PixelatePass({ pixelSize: 16 });
    expect(p.pixelSize).toBe(16);
  });

  it('name 固定为 pixelate', () => {
    expect(new PixelatePass().name).toBe('pixelate');
  });

  it('enabled 默认 true，可设置', () => {
    const p = new PixelatePass();
    expect(p.enabled).toBe(true);
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('pixelSize < 1 抛错', () => {
    expect(() => new PixelatePass({ pixelSize: 0 })).toThrow();
    expect(() => new PixelatePass({ pixelSize: 0.5 })).toThrow();
    expect(() => new PixelatePass({ pixelSize: -5 })).toThrow();
  });

  it('pixelSize=1 边界值合法', () => {
    expect(() => new PixelatePass({ pixelSize: 1 })).not.toThrow();
  });

  it('非 finite 参数抛错', () => {
    expect(() => new PixelatePass({ pixelSize: Number.NaN })).toThrow();
    expect(() => new PixelatePass({ pixelSize: Number.POSITIVE_INFINITY })).toThrow();
  });

  it('pixelSize 运行时可写', () => {
    const p = new PixelatePass();
    p.pixelSize = 32;
    expect(p.pixelSize).toBe(32);
  });

  it('getFragmentShader 返回含 u_texture/u_pixelSize/u_texelSize 的 GLSL', () => {
    const src = new PixelatePass().getFragmentShader();
    expect(src).toContain('u_texture');
    expect(src).toContain('u_pixelSize');
    expect(src).toContain('u_texelSize');
    expect(src).toContain('varying vec2 v_texCoord');
    expect(src).toMatch(/texture2D\s*\(/);
    // 量化必须用 floor
    expect(src).toMatch(/floor/);
  });

  it('可接入 PostProcessor', () => {
    const pp = new PostProcessor({ width: 256, height: 256 });
    const pass = new PixelatePass();
    pp.addPass(pass);
    expect(pp.passes).toContain(pass);
    expect(pp.passes.find(p => p.name === 'pixelate')).toBe(pass);
  });
});
