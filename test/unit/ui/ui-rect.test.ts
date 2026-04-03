import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-rect';
import * as elemMod from '../../../src/ui/ui-element';
import { vec3 } from '../../../src/math/vec3';
import { Texture } from '../../../src/renderer/texture';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIRect } = mod;
const { UIElement } = elemMod;

describeImpl('UIRect', () => {
  it('should create with defaults', () => {
    const rect = new UIRect();
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);
    expect(rect.color[0]).toBeCloseTo(1);
    expect(rect.color[1]).toBeCloseTo(1);
    expect(rect.color[2]).toBeCloseTo(1);
    expect(rect.texture).toBeNull();
  });

  it('should create with custom position/size/color', () => {
    const rect = new UIRect({ x: 10, y: 20, width: 300, height: 50, color: vec3(1, 0, 0) });
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);
    expect(rect.width).toBe(300);
    expect(rect.height).toBe(50);
    expect(rect.color[0]).toBeCloseTo(1);
    expect(rect.color[1]).toBeCloseTo(0);
    expect(rect.color[2]).toBeCloseTo(0);
  });

  it('should position with anchor topLeft', () => {
    const rect = new UIRect({ x: 100, y: 200, width: 60, height: 40, anchor: 'topLeft' });
    const bounds = rect.getScreenBounds();
    expect(bounds.x).toBe(100);
    expect(bounds.y).toBe(200);
  });

  it('should position with anchor center', () => {
    const rect = new UIRect({ x: 100, y: 200, width: 60, height: 40, anchor: 'center' });
    const bounds = rect.getScreenBounds();
    expect(bounds.x).toBe(70);  // 100 - 30
    expect(bounds.y).toBe(180); // 200 - 20
  });

  it('should position with anchor bottomRight', () => {
    const rect = new UIRect({ x: 100, y: 200, width: 60, height: 40, anchor: 'bottomRight' });
    const bounds = rect.getScreenBounds();
    expect(bounds.x).toBe(40);  // 100 - 60
    expect(bounds.y).toBe(160); // 200 - 40
  });

  it('should position with anchor topCenter', () => {
    const rect = new UIRect({ x: 100, y: 200, width: 60, height: 40, anchor: 'topCenter' });
    const bounds = rect.getScreenBounds();
    expect(bounds.x).toBe(70);  // 100 - 30
    expect(bounds.y).toBe(200); // top: no offset
  });

  it('should generate 6 vertices (2 triangles)', () => {
    const rect = new UIRect({ x: 0, y: 0, width: 100, height: 50, anchor: 'topLeft' });
    const verts = rect.getVertices();
    // 6 vertices × 4 floats (x, y, u, v) = 24 floats
    expect(verts).toBeInstanceOf(Float32Array);
    expect(verts.length).toBe(24);
  });

  it('should default opacity to 1', () => {
    const rect = new UIRect();
    expect(rect.opacity).toBe(1);
  });

  it('should allow color update', () => {
    const rect = new UIRect({ color: vec3(1, 0, 0) });
    rect.color = vec3(0, 1, 0);
    expect(rect.color[1]).toBeCloseTo(1);
  });

  it('should be instanceof UIElement', () => {
    const rect = new UIRect();
    expect(rect).toBeInstanceOf(UIElement);
  });

  it('should default visible to true', () => {
    const rect = new UIRect();
    expect(rect.visible).toBe(true);
  });

  it('should accept texture', () => {
    const tex = Texture.checkerboard(4, 4);
    const rect = new UIRect({ texture: tex });
    expect(rect.texture).toBe(tex);
  });
});
