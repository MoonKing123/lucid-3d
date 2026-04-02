/**
 * STUB — BitmapText (not yet implemented).
 * @see test/unit/renderer/bitmap-text.test.ts
 *
 * Renderable text node using a BitmapFont atlas.
 * Extends Mesh — generates quad geometry per character.
 * The existing WebGL Mesh rendering path handles drawing.
 */
export const __STUB__ = true;

import { type Vec3, vec3 } from '../math/vec3';
import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import type { BitmapFont } from './bitmap-font';

export type TextAlign = 'left' | 'center' | 'right';

export interface BitmapTextOptions {
  text?: string;
  color?: Vec3;
  align?: TextAlign;
}

/**
 * BitmapTextMaterial — textured material for font atlas rendering.
 * Vertex shader passes position + UV.
 * Fragment shader samples atlas texture and multiplies by uniform color.
 */
export class BitmapTextMaterial extends Material {
  color: Vec3;

  constructor(_opts?: { color?: Vec3 }) {
    super();
    this.color = vec3(1, 1, 1);
    throw new Error('Not implemented');
  }
}

/**
 * BitmapText — extends Mesh, auto-generates quad geometry from text + font.
 *
 * Usage:
 *   const font = BitmapFont.parse(fntText, texture);
 *   const label = new BitmapText(font, { text: 'SCORE: 100', color: vec3(1,1,0) });
 *   scene.addChild(label);
 *
 * When `text` is set, geometry is rebuilt automatically.
 * Each character = 4 vertices + 6 indices (one quad).
 */
export class BitmapText extends Mesh {
  private _text: string;
  private _font: BitmapFont;
  private _align: TextAlign;

  constructor(_font: BitmapFont, _opts?: BitmapTextOptions) {
    // Placeholder geometry/material — real impl rebuilds on text set
    super(
      new Geometry({ positions: new Float32Array(0) }),
      new Material(),
      'bitmap-text',
    );
    this._text = '';
    this._font = _font;
    this._align = 'left';
    throw new Error('Not implemented');
  }

  get text(): string {
    return this._text;
  }

  set text(_value: string) {
    throw new Error('Not implemented');
  }

  get font(): BitmapFont {
    return this._font;
  }

  get align(): TextAlign {
    return this._align;
  }

  set align(_value: TextAlign) {
    throw new Error('Not implemented');
  }

  /**
   * Rebuild quad geometry from current text + font.
   * Called automatically when text or align changes.
   *
   * Each visible character produces:
   * - 4 vertices (positions: x/y/z=0, UVs: atlas coords normalized by scaleW/scaleH)
   * - 6 indices (2 triangles per quad)
   * - Colors: all set to material.color
   *
   * Positioning:
   * - Cursor starts at (0, 0) and advances by xadvance per char
   * - Each quad is offset by (xoffset, -yoffset) from cursor
   * - Alignment shifts the entire row: left=0, center=-width/2, right=-width
   */
  rebuild(): void {
    throw new Error('Not implemented');
  }
}
