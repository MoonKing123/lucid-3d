import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-button';
import * as elemMod from '../../../src/ui/ui-element';
import { vec3 } from '../../../src/math/vec3';
import type { BitmapFontData, BitmapCharData } from '../../../src/renderer/bitmap-font';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIButton } = mod;
const { UIElement } = elemMod;

/** Mock font: every character xadvance=10, width=8, height=12, lineHeight=16 */
function createMockFont(): BitmapFontData {
  const chars = new Map<number, BitmapCharData>();
  for (let i = 32; i <= 126; i++) {
    chars.set(i, {
      id: i, x: 0, y: 0,
      width: 8, height: 12,
      xoffset: 1, yoffset: 2,
      xadvance: 10,
    });
  }
  return { lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars };
}

describeImpl('UIButton', () => {
  it('should create with default values', () => {
    const btn = new UIButton({ width: 120, height: 40 });
    expect(btn.label).toBe('');
    expect(btn.disabled).toBe(false);
    expect(btn.isPressed).toBe(false);
    expect(btn.width).toBe(120);
    expect(btn.height).toBe(40);
  });

  it('should default interactive to true', () => {
    const btn = new UIButton({ width: 100, height: 30 });
    expect(btn.interactive).toBe(true);
  });

  it('should create with custom label and colors', () => {
    const btn = new UIButton({
      width: 150, height: 50,
      label: 'Start',
      normalColor: vec3(0.2, 0.6, 1),
      pressedColor: vec3(0.1, 0.4, 0.8),
      disabledColor: vec3(0.5, 0.5, 0.5),
    });
    expect(btn.label).toBe('Start');
    expect(btn.normalColor[0]).toBeCloseTo(0.2);
    expect(btn.pressedColor[2]).toBeCloseTo(0.8);
    expect(btn.disabledColor[0]).toBeCloseTo(0.5);
  });

  it('should return normalColor when idle', () => {
    const btn = new UIButton({
      width: 100, height: 30,
      normalColor: vec3(0, 1, 0),
    });
    const c = btn.getCurrentColor();
    expect(c[0]).toBeCloseTo(0);
    expect(c[1]).toBeCloseTo(1);
  });

  it('should return pressedColor when pressed', () => {
    const btn = new UIButton({
      width: 100, height: 30,
      pressedColor: vec3(1, 0, 0),
    });
    btn.handlePointerDown(50, 15);
    expect(btn.isPressed).toBe(true);
    const c = btn.getCurrentColor();
    expect(c[0]).toBeCloseTo(1);
    expect(c[1]).toBeCloseTo(0);
  });

  it('should return disabledColor when disabled', () => {
    const btn = new UIButton({
      width: 100, height: 30,
      disabledColor: vec3(0.3, 0.3, 0.3),
      disabled: true,
    });
    const c = btn.getCurrentColor();
    expect(c[0]).toBeCloseTo(0.3);
  });

  it('should fire onClick on pointerUp', () => {
    let clicked = false;
    const btn = new UIButton({
      width: 100, height: 30,
      onClick: () => { clicked = true; },
    });
    btn.handlePointerDown(50, 15);
    btn.handlePointerUp(50, 15);
    expect(clicked).toBe(true);
    expect(btn.isPressed).toBe(false);
  });

  it('should NOT fire onClick when disabled', () => {
    let clicked = false;
    const btn = new UIButton({
      width: 100, height: 30,
      disabled: true,
      onClick: () => { clicked = true; },
    });
    btn.handlePointerDown(50, 15);
    btn.handlePointerUp(50, 15);
    expect(clicked).toBe(false);
    expect(btn.isPressed).toBe(false);
  });

  it('should NOT set isPressed when disabled', () => {
    const btn = new UIButton({ width: 100, height: 30, disabled: true });
    btn.handlePointerDown(50, 15);
    expect(btn.isPressed).toBe(false);
  });

  it('should generate 6 vertices (2 triangles) for background', () => {
    const btn = new UIButton({ width: 100, height: 40, anchor: 'topLeft' });
    const verts = btn.getVertices();
    expect(verts).toBeInstanceOf(Float32Array);
    expect(verts.length).toBe(24); // 6 vertices × 4 floats
  });

  it('should be instanceof UIElement', () => {
    const btn = new UIButton({ width: 100, height: 30 });
    expect(btn).toBeInstanceOf(UIElement);
  });

  it('should position with anchor center', () => {
    const btn = new UIButton({
      x: 200, y: 300, width: 100, height: 40, anchor: 'center',
    });
    const bounds = btn.getScreenBounds();
    expect(bounds.x).toBe(150); // 200 - 50
    expect(bounds.y).toBe(280); // 300 - 20
  });

  it('should store font reference', () => {
    const font = createMockFont();
    const btn = new UIButton({ width: 100, height: 30, font, label: 'OK' });
    expect(btn.font).toBe(font);
    expect(btn.label).toBe('OK');
  });

  it('should allow label update', () => {
    const btn = new UIButton({ width: 100, height: 30, label: 'Start' });
    btn.label = 'Resume';
    expect(btn.label).toBe('Resume');
  });

  it('should reset isPressed on pointerUp even without onClick', () => {
    const btn = new UIButton({ width: 100, height: 30 });
    btn.handlePointerDown(50, 15);
    expect(btn.isPressed).toBe(true);
    btn.handlePointerUp(50, 15);
    expect(btn.isPressed).toBe(false);
  });

  it('should support textColor', () => {
    const btn = new UIButton({
      width: 100, height: 30,
      textColor: vec3(1, 1, 0),
    });
    expect(btn.textColor[0]).toBeCloseTo(1);
    expect(btn.textColor[1]).toBeCloseTo(1);
    expect(btn.textColor[2]).toBeCloseTo(0);
  });
});
