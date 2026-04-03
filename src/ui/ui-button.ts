/**
 * UIButton — 可交互按钮 UI 元素。
 * 支持 normal/pressed/disabled 三种视觉状态、标签文字、onClick 回调。
 * 简化游戏菜单/暂停/重启等常见按钮场景。
 * @see test/unit/ui/ui-button.test.ts
 */

export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';
import type { BitmapFontData } from '../renderer/bitmap-font';
import { UIElement, type UIElementOptions } from './ui-element';

export interface UIButtonOptions extends UIElementOptions {
  label?: string;
  fontSize?: number;
  textColor?: Vec3;
  normalColor?: Vec3;
  pressedColor?: Vec3;
  disabledColor?: Vec3;
  onClick?: () => void;
  disabled?: boolean;
  font?: BitmapFontData;
}

export class UIButton extends UIElement {
  label: string;
  fontSize: number;
  textColor: Vec3;
  normalColor: Vec3;
  pressedColor: Vec3;
  disabledColor: Vec3;
  disabled: boolean;
  isPressed: boolean;
  onClick: (() => void) | null;
  font: BitmapFontData | null;

  constructor(_options?: UIButtonOptions) {
    super();
    throw new Error('STUB');
  }

  handlePointerDown(_x: number, _y: number): void { throw new Error('STUB'); }
  handlePointerUp(_x: number, _y: number): void { throw new Error('STUB'); }
  getCurrentColor(): Vec3 { throw new Error('STUB'); }
  getVertices(): Float32Array { throw new Error('STUB'); }
}
