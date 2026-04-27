import { describe, it, expect } from 'vitest';
import { DepthFogPass } from '../../../src/renderer/post-process';

describe('DepthFogPass', () => {
  it('默认参数', () => {
    const p = new DepthFogPass();
    expect(p.name).toBe('depthFog');
    expect(p.enabled).toBe(true);
    expect(p.usesDepth).toBe(true);
    expect(p.color).toEqual([0.7, 0.7, 0.8]);
    expect(p.density).toBe(1);
    expect(p.near).toBe(1);
    expect(p.far).toBe(50);
    expect(p.mode).toBe('exp');
  });

  it('自定义参数', () => {
    const p = new DepthFogPass({
      color: [1, 0, 0],
      density: 0.5,
      near: 5,
      far: 100,
      mode: 'linear',
    });
    expect(p.color).toEqual([1, 0, 0]);
    expect(p.density).toBe(0.5);
    expect(p.near).toBe(5);
    expect(p.far).toBe(100);
    expect(p.mode).toBe('linear');
  });

  it('校验 density > 0', () => {
    expect(() => new DepthFogPass({ density: 0 })).toThrow(/density/i);
    expect(() => new DepthFogPass({ density: -1 })).toThrow(/density/i);
    expect(() => new DepthFogPass({ density: NaN })).toThrow(/density/i);
  });

  it('校验 near > 0', () => {
    expect(() => new DepthFogPass({ near: 0 })).toThrow(/near/i);
    expect(() => new DepthFogPass({ near: -0.1 })).toThrow(/near/i);
  });

  it('校验 far > near', () => {
    expect(() => new DepthFogPass({ near: 10, far: 5 })).toThrow(/far/i);
    expect(() => new DepthFogPass({ near: 10, far: 10 })).toThrow(/far/i);
  });

  it('校验 mode 必须是合法值', () => {
    expect(() => new DepthFogPass({ mode: 'foo' as any })).toThrow(/mode/i);
  });

  it('校验 color 必须是 3 元素数组', () => {
    expect(() => new DepthFogPass({ color: [1, 0] as any })).toThrow(/color/i);
    expect(() => new DepthFogPass({ color: [1, 0, 0, 0] as any })).toThrow(/color/i);
  });

  it('getFragmentShader 返回有效 GLSL 字符串', () => {
    const p = new DepthFogPass();
    const src = p.getFragmentShader();
    expect(src).toContain('precision');
    expect(src).toContain('u_texture');
    expect(src).toContain('u_depthTexture');
    expect(src).toContain('linearizeDepth');
    expect(src).toContain('mix(');
  });

  it('linear/exp/exp2 三种 mode 各产生不同 GLSL', () => {
    const linear = new DepthFogPass({ mode: 'linear' }).getFragmentShader();
    const exp = new DepthFogPass({ mode: 'exp' }).getFragmentShader();
    const exp2 = new DepthFogPass({ mode: 'exp2' }).getFragmentShader();
    expect(linear).not.toEqual(exp);
    expect(exp).not.toEqual(exp2);
    expect(linear).not.toEqual(exp2);
  });

  it('修改 enabled 字段', () => {
    const p = new DepthFogPass();
    p.enabled = false;
    expect(p.enabled).toBe(false);
  });

  it('修改运行时参数', () => {
    const p = new DepthFogPass();
    p.density = 2.5;
    p.color = [0.1, 0.2, 0.3];
    expect(p.density).toBe(2.5);
    expect(p.color).toEqual([0.1, 0.2, 0.3]);
  });
});
