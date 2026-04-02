/**
 * STUB — BitmapFont (not yet implemented).
 * @see test/unit/renderer/bitmap-text.test.ts
 *
 * Parses BMFont text format (.fnt) and holds character layout data.
 * Used by BitmapText for quad generation and text measurement.
 */
export const __STUB__ = true;

import type { Texture } from './texture';

export interface BitmapCharData {
  /** Unicode codepoint. */
  id: number;
  /** X position in atlas (pixels). */
  x: number;
  /** Y position in atlas (pixels). */
  y: number;
  /** Glyph width in atlas (pixels). */
  width: number;
  /** Glyph height in atlas (pixels). */
  height: number;
  /** Horizontal offset from cursor to glyph left edge. */
  xoffset: number;
  /** Vertical offset from line top to glyph top edge. */
  yoffset: number;
  /** Horizontal advance after rendering this glyph. */
  xadvance: number;
}

export interface BitmapFontData {
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
  chars: Map<number, BitmapCharData>;
}

export class BitmapFont {
  readonly lineHeight: number;
  readonly base: number;
  readonly scaleW: number;
  readonly scaleH: number;
  readonly chars: Map<number, BitmapCharData>;
  readonly texture: Texture;

  constructor(_data: BitmapFontData, _texture: Texture) {
    this.lineHeight = 0;
    this.base = 0;
    this.scaleW = 0;
    this.scaleH = 0;
    this.chars = new Map();
    this.texture = _texture;
    throw new Error('Not implemented');
  }

  /**
   * Parse a BMFont text-format .fnt string.
   * Expected format:
   *   info face="..." size=32 ...
   *   common lineHeight=32 base=26 scaleW=256 scaleH=256 ...
   *   page id=0 file="font.png"
   *   chars count=N
   *   char id=65 x=0 y=0 width=20 height=26 xoffset=1 yoffset=3 xadvance=22 ...
   */
  static parse(_fntText: string, _texture: Texture): BitmapFont {
    throw new Error('Not implemented');
  }

  getChar(charCode: number): BitmapCharData | undefined {
    throw new Error('Not implemented');
    return this.chars.get(charCode);
  }

  /**
   * Measure the bounding box of a text string.
   * Width = sum of xadvance for each known char (last char uses width+xoffset instead).
   * Height = lineHeight (single line).
   */
  measureText(_text: string): { width: number; height: number } {
    throw new Error('Not implemented');
  }
}
