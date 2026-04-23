import { describe, it, expect } from 'vitest';
import { FXAAPass } from '../../../src/renderer/post-process';

describe('FXAAPass', () => {
  describe('constructor', () => {
    it('should default edgeThreshold to 0.0625, edgeThresholdMin to 0.0312, subpixelQuality to 0.75', () => {
      const pass = new FXAAPass();
      expect(pass.edgeThreshold).toBe(0.0625);
      expect(pass.edgeThresholdMin).toBe(0.0312);
      expect(pass.subpixelQuality).toBe(0.75);
    });

    it('should accept custom options', () => {
      const pass = new FXAAPass({ edgeThreshold: 0.125, edgeThresholdMin: 0.05, subpixelQuality: 1.0 });
      expect(pass.edgeThreshold).toBe(0.125);
      expect(pass.edgeThresholdMin).toBe(0.05);
      expect(pass.subpixelQuality).toBe(1.0);
    });

    it('should throw on edgeThreshold out of [0, 1]', () => {
      expect(() => new FXAAPass({ edgeThreshold: -0.1 })).toThrow(/edgeThreshold/);
      expect(() => new FXAAPass({ edgeThreshold: 1.5 })).toThrow(/edgeThreshold/);
    });

    it('should throw on subpixelQuality out of [0, 1]', () => {
      expect(() => new FXAAPass({ subpixelQuality: -0.1 })).toThrow(/subpixelQuality/);
      expect(() => new FXAAPass({ subpixelQuality: 1.5 })).toThrow(/subpixelQuality/);
    });

    it('should throw on edgeThresholdMin negative', () => {
      expect(() => new FXAAPass({ edgeThresholdMin: -0.1 })).toThrow(/edgeThresholdMin/);
    });
  });

  describe('identity', () => {
    it('should have name "fxaa" and enabled=true by default', () => {
      const pass = new FXAAPass();
      expect(pass.name).toBe('fxaa');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('getFragmentShader', () => {
    it('should return non-empty GLSL string', () => {
      const pass = new FXAAPass();
      const shader = pass.getFragmentShader();
      expect(shader.length).toBeGreaterThan(0);
    });

    it('should reference u_texture, u_texelSize and v_texCoord', () => {
      const pass = new FXAAPass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_texture');
      expect(shader).toContain('u_texelSize');
      expect(shader).toContain('v_texCoord');
    });

    it('should compute luma via dot product with 0.299/0.587/0.114', () => {
      const pass = new FXAAPass();
      const shader = pass.getFragmentShader();
      expect(shader).toMatch(/0\.299|0\.587|0\.114/);
    });
  });

  describe('texelSize', () => {
    it('should default to [0, 0] and allow external mutation', () => {
      const pass = new FXAAPass();
      expect(pass.texelSize).toEqual([0, 0]);
      pass.texelSize = [1 / 800, 1 / 600];
      expect(pass.texelSize).toEqual([1 / 800, 1 / 600]);
    });
  });
});
