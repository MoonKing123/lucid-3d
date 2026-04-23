import { describe, it, expect } from 'vitest';
import { SharpenPass } from '../../../src/renderer/post-process';

describe('SharpenPass', () => {
  describe('constructor', () => {
    it('should default intensity to 0.5', () => {
      const pass = new SharpenPass();
      expect(pass.intensity).toBe(0.5);
    });

    it('should accept custom intensity option', () => {
      const pass = new SharpenPass({ intensity: 0.8 });
      expect(pass.intensity).toBe(0.8);
    });

    it('should accept intensity=0 (no sharpen)', () => {
      const pass = new SharpenPass({ intensity: 0 });
      expect(pass.intensity).toBe(0);
    });

    it('should accept intensity=1 (max sharpen)', () => {
      const pass = new SharpenPass({ intensity: 1 });
      expect(pass.intensity).toBe(1);
    });

    it('should throw on intensity negative', () => {
      expect(() => new SharpenPass({ intensity: -0.1 })).toThrow(/intensity/);
    });

    it('should throw on intensity > 1', () => {
      expect(() => new SharpenPass({ intensity: 1.5 })).toThrow(/intensity/);
    });
  });

  describe('identity', () => {
    it('should have name "sharpen" and enabled=true by default', () => {
      const pass = new SharpenPass();
      expect(pass.name).toBe('sharpen');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('getFragmentShader', () => {
    it('should return non-empty GLSL string', () => {
      const pass = new SharpenPass();
      const shader = pass.getFragmentShader();
      expect(shader.length).toBeGreaterThan(0);
    });

    it('should reference u_texture, u_texelSize, u_intensity and v_texCoord', () => {
      const pass = new SharpenPass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_texture');
      expect(shader).toContain('u_texelSize');
      expect(shader).toContain('u_intensity');
      expect(shader).toContain('v_texCoord');
    });

    it('should contain Laplacian kernel (5.0 center + 4 neighbors subtraction)', () => {
      const pass = new SharpenPass();
      const shader = pass.getFragmentShader();
      // 5-tap cross kernel 应含 5.0 系数或等价形式
      expect(shader).toMatch(/5\.0|4\.0/);
    });
  });

  describe('texelSize', () => {
    it('should default to [0, 0] and allow external mutation', () => {
      const pass = new SharpenPass();
      expect(pass.texelSize).toEqual([0, 0]);
      pass.texelSize = [1 / 1920, 1 / 1080];
      expect(pass.texelSize).toEqual([1 / 1920, 1 / 1080]);
    });
  });
});
