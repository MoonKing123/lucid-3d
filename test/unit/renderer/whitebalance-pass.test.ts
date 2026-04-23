import { describe, it, expect } from 'vitest';
import { WhiteBalancePass } from '../../../src/renderer/post-process';

describe('WhiteBalancePass', () => {
  describe('构造器', () => {
    it('默认 temperature=6500, tint=0', () => {
      const pass = new WhiteBalancePass();
      expect(pass.temperature).toBe(6500);
      expect(pass.tint).toBe(0);
    });

    it('对象参数形式', () => {
      const pass = new WhiteBalancePass({ temperature: 3500, tint: 0.2 });
      expect(pass.temperature).toBe(3500);
      expect(pass.tint).toBeCloseTo(0.2, 6);
    });

    it('temperature 范围校验：正越界抛错', () => {
      expect(() => new WhiteBalancePass({ temperature: 25000 })).toThrow();
    });

    it('temperature 范围校验：太小抛错', () => {
      expect(() => new WhiteBalancePass({ temperature: 500 })).toThrow();
    });

    it('tint 范围校验：正越界抛错', () => {
      expect(() => new WhiteBalancePass({ tint: 1.5 })).toThrow();
    });

    it('tint 范围校验：负越界抛错', () => {
      expect(() => new WhiteBalancePass({ tint: -1.5 })).toThrow();
    });

    it('temperature 或 tint 为 NaN 抛错', () => {
      expect(() => new WhiteBalancePass({ temperature: NaN })).toThrow();
      expect(() => new WhiteBalancePass({ tint: NaN })).toThrow();
    });

    it('边界值有效', () => {
      expect(() => new WhiteBalancePass({ temperature: 1000, tint: -1 })).not.toThrow();
      expect(() => new WhiteBalancePass({ temperature: 20000, tint: 1 })).not.toThrow();
    });
  });

  describe('EffectPass 接口', () => {
    it('name 为 whitebalance', () => {
      expect(new WhiteBalancePass().name).toBe('whitebalance');
    });

    it('默认 enabled', () => {
      expect(new WhiteBalancePass().enabled).toBe(true);
    });

    it('片元着色器包含 u_balanceMul + u_tint', () => {
      const pass = new WhiteBalancePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_balanceMul');
      expect(shader).toContain('u_tint');
      expect(shader).toContain('u_texture');
    });
  });
});
