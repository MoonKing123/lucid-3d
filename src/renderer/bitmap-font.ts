/**
 * BitmapFont — BMFont .fnt 文本格式解析器 + 字符布局数据容器
 * 供 BitmapText 使用，提供字符 quad 生成和文字宽度度量。
 */

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

/** 解析一行 key=value 对，如 `lineHeight=36 base=28 scaleW=256` */
function parseKV(line: string): Record<string, string> {
  const result: Record<string, string> = {};
  // 匹配 key=value 或 key="value with spaces"
  const re = /(\w+)=("(?:[^"\\]|\\.)*"|[^\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    result[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return result;
}

export class BitmapFont {
  readonly lineHeight: number;
  readonly base: number;
  readonly scaleW: number;
  readonly scaleH: number;
  readonly chars: Map<number, BitmapCharData>;
  readonly texture: Texture;

  constructor(data: BitmapFontData, texture: Texture) {
    this.lineHeight = data.lineHeight;
    this.base       = data.base;
    this.scaleW     = data.scaleW;
    this.scaleH     = data.scaleH;
    this.chars      = data.chars;
    this.texture    = texture;
  }

  /**
   * 解析 BMFont 文本格式 .fnt 字符串。
   * 支持的行类型：common、char（解析各字符属性）。
   */
  static parse(fntText: string, texture: Texture): BitmapFont {
    let lineHeight = 0;
    let base = 0;
    let scaleW = 0;
    let scaleH = 0;
    const chars = new Map<number, BitmapCharData>();

    for (const rawLine of fntText.split('\n')) {
      const line = rawLine.trim();
      if (line.startsWith('common ')) {
        const kv = parseKV(line);
        lineHeight = parseInt(kv['lineHeight'] ?? '0', 10);
        base       = parseInt(kv['base']       ?? '0', 10);
        scaleW     = parseInt(kv['scaleW']     ?? '0', 10);
        scaleH     = parseInt(kv['scaleH']     ?? '0', 10);
      } else if (line.startsWith('char ')) {
        const kv = parseKV(line);
        const id = parseInt(kv['id']       ?? '0', 10);
        const ch: BitmapCharData = {
          id,
          x:        parseInt(kv['x']        ?? '0', 10),
          y:        parseInt(kv['y']        ?? '0', 10),
          width:    parseInt(kv['width']    ?? '0', 10),
          height:   parseInt(kv['height']   ?? '0', 10),
          xoffset:  parseInt(kv['xoffset']  ?? '0', 10),
          yoffset:  parseInt(kv['yoffset']  ?? '0', 10),
          xadvance: parseInt(kv['xadvance'] ?? '0', 10),
        };
        chars.set(id, ch);
      }
    }

    return new BitmapFont({ lineHeight, base, scaleW, scaleH, chars }, texture);
  }

  getChar(charCode: number): BitmapCharData | undefined {
    return this.chars.get(charCode);
  }

  /**
   * 测量字符串的边界框。
   * 宽度 = 除最后一个可见字符外，所有已知字符的 xadvance 之和
   *       + 最后一个可见字符的 (xoffset + width)
   * 高度 = lineHeight（单行）
   * 空字符串 width=0, height=lineHeight
   */
  measureText(text: string): { width: number; height: number } {
    let cursor = 0;
    let lastVisibleEndX = 0;

    for (const ch of text) {
      const charData = this.chars.get(ch.charCodeAt(0));
      if (!charData) continue; // 未知字符跳过
      if (charData.width > 0) {
        // 可见字符：记录其右边缘位置
        lastVisibleEndX = cursor + charData.xoffset + charData.width;
      }
      cursor += charData.xadvance;
    }

    return { width: lastVisibleEndX, height: this.lineHeight };
  }
}
