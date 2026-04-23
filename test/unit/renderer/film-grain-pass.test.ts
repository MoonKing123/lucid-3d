import { describe, it, expect } from 'vitest';
import { FilmGrainPass, PostProcessor } from '../../../src/renderer/post-process';

describe('FilmGrainPass', () => {
  it('默认参数：intensity=0.15, time=0', () => {
    const p = new FilmGrainPass();
    expect(p.intensity).toBe(0.15);
    expect(p.time).toBe(0);
  });

  it('可自定义两参数', () => {
    const p = new FilmGrainPass({ intensity: 0.3, time: 5.0 });
    expect(p.intensity).toBe(0.3);
    expect(p.time).toBe(5.0);
  });

  it('name 固定为 film-grain', () => {
    expect(new FilmGrainPass().name).toBe('film-grain');
  });

  it('enabled 默认 true，可设置', () => {
    const p = new FilmGrainPass();
    expect(p.enabled).toBe(true);
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('intensity 超出 [0, 1] 抛错', () => {
    expect(() => new FilmGrainPass({ intensity: -0.1 })).toThrow();
    expect(() => new FilmGrainPass({ intensity: 1.5 })).toThrow();
  });

  it('time < 0 抛错', () => {
    expect(() => new FilmGrainPass({ time: -1 })).toThrow();
  });

  it('intensity=0 / intensity=1 / time=0 边界值合法', () => {
    expect(() => new FilmGrainPass({ intensity: 0, time: 0 })).not.toThrow();
    expect(() => new FilmGrainPass({ intensity: 1, time: 0 })).not.toThrow();
  });

  it('非 finite 参数抛错', () => {
    expect(() => new FilmGrainPass({ intensity: Number.NaN })).toThrow();
    expect(() => new FilmGrainPass({ time: Number.POSITIVE_INFINITY })).toThrow();
  });

  it('两参数运行时可写', () => {
    const p = new FilmGrainPass();
    p.intensity = 0.5;
    p.time = 10.0;
    expect(p.intensity).toBe(0.5);
    expect(p.time).toBe(10.0);
  });

  it('getFragmentShader 返回含 u_texture/u_intensity/u_time 的 GLSL', () => {
    const src = new FilmGrainPass().getFragmentShader();
    expect(src).toContain('u_texture');
    expect(src).toContain('u_intensity');
    expect(src).toContain('u_time');
    expect(src).toContain('varying vec2 v_texCoord');
    expect(src).toMatch(/texture2D\s*\(/);
    // 伪随机：应含 fract + sin + dot
    expect(src).toMatch(/fract/);
  });

  it('可接入 PostProcessor', () => {
    const pp = new PostProcessor({ width: 256, height: 256 });
    const pass = new FilmGrainPass();
    pp.addPass(pass);
    expect(pp.passes).toContain(pass);
    expect(pp.passes.find(p => p.name === 'film-grain')).toBe(pass);
  });
});
