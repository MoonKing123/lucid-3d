import { describe, it, expect } from 'vitest';
import { ExposurePass } from '../../../src/renderer/post-process';

describe('ExposurePass', () => {
  describe('构造器', () => {
    it('默认 ev=0', () => {
      const pass = new ExposurePass();
      expect(pass.ev).toBe(0);
    });

    it('数字参数形式', () => {
      const pass = new ExposurePass(1.5);
      expect(pass.ev).toBe(1.5);
    });

    it('对象参数形式', () => {
      const pass = new ExposurePass({ ev: -2 });
      expect(pass.ev).toBe(-2);
    });

    it('ev 范围校验：正越界抛错', () => {
      expect(() => new ExposurePass(6)).toThrow();
    });

    it('ev 范围校验：负越界抛错', () => {
      expect(() => new ExposurePass(-6)).toThrow();
    });

    it('ev 范围校验：边界值有效', () => {
      expect(() => new ExposurePass(-5)).not.toThrow();
      expect(() => new ExposurePass(5)).not.toThrow();
    });

    it('NaN 抛错', () => {
      expect(() => new ExposurePass(NaN)).toThrow();
    });
  });

  describe('EffectPass 接口', () => {
    it('name 为 exposure', () => {
      expect(new ExposurePass().name).toBe('exposure');
    });

    it('默认 enabled', () => {
      expect(new ExposurePass().enabled).toBe(true);
    });

    it('片元着色器包含 u_exposure', () => {
      const pass = new ExposurePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_exposure');
      expect(shader).toContain('u_texture');
      expect(shader).toContain('v_texCoord');
    });
  });
});
