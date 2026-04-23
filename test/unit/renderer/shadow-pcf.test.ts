import { describe, it, expect } from 'vitest';
import { ShadowMap, SHADOW_FRAGMENT_CODE } from '../../../src/renderer/shadow-map';

describe('ShadowMap PCF Soft Shadow', () => {
  it('softness=0 默认硬阴影，单次 texture2D 采样', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024 });
    expect(sm.softness).toBe(0);
    const code = sm.getFragmentCode();
    const matches = code.match(/texture2D\(u_shadowMap/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('softness=1 启用 3x3 PCF，9 次采样', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024, softness: 1 });
    expect(sm.softness).toBe(1);
    const code = sm.getFragmentCode();
    const matches = code.match(/texture2D\(u_shadowMap/g) ?? [];
    expect(matches.length).toBe(9);
    expect(code).toMatch(/shadow\s*\/=\s*9\.0/);
  });

  it('softness=2 启用 5x5 PCF，25 次采样', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024, softness: 2 });
    expect(sm.softness).toBe(2);
    const code = sm.getFragmentCode();
    const matches = code.match(/texture2D\(u_shadowMap/g) ?? [];
    expect(matches.length).toBe(25);
    expect(code).toMatch(/shadow\s*\/=\s*25\.0/);
  });

  it('softness 大于 2 抛错', () => {
    expect(() => new ShadowMap({ width: 1024, height: 1024, softness: 3 as any })).toThrow();
  });

  it('softness>0 时片段代码包含 u_shadowMapSize uniform', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024, softness: 1 });
    expect(sm.getFragmentParsCode()).toMatch(/uniform\s+vec2\s+u_shadowMapSize/);
  });

  it('softness=0 时片段代码不包含 u_shadowMapSize uniform', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024, softness: 0 });
    expect(sm.getFragmentParsCode()).not.toMatch(/u_shadowMapSize/);
  });

  it('原有静态导出 SHADOW_FRAGMENT_CODE 保持向后兼容（硬阴影）', () => {
    const matches = SHADOW_FRAGMENT_CODE.match(/texture2D\(u_shadowMap/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('softness=2 GLSL 不含动态 for 循环（WebGL 1.0 兼容性）', () => {
    const sm = new ShadowMap({ width: 1024, height: 1024, softness: 2 });
    const code = sm.getFragmentCode();
    expect(code).not.toMatch(/for\s*\(\s*int\s+\w+\s*=\s*-?\w+\s*;\s*\w+\s*<\s*\w+\s*;/);
  });
});
