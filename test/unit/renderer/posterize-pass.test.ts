import { describe, it, expect } from 'vitest';
import { PosterizePass } from '../../../src/renderer/post-process';

describe('PosterizePass', () => {
  describe('constructor defaults', () => {
    it('should default levels to 6', () => {
      const pass = new PosterizePass();
      expect(pass.levels).toBe(6);
    });

    it('should default intensity to 1', () => {
      const pass = new PosterizePass();
      expect(pass.intensity).toBe(1);
    });

    it('should have name "posterize" and enabled=true', () => {
      const pass = new PosterizePass();
      expect(pass.name).toBe('posterize');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should accept custom levels', () => {
      const pass = new PosterizePass({ levels: 4 });
      expect(pass.levels).toBe(4);
    });

    it('should accept boundary levels values', () => {
      expect(new PosterizePass({ levels: 2 }).levels).toBe(2);
      expect(new PosterizePass({ levels: 32 }).levels).toBe(32);
    });

    it('should accept custom intensity', () => {
      const pass = new PosterizePass({ intensity: 0.5 });
      expect(pass.intensity).toBe(0.5);
    });

    it('should accept boundary intensity values', () => {
      expect(new PosterizePass({ intensity: 0 }).intensity).toBe(0);
      expect(new PosterizePass({ intensity: 1 }).intensity).toBe(1);
    });
  });

  describe('parameter validation', () => {
    it('should throw when levels < 2', () => {
      expect(() => new PosterizePass({ levels: 1 })).toThrow();
      expect(() => new PosterizePass({ levels: 0 })).toThrow();
      expect(() => new PosterizePass({ levels: -1 })).toThrow();
    });

    it('should throw when levels > 32', () => {
      expect(() => new PosterizePass({ levels: 33 })).toThrow();
      expect(() => new PosterizePass({ levels: 100 })).toThrow();
    });

    it('should throw when levels is not an integer', () => {
      expect(() => new PosterizePass({ levels: 3.5 })).toThrow();
      expect(() => new PosterizePass({ levels: 2.7 })).toThrow();
    });

    it('should throw when levels is NaN / Infinity', () => {
      expect(() => new PosterizePass({ levels: NaN })).toThrow();
      expect(() => new PosterizePass({ levels: Infinity })).toThrow();
    });

    it('should throw when intensity out of [0, 1]', () => {
      expect(() => new PosterizePass({ intensity: -0.1 })).toThrow();
      expect(() => new PosterizePass({ intensity: 1.1 })).toThrow();
    });

    it('should throw when intensity is NaN / Infinity', () => {
      expect(() => new PosterizePass({ intensity: NaN })).toThrow();
      expect(() => new PosterizePass({ intensity: Infinity })).toThrow();
    });
  });

  describe('getFragmentShader', () => {
    it('should contain u_levels and u_intensity uniforms', () => {
      const pass = new PosterizePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_levels');
      expect(shader).toContain('u_intensity');
      expect(shader).toContain('u_texture');
    });

    it('should use floor() and division for quantization', () => {
      const pass = new PosterizePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('floor(');
    });

    it('should mix original and quantized results', () => {
      const pass = new PosterizePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('mix(');
    });
  });

  describe('EffectPass contract', () => {
    it('should be toggleable via enabled flag', () => {
      const pass = new PosterizePass();
      pass.enabled = false;
      expect(pass.enabled).toBe(false);
    });

    it('should expose setUniforms method', () => {
      const pass = new PosterizePass();
      expect(typeof pass.setUniforms).toBe('function');
    });
  });
});
