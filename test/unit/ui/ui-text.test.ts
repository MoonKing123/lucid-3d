import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-text';
import * as elemMod from '../../../src/ui/ui-element';
import { vec3 } from '../../../src/math/vec3';
import type { BitmapFontData, BitmapCharData } from '../../../src/renderer/bitmap-font';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIText } = mod;
const { UIElement } = elemMod;

/** 创建一个简单的 mock BitmapFontData，每个字符 xadvance = 10 */
function createMockFont(): BitmapFontData {
  const chars = new Map<number, BitmapCharData>();
  // ASCII 32 (space) to 126 (~)
  for (let i = 32; i <= 126; i++) {
    chars.set(i, {
      id: i,
      x: 0, y: 0,
      width: 8, height: 12,
      xoffset: 1, yoffset: 2,
      xadvance: 10,
    });
  }
  return { lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars };
}

describeImpl('UIText', () => {
  it('should create with font and text', () => {
    const font = createMockFont();
    const txt = new UIText({ font, text: 'Hello' });
    expect(txt.text).toBe('Hello');
    expect(txt.font).toBe(font);
  });

  it('should default text to empty string', () => {
    const font = createMockFont();
    const txt = new UIText({ font });
    expect(txt.text).toBe('');
  });

  it('should position in pixel coordinates', () => {
    const font = createMockFont();
    const txt = new UIText({ font, text: 'Hi', x: 50, y: 30 });
    expect(txt.x).toBe(50);
    expect(txt.y).toBe(30);
  });

  it('should scale by fontSize', () => {
    const font = createMockFont();
    // fontSize = 32, font lineHeight = 16 → scale = 2
    const txt = new UIText({ font, text: 'AB', fontSize: 32 });
    // 'A' xadvance=10, 'B' right edge = 10 + 1(xoffset) + 8(width) = 19
    // Scaled by 2 → 38
    expect(txt.measureWidth()).toBeCloseTo(38);
  });

  it('should allow text update', () => {
    const font = createMockFont();
    const txt = new UIText({ font, text: 'old' });
    txt.text = 'new';
    expect(txt.text).toBe('new');
  });

  it('should default color to white', () => {
    const font = createMockFont();
    const txt = new UIText({ font });
    expect(txt.color[0]).toBeCloseTo(1);
    expect(txt.color[1]).toBeCloseTo(1);
    expect(txt.color[2]).toBeCloseTo(1);
  });

  it('should measureWidth correctly at default fontSize', () => {
    const font = createMockFont();
    // fontSize defaults to font.lineHeight (16)
    const txt = new UIText({ font, text: 'ABC' });
    // 'A' adv=10, 'B' adv=10, 'C' right edge = 20 + 1 + 8 = 29
    // scale = 16/16 = 1 → 29
    expect(txt.measureWidth()).toBeCloseTo(29);
  });

  it('should support align left/center/right', () => {
    const font = createMockFont();
    const txt = new UIText({ font, text: 'Hi', align: 'center' });
    expect(txt.align).toBe('center');
  });

  it('should respect anchor from UIElement', () => {
    const font = createMockFont();
    const txt = new UIText({ font, text: 'X', anchor: 'topLeft', x: 10, y: 20 });
    expect(txt.anchor).toBe('topLeft');
    expect(txt.x).toBe(10);
  });

  it('should default visible to true', () => {
    const font = createMockFont();
    const txt = new UIText({ font });
    expect(txt.visible).toBe(true);
  });

  it('should be instanceof UIElement', () => {
    const font = createMockFont();
    const txt = new UIText({ font });
    expect(txt).toBeInstanceOf(UIElement);
  });
});
