import { describe, it, expect } from 'vitest';
import { LensDistortionPass } from '../../../src/renderer/post-process';

describe('LensDistortionPass', () => {
  it('默认参数构造', () => {
    const pass = new LensDistortionPass();
    expect(pass.name).toBe('lensDistortion');
    expect(pass.enabled).toBe(true);
    expect(pass.strength).toBe(0.3);
    expect(pass.k2).toBe(0);
    expect(pass.chromaticAberration).toBe(0);
  });

  it('自定义参数构造', () => {
    const pass = new LensDistortionPass({ strength: -0.5, k2: 0.2, chromaticAberration: 0.01 });
    expect(pass.strength).toBe(-0.5);
    expect(pass.k2).toBe(0.2);
    expect(pass.chromaticAberration).toBe(0.01);
  });

  it('strength 超出 [-1, 1] 抛错', () => {
    expect(() => new LensDistortionPass({ strength: -1.1 })).toThrow();
    expect(() => new LensDistortionPass({ strength: 1.1 })).toThrow();
  });

  it('strength 边界值通过', () => {
    expect(() => new LensDistortionPass({ strength: -1 })).not.toThrow();
    expect(() => new LensDistortionPass({ strength: 1 })).not.toThrow();
  });

  it('k2 超出 [-1, 1] 抛错', () => {
    expect(() => new LensDistortionPass({ k2: -1.5 })).toThrow();
    expect(() => new LensDistortionPass({ k2: 2 })).toThrow();
  });

  it('chromaticAberration 超出 [0, 0.05] 抛错', () => {
    expect(() => new LensDistortionPass({ chromaticAberration: -0.01 })).toThrow();
    expect(() => new LensDistortionPass({ chromaticAberration: 0.1 })).toThrow();
  });

  it('chromaticAberration 边界值通过', () => {
    expect(() => new LensDistortionPass({ chromaticAberration: 0 })).not.toThrow();
    expect(() => new LensDistortionPass({ chromaticAberration: 0.05 })).not.toThrow();
  });

  it('getFragmentShader 返回包含关键 uniform 的 GLSL', () => {
    const pass = new LensDistortionPass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('u_strength');
    expect(shader).toContain('u_k2');
    expect(shader).toContain('u_chromaticAberration');
    expect(shader).toContain('u_texture');
  });

  it('可写属性被修改后生效', () => {
    const pass = new LensDistortionPass();
    pass.strength = -0.8;
    pass.chromaticAberration = 0.03;
    expect(pass.strength).toBe(-0.8);
    expect(pass.chromaticAberration).toBe(0.03);
  });

  it('setUniforms 无 program 时不抛错', () => {
    const pass = new LensDistortionPass();
    const mockGl = {
      getUniformLocation: () => null,
      uniform1f: () => {},
    } as unknown as WebGLRenderingContext;
    expect(() => pass.setUniforms(mockGl, {} as WebGLProgram)).not.toThrow();
  });
});
