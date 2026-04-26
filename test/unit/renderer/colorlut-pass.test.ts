import { describe, it, expect } from 'vitest';
import { ColorLUTPass } from '../../../src/renderer/post-process';
import { Texture } from '../../../src/renderer/texture';

function makeLUT(): Texture {
  // 512×512 RGBA 纯色 LUT（identity LUT 占位）
  const data = new Uint8Array(512 * 512 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255;
  }
  return Texture.fromData(512, 512, data);
}

describe('ColorLUTPass', () => {
  describe('constructor defaults', () => {
    it('should default intensity to 1', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      expect(pass.intensity).toBe(1);
    });

    it('should have name "colorLUT" and enabled=true', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      expect(pass.name).toBe('colorLUT');
      expect(pass.enabled).toBe(true);
    });

    it('should store the provided texture', () => {
      const lut = makeLUT();
      const pass = new ColorLUTPass({ texture: lut });
      expect(pass.texture).toBe(lut);
    });
  });

  describe('custom options', () => {
    it('should accept custom intensity', () => {
      const pass = new ColorLUTPass({ texture: makeLUT(), intensity: 0.5 });
      expect(pass.intensity).toBe(0.5);
    });

    it('should accept boundary intensity values', () => {
      const p0 = new ColorLUTPass({ texture: makeLUT(), intensity: 0 });
      expect(p0.intensity).toBe(0);
      const p1 = new ColorLUTPass({ texture: makeLUT(), intensity: 1 });
      expect(p1.intensity).toBe(1);
    });
  });

  describe('parameter validation', () => {
    it('should throw when texture is missing', () => {
      expect(() => new ColorLUTPass({ texture: null as any })).toThrow();
      expect(() => new ColorLUTPass({ texture: undefined as any })).toThrow();
    });

    it('should throw when intensity out of [0, 1]', () => {
      expect(() => new ColorLUTPass({ texture: makeLUT(), intensity: -0.1 })).toThrow();
      expect(() => new ColorLUTPass({ texture: makeLUT(), intensity: 1.1 })).toThrow();
      expect(() => new ColorLUTPass({ texture: makeLUT(), intensity: 2 })).toThrow();
    });

    it('should throw on NaN', () => {
      expect(() => new ColorLUTPass({ texture: makeLUT(), intensity: NaN })).toThrow();
    });

    it('should throw on Infinity', () => {
      expect(() => new ColorLUTPass({ texture: makeLUT(), intensity: Infinity })).toThrow();
    });
  });

  describe('getFragmentShader', () => {
    it('should return GLSL containing expected uniforms', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_lut');
      expect(shader).toContain('u_texture');
      expect(shader).toContain('u_intensity');
    });

    it('should reference LUT tile math (8x8 atlas)', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      const shader = pass.getFragmentShader();
      // 任一形式：8.0 / 512.0 / 64.0 都可以
      const hasTileMath = /\b8(\.0)?\b/.test(shader) || /\b64(\.0)?\b/.test(shader) || /\b512(\.0)?\b/.test(shader);
      expect(hasTileMath).toBe(true);
    });

    it('should do mix() between original and LUT-sampled result', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      const shader = pass.getFragmentShader();
      expect(shader).toContain('mix(');
    });
  });

  describe('EffectPass contract', () => {
    it('should be toggleable via enabled flag', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      pass.enabled = false;
      expect(pass.enabled).toBe(false);
    });

    it('should expose setUniforms method', () => {
      const pass = new ColorLUTPass({ texture: makeLUT() });
      expect(typeof pass.setUniforms).toBe('function');
    });
  });
});
