import { describe, it, expect } from 'vitest';
import { ContrastPass } from '../../../src/renderer/post-process';

describe('ContrastPass', () => {
  it('默认构造 contrast=1.0, midpoint=0.5, enabled=true, name=contrast', () => {
    const pass = new ContrastPass();
    expect(pass.contrast).toBe(1.0);
    expect(pass.midpoint).toBe(0.5);
    expect(pass.enabled).toBe(true);
    expect(pass.name).toBe('contrast');
  });

  it('构造器可传入自定义 contrast', () => {
    const pass = new ContrastPass({ contrast: 1.5 });
    expect(pass.contrast).toBe(1.5);
  });

  it('构造器可传入自定义 midpoint', () => {
    const pass = new ContrastPass({ midpoint: 0.3 });
    expect(pass.midpoint).toBe(0.3);
  });

  it('contrast < 0 抛错', () => {
    expect(() => new ContrastPass({ contrast: -0.1 })).toThrow();
  });

  it('contrast > 3 抛错', () => {
    expect(() => new ContrastPass({ contrast: 3.5 })).toThrow();
  });

  it('midpoint < 0 抛错', () => {
    expect(() => new ContrastPass({ midpoint: -0.1 })).toThrow();
  });

  it('midpoint > 1 抛错', () => {
    expect(() => new ContrastPass({ midpoint: 1.5 })).toThrow();
  });

  it('contrast 边界 0 和 3 合法', () => {
    expect(() => new ContrastPass({ contrast: 0 })).not.toThrow();
    expect(() => new ContrastPass({ contrast: 3 })).not.toThrow();
  });

  it('midpoint 边界 0 和 1 合法', () => {
    expect(() => new ContrastPass({ midpoint: 0 })).not.toThrow();
    expect(() => new ContrastPass({ midpoint: 1 })).not.toThrow();
  });

  it('getFragmentShader 返回包含 contrast/midpoint 公式的 GLSL', () => {
    const pass = new ContrastPass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('u_contrast');
    expect(shader).toContain('u_midpoint');
    expect(shader).toContain('u_texture');
    expect(shader).toContain('v_texCoord');
    expect(shader).toContain('clamp');
  });
});
