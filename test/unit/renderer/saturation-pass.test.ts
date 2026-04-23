import { describe, it, expect } from 'vitest';
import { SaturationPass } from '../../../src/renderer/post-process';

describe('SaturationPass', () => {
  it('默认构造 saturation=1.0, enabled=true, name=saturation', () => {
    const pass = new SaturationPass();
    expect(pass.saturation).toBe(1.0);
    expect(pass.enabled).toBe(true);
    expect(pass.name).toBe('saturation');
  });

  it('构造器可传入自定义 saturation', () => {
    const pass = new SaturationPass({ saturation: 0.5 });
    expect(pass.saturation).toBe(0.5);
  });

  it('saturation < 0 抛错', () => {
    expect(() => new SaturationPass({ saturation: -0.1 })).toThrow();
  });

  it('saturation > 3 抛错', () => {
    expect(() => new SaturationPass({ saturation: 3.5 })).toThrow();
  });

  it('saturation = 0 合法（灰度）', () => {
    expect(() => new SaturationPass({ saturation: 0 })).not.toThrow();
  });

  it('saturation = 2 合法（过饱和）', () => {
    expect(() => new SaturationPass({ saturation: 2 })).not.toThrow();
  });

  it('getFragmentShader 返回包含 Rec. 709 luma 权重的 GLSL', () => {
    const pass = new SaturationPass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('0.2126');
    expect(shader).toContain('0.7152');
    expect(shader).toContain('0.0722');
    expect(shader).toContain('u_saturation');
    expect(shader).toContain('mix');
  });

  it('enabled 可切换为 false', () => {
    const pass = new SaturationPass();
    pass.enabled = false;
    expect(pass.enabled).toBe(false);
  });
});
