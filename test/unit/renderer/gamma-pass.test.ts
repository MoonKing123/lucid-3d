import { describe, it, expect } from 'vitest';
import { GammaPass } from '../../../src/renderer/post-process';

describe('GammaPass', () => {
  describe('构造器', () => {
    it('默认 gamma=2.2', () => {
      const pass = new GammaPass();
      expect(pass.gamma).toBeCloseTo(2.2, 6);
    });

    it('数字参数形式', () => {
      const pass = new GammaPass(2.4);
      expect(pass.gamma).toBeCloseTo(2.4, 6);
    });

    it('对象参数形式', () => {
      const pass = new GammaPass({ gamma: 1.8 });
      expect(pass.gamma).toBeCloseTo(1.8, 6);
    });

    it('gamma=1.0 有效（禁用校正）', () => {
      expect(() => new GammaPass(1.0)).not.toThrow();
    });

    it('gamma 范围校验：正越界抛错', () => {
      expect(() => new GammaPass(5.1)).toThrow();
    });

    it('gamma 范围校验：太小抛错', () => {
      expect(() => new GammaPass(0.05)).toThrow();
    });

    it('gamma 范围校验：负值抛错', () => {
      expect(() => new GammaPass(-1)).toThrow();
    });

    it('NaN 抛错', () => {
      expect(() => new GammaPass(NaN)).toThrow();
    });
  });

  describe('EffectPass 接口', () => {
    it('name 为 gamma', () => {
      expect(new GammaPass().name).toBe('gamma');
    });

    it('默认 enabled', () => {
      expect(new GammaPass().enabled).toBe(true);
    });

    it('片元着色器使用 pow 做 gamma 校正', () => {
      const pass = new GammaPass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('pow');
      expect(shader).toContain('u_invGamma');
      expect(shader).toContain('u_texture');
    });
  });
});
