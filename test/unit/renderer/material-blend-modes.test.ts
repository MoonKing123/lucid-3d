import { describe, it, expect } from 'vitest';
import { Material, BlendMode } from '../../../src/renderer/material';
import { PhongMaterial } from '../../../src/renderer/phong-material';

describe('Material Blend Modes', () => {
  describe('defaults', () => {
    it('should default to BlendMode.None', () => {
      const mat = new Material();
      expect(mat.blendMode).toBe(BlendMode.None);
    });
  });

  describe('configuration', () => {
    it('should allow setting Normal blend mode', () => {
      const mat = new Material();
      mat.blendMode = BlendMode.Normal;
      expect(mat.blendMode).toBe(BlendMode.Normal);
    });

    it('should allow setting Additive blend mode', () => {
      const mat = new Material();
      mat.blendMode = BlendMode.Additive;
      expect(mat.blendMode).toBe(BlendMode.Additive);
    });

    it('should allow setting Multiply blend mode', () => {
      const mat = new Material();
      mat.blendMode = BlendMode.Multiply;
      expect(mat.blendMode).toBe(BlendMode.Multiply);
    });
  });

  describe('effectiveBlendMode()', () => {
    it('transparent=true should imply Normal blend when blendMode is None', () => {
      const mat = new Material();
      mat.transparent = true;
      expect(mat.effectiveBlendMode()).toBe(BlendMode.Normal);
    });

    it('explicit blendMode should override transparent flag', () => {
      const mat = new Material();
      mat.transparent = true;
      mat.blendMode = BlendMode.Additive;
      expect(mat.effectiveBlendMode()).toBe(BlendMode.Additive);
    });

    it('transparent=false with BlendMode.None should be no blending', () => {
      const mat = new Material();
      mat.transparent = false;
      mat.blendMode = BlendMode.None;
      expect(mat.effectiveBlendMode()).toBe(BlendMode.None);
    });

    it('non-transparent with explicit blend mode should use that mode', () => {
      const mat = new Material();
      mat.transparent = false;
      mat.blendMode = BlendMode.Additive;
      expect(mat.effectiveBlendMode()).toBe(BlendMode.Additive);
    });
  });

  describe('inheritance', () => {
    it('PhongMaterial should inherit blend mode default', () => {
      const mat = new PhongMaterial();
      expect(mat.blendMode).toBe(BlendMode.None);
    });

    it('PhongMaterial can set blend mode', () => {
      const mat = new PhongMaterial();
      mat.blendMode = BlendMode.Additive;
      expect(mat.blendMode).toBe(BlendMode.Additive);
      expect(mat.effectiveBlendMode()).toBe(BlendMode.Additive);
    });
  });
});
