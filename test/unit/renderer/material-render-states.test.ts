import { describe, it, expect } from 'vitest';
import { Material, Side } from '../../../src/renderer/material';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { TextureMaterial } from '../../../src/renderer/texture-material';
import { Texture } from '../../../src/renderer/texture';

describe('Material Render States', () => {
  describe('defaults', () => {
    it('should default to Front side', () => {
      const mat = new Material();
      expect(mat.side).toBe(Side.Front);
    });

    it('should default depthWrite to true', () => {
      const mat = new Material();
      expect(mat.depthWrite).toBe(true);
    });

    it('should default depthTest to true', () => {
      const mat = new Material();
      expect(mat.depthTest).toBe(true);
    });

    it('should default visible to true', () => {
      const mat = new Material();
      expect(mat.visible).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should allow setting side to Double', () => {
      const mat = new Material();
      mat.side = Side.Double;
      expect(mat.side).toBe(Side.Double);
    });

    it('should allow setting side to Back', () => {
      const mat = new Material();
      mat.side = Side.Back;
      expect(mat.side).toBe(Side.Back);
    });

    it('should allow disabling depthWrite', () => {
      const mat = new Material();
      mat.depthWrite = false;
      expect(mat.depthWrite).toBe(false);
    });

    it('should allow disabling depthTest', () => {
      const mat = new Material();
      mat.depthTest = false;
      expect(mat.depthTest).toBe(false);
    });

    it('should allow setting visible to false', () => {
      const mat = new Material();
      mat.visible = false;
      expect(mat.visible).toBe(false);
    });
  });

  describe('inheritance', () => {
    it('PhongMaterial should inherit render state defaults', () => {
      const mat = new PhongMaterial();
      expect(mat.side).toBe(Side.Front);
      expect(mat.depthWrite).toBe(true);
      expect(mat.depthTest).toBe(true);
      expect(mat.visible).toBe(true);
    });

    it('TextureMaterial should inherit render state defaults', () => {
      const tex = Texture.defaultWhite();
      const mat = new TextureMaterial(tex);
      expect(mat.side).toBe(Side.Front);
      expect(mat.depthWrite).toBe(true);
    });

    it('PhongMaterial with custom render states', () => {
      const mat = new PhongMaterial();
      mat.side = Side.Double;
      mat.depthWrite = false;
      expect(mat.side).toBe(Side.Double);
      expect(mat.depthWrite).toBe(false);
    });
  });
});
