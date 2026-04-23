import { describe, it, expect } from 'vitest';
import { HighlightShadowPass } from '../../../src/renderer/post-process';

describe('HighlightShadowPass', () => {
  describe('constructor defaults', () => {
    it('should default highlights to 0', () => {
      const pass = new HighlightShadowPass();
      expect(pass.highlights).toBe(0);
    });

    it('should default shadows to 0', () => {
      const pass = new HighlightShadowPass();
      expect(pass.shadows).toBe(0);
    });

    it('should have name "highlightShadow" and enabled=true', () => {
      const pass = new HighlightShadowPass();
      expect(pass.name).toBe('highlightShadow');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should accept custom highlights/shadows', () => {
      const pass = new HighlightShadowPass({ highlights: 0.3, shadows: -0.2 });
      expect(pass.highlights).toBe(0.3);
      expect(pass.shadows).toBe(-0.2);
    });

    it('should accept boundary values', () => {
      const pass1 = new HighlightShadowPass({ highlights: 1, shadows: -1 });
      expect(pass1.highlights).toBe(1);
      expect(pass1.shadows).toBe(-1);
      const pass2 = new HighlightShadowPass({ highlights: -1, shadows: 1 });
      expect(pass2.highlights).toBe(-1);
      expect(pass2.shadows).toBe(1);
    });
  });

  describe('parameter validation', () => {
    it('should throw when highlights out of [-1, 1]', () => {
      expect(() => new HighlightShadowPass({ highlights: 1.5 })).toThrow();
      expect(() => new HighlightShadowPass({ highlights: -1.5 })).toThrow();
    });

    it('should throw when shadows out of [-1, 1]', () => {
      expect(() => new HighlightShadowPass({ shadows: 1.5 })).toThrow();
      expect(() => new HighlightShadowPass({ shadows: -1.5 })).toThrow();
    });

    it('should throw on NaN', () => {
      expect(() => new HighlightShadowPass({ highlights: NaN })).toThrow();
      expect(() => new HighlightShadowPass({ shadows: NaN })).toThrow();
    });
  });

  describe('getFragmentShader', () => {
    it('should return GLSL containing u_highlights and u_shadows uniforms', () => {
      const pass = new HighlightShadowPass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_highlights');
      expect(shader).toContain('u_shadows');
      expect(shader).toContain('u_texture');
    });

    it('should use luminance calculation (Rec.709 weights)', () => {
      const pass = new HighlightShadowPass();
      const shader = pass.getFragmentShader();
      // 验证出现 luma 计算或关键系数
      expect(shader).toMatch(/0\.2126|luma|dot/);
    });
  });

  describe('setUniforms', () => {
    it('should call uniform1f for highlights and shadows', () => {
      const pass = new HighlightShadowPass({ highlights: 0.4, shadows: -0.3 });
      const calls: Array<[string, number]> = [];
      const gl = {
        getUniformLocation: (_: any, name: string) => ({ name }),
        uniform1f: (loc: any, value: number) => calls.push([loc.name, value]),
      } as any;
      pass.setUniforms(gl, {} as any);
      expect(calls.find(c => c[0] === 'u_highlights')?.[1]).toBeCloseTo(0.4);
      expect(calls.find(c => c[0] === 'u_shadows')?.[1]).toBeCloseTo(-0.3);
    });
  });

  describe('mutation', () => {
    it('should allow runtime highlights/shadows mutation', () => {
      const pass = new HighlightShadowPass();
      pass.highlights = 0.5;
      pass.shadows = -0.5;
      expect(pass.highlights).toBe(0.5);
      expect(pass.shadows).toBe(-0.5);
    });
  });
});
