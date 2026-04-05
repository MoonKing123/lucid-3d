import { describe, it, expect } from 'vitest';
import { Texture, TextureWrap, TextureFilter } from '../../../src/renderer/texture';

describe('Texture Sampling Options', () => {
  describe('defaults', () => {
    it('should default to ClampToEdge wrap', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array([255, 0, 0, 255]));
      expect(tex.wrapS).toBe(TextureWrap.ClampToEdge);
      expect(tex.wrapT).toBe(TextureWrap.ClampToEdge);
    });

    it('should default to Nearest filter', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array([255, 0, 0, 255]));
      expect(tex.minFilter).toBe(TextureFilter.Nearest);
      expect(tex.magFilter).toBe(TextureFilter.Nearest);
    });

    it('should default generateMipmaps to false', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array([255, 0, 0, 255]));
      expect(tex.generateMipmaps).toBe(false);
    });

    it('should default flipY to false', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array([255, 0, 0, 255]));
      expect(tex.flipY).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should allow setting wrap modes', () => {
      const tex = Texture.fromData(2, 2, new Uint8Array(16));
      tex.wrapS = TextureWrap.Repeat;
      tex.wrapT = TextureWrap.MirroredRepeat;
      expect(tex.wrapS).toBe(TextureWrap.Repeat);
      expect(tex.wrapT).toBe(TextureWrap.MirroredRepeat);
    });

    it('should allow setting filter modes', () => {
      const tex = Texture.fromData(2, 2, new Uint8Array(16));
      tex.minFilter = TextureFilter.LinearMipmapLinear;
      tex.magFilter = TextureFilter.Linear;
      expect(tex.minFilter).toBe(TextureFilter.LinearMipmapLinear);
      expect(tex.magFilter).toBe(TextureFilter.Linear);
    });

    it('should allow enabling mipmap generation', () => {
      const tex = Texture.fromData(4, 4, new Uint8Array(64));
      tex.generateMipmaps = true;
      expect(tex.generateMipmaps).toBe(true);
    });

    it('should allow setting flipY', () => {
      const tex = Texture.fromData(2, 2, new Uint8Array(16));
      tex.flipY = true;
      expect(tex.flipY).toBe(true);
    });
  });

  describe('version tracking', () => {
    it('should start at version 0', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array(4));
      expect(tex.version).toBe(0);
    });

    it('should increment version on needsUpdate()', () => {
      const tex = Texture.fromData(1, 1, new Uint8Array(4));
      tex.needsUpdate();
      expect(tex.version).toBe(1);
      tex.needsUpdate();
      expect(tex.version).toBe(2);
    });
  });

  describe('factory methods preserve defaults', () => {
    it('defaultWhite should have default sampling options', () => {
      const tex = Texture.defaultWhite();
      expect(tex.wrapS).toBe(TextureWrap.ClampToEdge);
      expect(tex.minFilter).toBe(TextureFilter.Nearest);
    });

    it('checkerboard should have default sampling options', () => {
      const tex = Texture.checkerboard(4, 4);
      expect(tex.wrapS).toBe(TextureWrap.ClampToEdge);
      expect(tex.minFilter).toBe(TextureFilter.Nearest);
    });
  });
});
