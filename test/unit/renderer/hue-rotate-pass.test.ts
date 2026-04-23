import { describe, it, expect } from 'vitest';
import { HueRotatePass } from '../../../src/renderer/post-process';

describe('HueRotatePass', () => {
  it('默认参数构造', () => {
    const pass = new HueRotatePass();
    expect(pass.name).toBe('hueRotate');
    expect(pass.enabled).toBe(true);
    expect(pass.angle).toBe(0);
    expect(pass.saturation).toBe(1);
  });

  it('自定义参数构造', () => {
    const pass = new HueRotatePass({ angle: Math.PI, saturation: 0.5 });
    expect(pass.angle).toBeCloseTo(Math.PI, 5);
    expect(pass.saturation).toBe(0.5);
  });

  it('angle 超出 [-2π, 2π] 抛错', () => {
    expect(() => new HueRotatePass({ angle: -7 })).toThrow();
    expect(() => new HueRotatePass({ angle: 7 })).toThrow();
  });

  it('angle 边界值通过', () => {
    expect(() => new HueRotatePass({ angle: -Math.PI * 2 })).not.toThrow();
    expect(() => new HueRotatePass({ angle: Math.PI * 2 })).not.toThrow();
  });

  it('saturation 超出 [0, 1] 抛错', () => {
    expect(() => new HueRotatePass({ saturation: -0.1 })).toThrow();
    expect(() => new HueRotatePass({ saturation: 1.1 })).toThrow();
  });

  it('saturation 边界值通过', () => {
    expect(() => new HueRotatePass({ saturation: 0 })).not.toThrow();
    expect(() => new HueRotatePass({ saturation: 1 })).not.toThrow();
  });

  it('getFragmentShader 返回包含关键 uniform 的 GLSL', () => {
    const pass = new HueRotatePass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('u_angle');
    expect(shader).toContain('u_saturation');
    expect(shader).toContain('u_texture');
    // YIQ 转换关键系数
    expect(shader).toContain('0.299');
    expect(shader).toContain('0.587');
  });

  it('可写属性被修改后生效', () => {
    const pass = new HueRotatePass();
    pass.angle = Math.PI / 2;
    pass.saturation = 0.3;
    expect(pass.angle).toBeCloseTo(Math.PI / 2, 5);
    expect(pass.saturation).toBe(0.3);
  });

  it('setUniforms 无 program 时不抛错', () => {
    const pass = new HueRotatePass();
    const mockGl = {
      getUniformLocation: () => null,
      uniform1f: () => {},
    } as unknown as WebGLRenderingContext;
    expect(() => pass.setUniforms(mockGl, {} as WebGLProgram)).not.toThrow();
  });

  it('支持 enabled 切换', () => {
    const pass = new HueRotatePass();
    pass.enabled = false;
    expect(pass.enabled).toBe(false);
  });
});
