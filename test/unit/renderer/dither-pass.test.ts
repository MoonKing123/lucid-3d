import { describe, it, expect } from 'vitest';
import { DitherPass } from '../../../src/renderer/post-process';

describe('DitherPass', () => {
  describe('constructor defaults', () => {
    it('should default matrix to "bayer4x4"', () => {
      const pass = new DitherPass();
      expect(pass.matrix).toBe('bayer4x4');
    });

    it('should default levels to 4', () => {
      const pass = new DitherPass();
      expect(pass.levels).toBe(4);
    });

    it('should default intensity to 1', () => {
      const pass = new DitherPass();
      expect(pass.intensity).toBe(1);
    });

    it('should have name "dither" and enabled=true', () => {
      const pass = new DitherPass();
      expect(pass.name).toBe('dither');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should accept bayer8x8', () => {
      const pass = new DitherPass({ matrix: 'bayer8x8' });
      expect(pass.matrix).toBe('bayer8x8');
    });

    it('should accept custom levels', () => {
      const pass = new DitherPass({ levels: 8 });
      expect(pass.levels).toBe(8);
    });

    it('should accept boundary levels', () => {
      expect(new DitherPass({ levels: 2 }).levels).toBe(2);
      expect(new DitherPass({ levels: 16 }).levels).toBe(16);
    });

    it('should accept custom intensity', () => {
      const pass = new DitherPass({ intensity: 0.5 });
      expect(pass.intensity).toBe(0.5);
    });
  });

  describe('parameter validation', () => {
    it('should throw on unknown matrix', () => {
      expect(() => new DitherPass({ matrix: 'bayer16x16' as any })).toThrow();
      expect(() => new DitherPass({ matrix: '' as any })).toThrow();
    });

    it('should throw when levels < 2', () => {
      expect(() => new DitherPass({ levels: 1 })).toThrow();
      expect(() => new DitherPass({ levels: 0 })).toThrow();
    });

    it('should throw when levels > 16', () => {
      expect(() => new DitherPass({ levels: 17 })).toThrow();
      expect(() => new DitherPass({ levels: 100 })).toThrow();
    });

    it('should throw when levels is not integer', () => {
      expect(() => new DitherPass({ levels: 3.5 })).toThrow();
    });

    it('should throw on NaN/Infinity', () => {
      expect(() => new DitherPass({ levels: NaN })).toThrow();
      expect(() => new DitherPass({ levels: Infinity })).toThrow();
      expect(() => new DitherPass({ intensity: NaN })).toThrow();
      expect(() => new DitherPass({ intensity: Infinity })).toThrow();
    });

    it('should throw when intensity out of [0, 1]', () => {
      expect(() => new DitherPass({ intensity: -0.01 })).toThrow();
      expect(() => new DitherPass({ intensity: 1.01 })).toThrow();
    });
  });

  describe('getFragmentShader — bayer4x4', () => {
    it('should contain 4x4 matrix constants and modulo-4 indexing', () => {
      const pass = new DitherPass({ matrix: 'bayer4x4' });
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_texture');
      expect(shader).toContain('u_levels');
      expect(shader).toContain('u_intensity');
      // 16 = 4x4 matrix normalization divisor
      expect(shader).toMatch(/\b16(\.0)?\b/);
      // mod 4 indexing for bayer4x4
      expect(shader).toMatch(/mod\([^)]+,\s*4(\.0)?\)/);
    });
  });

  describe('getFragmentShader — bayer8x8', () => {
    it('should contain 8x8 matrix constants and modulo-8 indexing', () => {
      const pass = new DitherPass({ matrix: 'bayer8x8' });
      const shader = pass.getFragmentShader();
      // 64 = 8x8 normalization divisor
      expect(shader).toMatch(/\b64(\.0)?\b/);
      expect(shader).toMatch(/mod\([^)]+,\s*8(\.0)?\)/);
    });

    it('should differ from bayer4x4 shader', () => {
      const a = new DitherPass({ matrix: 'bayer4x4' }).getFragmentShader();
      const b = new DitherPass({ matrix: 'bayer8x8' }).getFragmentShader();
      expect(a).not.toBe(b);
    });
  });

  describe('EffectPass contract', () => {
    it('should be toggleable via enabled flag', () => {
      const pass = new DitherPass();
      pass.enabled = false;
      expect(pass.enabled).toBe(false);
    });

    it('should expose setUniforms method', () => {
      const pass = new DitherPass();
      expect(typeof pass.setUniforms).toBe('function');
    });
  });
});
