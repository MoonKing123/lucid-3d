/**
 * UIText — 屏幕空间文字 UI 元素。
 * 使用 BitmapFont 在像素坐标系中渲染文字。
 * 支持字号缩放、颜色、对齐方式。
 * @see test/unit/ui/ui-text.test.ts
 */

export const __STUB__ = true;

import { UIElement, type UIElementOptions } from './ui-element';
import type { BitmapFontData } from '../renderer/bitmap-font';
import type { Vec3 } from '../math/vec3';

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

  constructor(_options: UITextOptions) {
    super(_options);
    throw new Error('STUB');
  }

  /** 计算当前文本的像素宽度（基于 font metrics × fontSize 缩放） */
  measureWidth(): number { throw new Error('STUB'); }
}
