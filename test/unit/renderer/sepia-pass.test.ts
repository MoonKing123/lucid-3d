import { describe, it, expect } from 'vitest';
import { SepiaPass } from '../../../src/renderer/post-process';

describe('SepiaPass', () => {
  it('默认构造 intensity=1.0, enabled=true, name=sepia', () => {
    const pass = new SepiaPass();
    expect(pass.intensity).toBe(1.0);
    expect(pass.enabled).toBe(true);
    expect(pass.name).toBe('sepia');
  });

  it('构造器可传入自定义 intensity', () => {
    const pass = new SepiaPass({ intensity: 0.5 });
    expect(pass.intensity).toBe(0.5);
  });

  it('intensity < 0 抛错', () => {
    expect(() => new SepiaPass({ intensity: -0.1 })).toThrow();
  });

  it('intensity > 1 抛错', () => {
    expect(() => new SepiaPass({ intensity: 1.5 })).toThrow();
  });

  it('intensity 边界 0 和 1 合法', () => {
    expect(() => new SepiaPass({ intensity: 0 })).not.toThrow();
    expect(() => new SepiaPass({ intensity: 1 })).not.toThrow();
  });

  it('getFragmentShader 返回包含 sepia 矩阵常量的 GLSL', () => {
    const pass = new SepiaPass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('0.393');
    expect(shader).toContain('0.769');
    expect(shader).toContain('u_intensity');
    expect(shader).toContain('u_texture');
    expect(shader).toContain('v_texCoord');
  });

  it('getFragmentShader 用 mix 融合原色和 sepia', () => {
    const pass = new SepiaPass();
    expect(pass.getFragmentShader()).toContain('mix');
  });

  it('enabled 可切换为 false', () => {
    const pass = new SepiaPass();
    pass.enabled = false;
    expect(pass.enabled).toBe(false);
  });
});
