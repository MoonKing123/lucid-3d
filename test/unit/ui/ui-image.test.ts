import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-image';
import * as elemMod from '../../../src/ui/ui-element';
import { vec3 } from '../../../src/math/vec3';
import { Texture } from '../../../src/renderer/texture';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIImage } = mod;
const { UIElement } = elemMod;

describeImpl('UIImage', () => {
  it('should create with texture', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex, width: 64, height: 64 });
    expect(img.texture).toBe(tex);
    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
  });

  it('should default tint to white', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex });
    expect(img.tint[0]).toBeCloseTo(1);
    expect(img.tint[1]).toBeCloseTo(1);
    expect(img.tint[2]).toBeCloseTo(1);
  });

  it('should accept custom tint', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex, tint: vec3(1, 0, 0) });
    expect(img.tint[0]).toBeCloseTo(1);
    expect(img.tint[1]).toBeCloseTo(0);
  });

  it('should default uvRect to full texture (0,0)→(1,1)', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex });
    expect(img.uvRect.u0).toBe(0);
    expect(img.uvRect.v0).toBe(0);
    expect(img.uvRect.u1).toBe(1);
    expect(img.uvRect.v1).toBe(1);
  });

  it('should accept custom uvRect for atlas slicing', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({
      texture: tex,
      uvRect: { u0: 0.25, v0: 0.25, u1: 0.75, v1: 0.75 },
    });
    expect(img.uvRect.u0).toBeCloseTo(0.25);
    expect(img.uvRect.u1).toBeCloseTo(0.75);
  });

  it('should default preserveAspect to false', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex });
    expect(img.preserveAspect).toBe(false);
  });

  it('should generate 6 vertices (2 triangles)', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({
      texture: tex, width: 100, height: 100, anchor: 'topLeft',
    });
    const verts = img.getVertices();
    expect(verts).toBeInstanceOf(Float32Array);
    expect(verts.length).toBe(24); // 6 × 4 floats (x, y, u, v)
  });

  it('should use custom uvRect in vertex data', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({
      texture: tex, width: 50, height: 50, anchor: 'topLeft',
      uvRect: { u0: 0.5, v0: 0, u1: 1, v1: 0.5 },
    });
    const verts = img.getVertices();
    // First vertex (top-left): x=0, y=0, u=0.5, v=0
    expect(verts[2]).toBeCloseTo(0.5); // u0
    expect(verts[3]).toBeCloseTo(0);   // v0
  });

  it('should be instanceof UIElement', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex });
    expect(img).toBeInstanceOf(UIElement);
  });

  it('should default visible to true', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({ texture: tex });
    expect(img.visible).toBe(true);
  });

  it('should position with anchor center', () => {
    const tex = Texture.checkerboard(4, 4);
    const img = new UIImage({
      texture: tex, x: 100, y: 100, width: 60, height: 40, anchor: 'center',
    });
    const bounds = img.getScreenBounds();
    expect(bounds.x).toBe(70);  // 100 - 30
    expect(bounds.y).toBe(80);  // 100 - 20
  });

  it('should allow texture swap', () => {
    const tex1 = Texture.checkerboard(4, 4);
    const tex2 = Texture.checkerboard(8, 8);
    const img = new UIImage({ texture: tex1 });
    img.texture = tex2;
    expect(img.texture).toBe(tex2);
  });
});
