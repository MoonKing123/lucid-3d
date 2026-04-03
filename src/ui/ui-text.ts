/**
 * UIText — 屏幕空间文字 UI 元素。
 * 使用 BitmapFont 在像素坐标系中渲染文字。
 * 支持字号缩放、颜色、对齐方式。
 * @see test/unit/ui/ui-text.test.ts
 */

import { UIElement, type UIElementOptions } from './ui-element';
import type { BitmapFontData } from '../renderer/bitmap-font';
import { vec3, type Vec3 } from '../math/vec3';

export type TextAlign = 'left' | 'center' | 'right';

export interface UITextOptions extends UIElementOptions {
  font: BitmapFontData;
  text?: string;
  fontSize?: number;
  color?: Vec3;
  align?: TextAlign;
}

export class UIText extends UIElement {
  font: BitmapFontData;
  text: string;
  fontSize: number;
  color: Vec3;
  align: TextAlign;

  constructor(options: UITextOptions) {
    super(options);
    this.font = options.font;
    this.text = options.text ?? '';
    this.fontSize = options.fontSize ?? options.font.lineHeight;
    this.color = options.color ?? vec3(1, 1, 1);
    this.align = options.align ?? 'left';
  }

  /** 计算当前文本的像素宽度（基于 font metrics × fontSize 缩放） */
  measureWidth(): number {
    let cursor = 0;
    let lastVisibleEndX = 0;

    for (const ch of this.text) {
      const charData = this.font.chars.get(ch.charCodeAt(0));
      if (!charData) continue;
      if (charData.width > 0) {
        lastVisibleEndX = cursor + charData.xoffset + charData.width;
      }
      cursor += charData.xadvance;
    }

    const scale = this.fontSize / this.font.lineHeight;
    return lastVisibleEndX * scale;
  }
}
