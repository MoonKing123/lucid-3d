import { describe, it, expect } from 'vitest';
import { ScanlinePass } from '../../../src/renderer/post-process';

describe('ScanlinePass', () => {
  it('默认参数构造', () => {
    const pass = new ScanlinePass();
    expect(pass.name).toBe('scanline');
    expect(pass.enabled).toBe(true);
    expect(pass.intensity).toBe(0.3);
    expect(pass.density).toBe(1.0);
    expect(pass.speed).toBe(0);
    expect(pass.time).toBe(0);
  });

  it('自定义参数构造', () => {
    const pass = new ScanlinePass({ intensity: 0.5, density: 2, speed: 10, time: 1.5 });
    expect(pass.intensity).toBe(0.5);
    expect(pass.density).toBe(2);
    expect(pass.speed).toBe(10);
    expect(pass.time).toBe(1.5);
  });

  it('intensity 超出 [0, 1] 抛错', () => {
    expect(() => new ScanlinePass({ intensity: -0.1 })).toThrow();
    expect(() => new ScanlinePass({ intensity: 1.1 })).toThrow();
  });

  it('intensity 边界值通过', () => {
    expect(() => new ScanlinePass({ intensity: 0 })).not.toThrow();
    expect(() => new ScanlinePass({ intensity: 1 })).not.toThrow();
  });

  it('density 超出 [0.1, 10] 抛错', () => {
    expect(() => new ScanlinePass({ density: 0.05 })).toThrow();
    expect(() => new ScanlinePass({ density: 10.1 })).toThrow();
  });

  it('density 边界值通过', () => {
    expect(() => new ScanlinePass({ density: 0.1 })).not.toThrow();
    expect(() => new ScanlinePass({ density: 10 })).not.toThrow();
  });

  it('getFragmentShader 返回 GLSL 字符串', () => {
    const pass = new ScanlinePass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('precision mediump float');
    expect(shader).toContain('u_texture');
    expect(shader).toContain('u_intensity');
    expect(shader).toContain('u_density');
    expect(shader).toContain('u_speed');
    expect(shader).toContain('u_time');
  });

  it('可写属性被修改后生效', () => {
    const pass = new ScanlinePass();
    pass.intensity = 0.8;
    pass.density = 3;
    pass.time = 2.0;
    expect(pass.intensity).toBe(0.8);
    expect(pass.density).toBe(3);
    expect(pass.time).toBe(2.0);
  });

  it('setUniforms 无 program 时不抛错', () => {
    const pass = new ScanlinePass();
    const mockGl = {
      getUniformLocation: () => null,
      uniform1f: () => {},
    } as unknown as WebGLRenderingContext;
    expect(() => pass.setUniforms(mockGl, {} as WebGLProgram)).not.toThrow();
  });

  it('支持 enabled 切换', () => {
    const pass = new ScanlinePass();
    pass.enabled = false;
    expect(pass.enabled).toBe(false);
  });
});
