/**
 * Pre-written tests for BitmapFont + BitmapText.
 * AI must implement:
 *   - src/renderer/bitmap-font.ts (BitmapFont class)
 *   - src/renderer/bitmap-text.ts (BitmapText + BitmapTextMaterial classes)
 *
 * BitmapFont API:
 *   static parse(fntText: string, texture: Texture): BitmapFont
 *   getChar(charCode: number): BitmapCharData | undefined
 *   measureText(text: string): { width: number; height: number }
 *   readonly lineHeight, base, scaleW, scaleH, chars, texture
 *
 * BitmapText API:
 *   extends Mesh
 *   constructor(font: BitmapFont, opts?: { text?: string; color?: Vec3; align?: TextAlign })
 *   get/set text: string
 *   get/set align: TextAlign  ('left' | 'center' | 'right')
 *   rebuild(): void  — auto-called on text/align change
 *
 * BitmapTextMaterial API:
 *   extends Material
 *   color: Vec3
 */
import { describe, it, expect } from 'vitest';
import * as fontMod from '../../../src/renderer/bitmap-font';
import * as textMod from '../../../src/renderer/bitmap-text';

const isFontStub = '__STUB__' in fontMod && (fontMod as any).__STUB__ === true;
const isTextStub = '__STUB__' in textMod && (textMod as any).__STUB__ === true;
const describeFont = isFontStub ? describe.skip : describe;
const describeText = (isFontStub || isTextStub) ? describe.skip : describe;

const { BitmapFont } = fontMod;
const { BitmapText, BitmapTextMaterial } = textMod;

import { Texture } from '../../../src/renderer/texture';
import { Mesh } from '../../../src/renderer/mesh';
import { Material } from '../../../src/renderer/material';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';

/* ───────── Test fixture: minimal BMFont data ───────── */

const SAMPLE_FNT = `info face="TestFont" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1
common lineHeight=36 base=28 scaleW=256 scaleH=256 pages=1 packed=0
page id=0 file="test-font.png"
chars count=4
char id=65  x=0   y=0  width=20 height=28 xoffset=1  yoffset=0  xadvance=22 page=0 chnl=0
char id=66  x=21  y=0  width=18 height=28 xoffset=2  yoffset=0  xadvance=22 page=0 chnl=0
char id=67  x=40  y=0  width=19 height=28 xoffset=1  yoffset=0  xadvance=21 page=0 chnl=0
char id=32  x=0   y=0  width=0  height=0  xoffset=0  yoffset=0  xadvance=10 page=0 chnl=0`;

function createTestTexture(): InstanceType<typeof Texture> {
  // 256x256 white texture (matches scaleW/scaleH in SAMPLE_FNT)
  const data = new Uint8Array(256 * 256 * 4).fill(255);
  return Texture.fromData(256, 256, data);
}

/* ═══════════════ BitmapFont — parse ═══════════════ */

describeFont('BitmapFont — parse', () => {
  it('should parse lineHeight and base', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    expect(font.lineHeight).toBe(36);
    expect(font.base).toBe(28);
  });

  it('should parse scaleW and scaleH', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    expect(font.scaleW).toBe(256);
    expect(font.scaleH).toBe(256);
  });

  it('should parse character data', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    expect(font.chars.size).toBe(4);

    const charA = font.getChar(65);
    expect(charA).toBeDefined();
    expect(charA!.x).toBe(0);
    expect(charA!.y).toBe(0);
    expect(charA!.width).toBe(20);
    expect(charA!.height).toBe(28);
    expect(charA!.xoffset).toBe(1);
    expect(charA!.yoffset).toBe(0);
    expect(charA!.xadvance).toBe(22);
  });

  it('should parse space character', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const space = font.getChar(32);
    expect(space).toBeDefined();
    expect(space!.width).toBe(0);
    expect(space!.xadvance).toBe(10);
  });

  it('should return undefined for missing characters', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    expect(font.getChar(90)).toBeUndefined(); // 'Z' not in sample
  });

  it('should store texture reference', () => {
    const tex = createTestTexture();
    const font = BitmapFont.parse(SAMPLE_FNT, tex);
    expect(font.texture).toBe(tex);
  });
});

/* ═══════════════ BitmapFont — measureText ═══════════════ */

describeFont('BitmapFont — measureText', () => {
  it('should measure single character', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    // 'A' last char: width comes from xoffset + width = 1 + 20 = 21
    const m = font.measureText('A');
    expect(m.width).toBe(21); // last char: xoffset + glyph width
    expect(m.height).toBe(36); // lineHeight
  });

  it('should measure multi-character string', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    // "AB": A.xadvance(22) + B.xoffset(2) + B.width(18) = 42
    const m = font.measureText('AB');
    expect(m.width).toBe(42);
    expect(m.height).toBe(36);
  });

  it('should return zero width for empty string', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const m = font.measureText('');
    expect(m.width).toBe(0);
    expect(m.height).toBe(36);
  });

  it('should skip unknown characters', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    // 'AZB' — Z is unknown, skipped; result same as 'AB'
    const m = font.measureText('AZB');
    expect(m.width).toBe(42);
  });

  it('should handle string with spaces', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    // "A B": A.xadvance(22) + space.xadvance(10) + B.xoffset(2) + B.width(18) = 52
    const m = font.measureText('A B');
    expect(m.width).toBe(52);
  });
});

/* ═══════════════ BitmapTextMaterial ═══════════════ */

describeText('BitmapTextMaterial — construction', () => {
  it('should extend Material', () => {
    const mat = new BitmapTextMaterial();
    expect(mat).toBeInstanceOf(Material);
  });

  it('should have default white color', () => {
    const mat = new BitmapTextMaterial();
    expect(mat.color[0]).toBeCloseTo(1);
    expect(mat.color[1]).toBeCloseTo(1);
    expect(mat.color[2]).toBeCloseTo(1);
  });

  it('should accept custom color', () => {
    const mat = new BitmapTextMaterial({ color: vec3(1, 0, 0) });
    expect(mat.color[0]).toBeCloseTo(1);
    expect(mat.color[1]).toBeCloseTo(0);
    expect(mat.color[2]).toBeCloseTo(0);
  });
});

/* ═══════════════ BitmapText — construction ═══════════════ */

describeText('BitmapText — construction', () => {
  it('should extend Mesh', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font);
    expect(bt).toBeInstanceOf(Mesh);
    expect(bt).toBeInstanceOf(Node3D);
  });

  it('should have name "bitmap-text"', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font);
    expect(bt.name).toBe('bitmap-text');
  });

  it('should default to empty text', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font);
    expect(bt.text).toBe('');
  });

  it('should accept initial text', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'ABC' });
    expect(bt.text).toBe('ABC');
  });

  it('should default to left alignment', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font);
    expect(bt.align).toBe('left');
  });
});

/* ═══════════════ BitmapText — geometry generation ═══════════════ */

describeText('BitmapText — geometry', () => {
  it('should generate 4 vertices per visible character', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'ABC' });
    // 3 chars × 4 verts × 3 components = 36
    expect(bt.geometry.positions.length).toBe(36);
  });

  it('should generate 6 indices per visible character', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'ABC' });
    // 3 chars × 6 indices = 18
    expect(bt.geometry.indices).not.toBeNull();
    expect(bt.geometry.indices!.length).toBe(18);
  });

  it('should generate UVs for atlas sampling', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'A' });
    expect(bt.geometry.uvs).not.toBeNull();
    // 1 char × 4 verts × 2 components = 8
    expect(bt.geometry.uvs!.length).toBe(8);

    // UV should be normalized by atlas size (256×256)
    // 'A': x=0, y=0, w=20, h=28 → UVs in [0, 20/256] × [0, 28/256]
    const uvs = bt.geometry.uvs!;
    for (let i = 0; i < uvs.length; i++) {
      expect(uvs[i]).toBeGreaterThanOrEqual(0);
      expect(uvs[i]).toBeLessThanOrEqual(1);
    }
  });

  it('should have empty geometry for empty text', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: '' });
    expect(bt.geometry.positions.length).toBe(0);
  });

  it('should skip space characters in geometry (no visible quad)', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'A B' });
    // Only 'A' and 'B' produce quads (space has width=0)
    // 2 visible chars × 4 verts × 3 components = 24
    expect(bt.geometry.positions.length).toBe(24);
  });

  it('should rebuild geometry when text changes', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'A' });
    expect(bt.geometry.positions.length).toBe(12); // 1 char

    bt.text = 'ABC';
    expect(bt.geometry.positions.length).toBe(36); // 3 chars
  });
});

/* ═══════════════ BitmapText — alignment ═══════════════ */

describeText('BitmapText — alignment', () => {
  it('left align: first char starts at x >= 0', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'AB', align: 'left' });
    const positions = bt.geometry.positions;
    // First vertex x should be >= 0 (xoffset of 'A' = 1)
    expect(positions[0]).toBeGreaterThanOrEqual(0);
  });

  it('center align: text should be roughly centered at x=0', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'AB', align: 'center' });
    const positions = bt.geometry.positions;
    // With center alignment, first vertex x should be negative (shifted left by half width)
    // Text width of 'AB' = 42, so shift = -21
    expect(positions[0]).toBeLessThan(0);
  });

  it('right align: last char should end near x=0', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'AB', align: 'right' });
    const positions = bt.geometry.positions;
    // With right alignment, first vertex x should be negative (shifted left by full width)
    expect(positions[0]).toBeLessThan(0);
  });

  it('should rebuild when alignment changes', () => {
    const font = BitmapFont.parse(SAMPLE_FNT, createTestTexture());
    const bt = new BitmapText(font, { text: 'AB', align: 'left' });
    const leftX = bt.geometry.positions[0];

    bt.align = 'center';
    const centerX = bt.geometry.positions[0];
    expect(centerX).not.toBeCloseTo(leftX, 1);
  });
});
