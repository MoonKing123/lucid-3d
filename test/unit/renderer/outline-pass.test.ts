import { describe, it, expect } from 'vitest';
import { OutlinePass } from '../../../src/renderer/post-process';

describe('OutlinePass', () => {
  describe('constructor', () => {
    it('should default color to [0,0,0], thickness to 1.0, threshold to 0.1', () => {
      const pass = new OutlinePass();
      expect(pass.color).toEqual([0, 0, 0]);
      expect(pass.thickness).toBe(1.0);
      expect(pass.threshold).toBe(0.1);
    });

    it('should accept custom options', () => {
      const pass = new OutlinePass({ color: [1, 0.5, 0], thickness: 2.0, threshold: 0.3 });
      expect(pass.color).toEqual([1, 0.5, 0]);
      expect(pass.thickness).toBe(2.0);
      expect(pass.threshold).toBe(0.3);
    });

    it('should throw on thickness out of [0.5, 3]', () => {
      expect(() => new OutlinePass({ thickness: 0.1 })).toThrow(/thickness/);
      expect(() => new OutlinePass({ thickness: 5 })).toThrow(/thickness/);
    });

    it('should throw on threshold out of [0, 1]', () => {
      expect(() => new OutlinePass({ threshold: -0.1 })).toThrow(/threshold/);
      expect(() => new OutlinePass({ threshold: 1.5 })).toThrow(/threshold/);
    });

    it('should throw on color not length 3', () => {
      expect(() => new OutlinePass({ color: [1, 0] as any })).toThrow(/color/);
    });
  });

  describe('identity', () => {
    it('should have name "outline" and enabled=true by default', () => {
      const pass = new OutlinePass();
      expect(pass.name).toBe('outline');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('getFragmentShader', () => {
    it('should return non-empty GLSL string', () => {
      const pass = new OutlinePass();
      const shader = pass.getFragmentShader();
      expect(shader.length).toBeGreaterThan(0);
    });

    it('should reference u_texture, u_texelSize, u_outlineColor, u_thickness, u_threshold', () => {
      const pass = new OutlinePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_texture');
      expect(shader).toContain('u_texelSize');
      expect(shader).toContain('u_outlineColor');
      expect(shader).toContain('u_thickness');
      expect(shader).toContain('u_threshold');
    });

    it('should compute luma via dot with 0.299/0.587/0.114 (for edge detection)', () => {
      const pass = new OutlinePass();
      const shader = pass.getFragmentShader();
      expect(shader).toMatch(/0\.299|0\.587|0\.114/);
    });
  });

  describe('texelSize', () => {
    it('should default to [0, 0] and allow external mutation', () => {
      const pass = new OutlinePass();
      expect(pass.texelSize).toEqual([0, 0]);
      pass.texelSize = [1 / 640, 1 / 480];
      expect(pass.texelSize).toEqual([1 / 640, 1 / 480]);
    });
  });
});
