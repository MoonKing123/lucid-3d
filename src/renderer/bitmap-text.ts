/**
 * BitmapText — 基于 BitmapFont atlas 的文字渲染节点
 * 继承 Mesh，为每个可见字符生成 quad 几何体。
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import type { Texture } from './texture';
import type { BitmapFont } from './bitmap-font';

export type TextAlign = 'left' | 'center' | 'right';

export interface BitmapTextOptions {
  text?: string;
  color?: Vec3;
  align?: TextAlign;
}

// ── 着色器 ────────────────────────────────────────────────────────

const BITMAP_TEXT_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec2 a_uv;
  uniform mat4 u_mvp;
  varying vec2 v_uv;

  void main() {
    gl_Position = u_mvp * vec4(a_position, 1.0);
    v_uv = a_uv;
  }
`;

const BITMAP_TEXT_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_atlas;
  uniform vec3 u_color;
  varying vec2 v_uv;

  void main() {
    vec4 sample = texture2D(u_atlas, v_uv);
    if (sample.a < 0.01) discard;
    gl_FragColor = vec4(sample.rgb * u_color, sample.a);
  }
`;

// ── BitmapTextMaterial ────────────────────────────────────────────

/**
 * BitmapTextMaterial — 字体 atlas 纹理材质。
 * VS 传递 position + UV，FS 采样纹理并乘以颜色 tint，alpha < 0.01 丢弃。
 */
export class BitmapTextMaterial extends Material {
  color: Vec3;
  /** 字体 atlas 纹理，由 BitmapText 构造时注入。 */
  atlas: Texture | null = null;

  constructor(opts?: { color?: Vec3 }) {
    super({
      vertexShader: BITMAP_TEXT_VERTEX_SHADER,
      fragmentShader: BITMAP_TEXT_FRAGMENT_SHADER,
    });
    this.color = opts?.color ?? vec3(1, 1, 1);
    // 字体渲染需要 alpha 混合（通过 effectiveBlendMode 驱动）
    this.transparent = true;
  }
}

// ── BitmapText ────────────────────────────────────────────────────

/**
 * BitmapText — 文字渲染节点，继承 Mesh。
 * 设置 text 或 align 时自动调用 rebuild() 重建几何体。
 *
 * 每个可见字符（width > 0）生成 1 个 quad：
 *   4 顶点 (position xyz, uv xy) + 6 索引 (2 个三角形)
 * 空格等零宽字符只推进 cursor，不生成 quad。
 */
export class BitmapText extends Mesh {
  private _text: string;
  private _font: BitmapFont;
  private _align: TextAlign;

  constructor(font: BitmapFont, opts?: BitmapTextOptions) {
    const mat = new BitmapTextMaterial({ color: opts?.color });
    mat.atlas = font.texture;
    super(
      new Geometry({ positions: new Float32Array(0) }),
      mat,
      'bitmap-text',
    );
    this._font  = font;
    this._text  = opts?.text  ?? '';
    this._align = opts?.align ?? 'left';
    this.rebuild();
  }

  get text(): string { return this._text; }
  set text(value: string) {
    this._text = value;
    this.rebuild();
  }

  get font(): BitmapFont { return this._font; }

  get align(): TextAlign { return this._align; }
  set align(value: TextAlign) {
    this._align = value;
    this.rebuild();
  }

  /**
   * 从当前 text + font 重新生成几何体。
   * 每个可见字符生成 4 顶点 / 6 索引的 quad。
   */
  rebuild(): void {
    const font  = this._font;
    const text  = this._text;

    // 计算文字总宽度（用于对齐偏移）
    const { width: totalWidth } = font.measureText(text);

    let alignOffset = 0;
    if (this._align === 'center') alignOffset = -totalWidth / 2;
    else if (this._align === 'right') alignOffset = -totalWidth;

    // 第一遍：统计可见字符数量（提前分配 TypedArray）
    let visibleCount = 0;
    for (const ch of text) {
      const cd = font.getChar(ch.charCodeAt(0));
      if (cd && cd.width > 0) visibleCount++;
    }

    const positions = new Float32Array(visibleCount * 4 * 3); // xyz × 4 verts
    const uvs       = new Float32Array(visibleCount * 4 * 2); // uv  × 4 verts
    const indices   = new Uint16Array(visibleCount * 6);      // 2 triangles × 3

    let cursor  = 0; // X 光标（像素单位）
    let qi      = 0; // quad 计数

    for (const ch of text) {
      const cd = font.getChar(ch.charCodeAt(0));
      if (!cd) continue; // 未知字符跳过

      if (cd.width > 0) {
        // 可见字符：生成 quad
        const x0 = cursor + cd.xoffset + alignOffset;
        const y0 = -cd.yoffset;           // 顶部 y（WebGL Y 轴向上）
        const x1 = x0 + cd.width;
        const y1 = y0 - cd.height;        // 底部 y

        // UV（归一化到 [0,1]）
        const u0 = cd.x / font.scaleW;
        const v0 = cd.y / font.scaleH;
        const u1 = (cd.x + cd.width)  / font.scaleW;
        const v1 = (cd.y + cd.height) / font.scaleH;

        const vi = qi * 4; // 顶点起始索引
        const pi = vi * 3; // position 数组起始
        const ui = vi * 2; // UV 数组起始

        // 4 个顶点：左上、右上、右下、左下
        positions[pi + 0] = x0; positions[pi + 1] = y0; positions[pi + 2] = 0;
        positions[pi + 3] = x1; positions[pi + 4] = y0; positions[pi + 5] = 0;
        positions[pi + 6] = x1; positions[pi + 7] = y1; positions[pi + 8] = 0;
        positions[pi + 9] = x0; positions[pi + 10] = y1; positions[pi + 11] = 0;

        uvs[ui + 0] = u0; uvs[ui + 1] = v0;
        uvs[ui + 2] = u1; uvs[ui + 3] = v0;
        uvs[ui + 4] = u1; uvs[ui + 5] = v1;
        uvs[ui + 6] = u0; uvs[ui + 7] = v1;

        // 2 个三角形（CCW winding，从相机 +Z 方向观察）
        const ii = qi * 6;
        indices[ii + 0] = vi + 0; indices[ii + 1] = vi + 2; indices[ii + 2] = vi + 1;
        indices[ii + 3] = vi + 0; indices[ii + 4] = vi + 3; indices[ii + 5] = vi + 2;

        qi++;
      }

      cursor += cd.xadvance;
    }

    this.geometry = new Geometry({ positions, uvs, indices });
  }
}
