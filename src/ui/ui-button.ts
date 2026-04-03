/**
 * UIButton — 可交互按钮 UI 元素。
 * 支持 normal/pressed/disabled 三种视觉状态、标签文字、onClick 回调。
 * 简化游戏菜单/暂停/重启等常见按钮场景。
 * @see test/unit/ui/ui-button.test.ts
 */

import { vec3, type Vec3 } from '../math/vec3';
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

  constructor(options?: UIButtonOptions) {
    super({ interactive: true, ...options });
    this.label = options?.label ?? '';
    this.fontSize = options?.fontSize ?? 16;
    this.textColor = options?.textColor ?? vec3(1, 1, 1);
    this.normalColor = options?.normalColor ?? vec3(0.4, 0.4, 0.4);
    this.pressedColor = options?.pressedColor ?? vec3(0.2, 0.2, 0.2);
    this.disabledColor = options?.disabledColor ?? vec3(0.6, 0.6, 0.6);
    this.disabled = options?.disabled ?? false;
    this.isPressed = false;
    this.onClick = options?.onClick ?? null;
    this.font = options?.font ?? null;
  }

  handlePointerDown(_x: number, _y: number): void {
    if (this.disabled) return;
    this.isPressed = true;
  }

  handlePointerUp(_x: number, _y: number): void {
    if (this.disabled) return;
    this.isPressed = false;
    this.onClick?.();
  }

  getCurrentColor(): Vec3 {
    if (this.disabled) return this.disabledColor;
    if (this.isPressed) return this.pressedColor;
    return this.normalColor;
  }

  getVertices(): Float32Array {
    const b = this.getScreenBounds();
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.width;
    const y1 = b.y + b.height;

    return new Float32Array([
      x0, y0, 0, 0,  // 左上
      x0, y1, 0, 1,  // 左下
      x1, y0, 1, 0,  // 右上
      x0, y1, 0, 1,  // 左下
      x1, y1, 1, 1,  // 右下
      x1, y0, 1, 0,  // 右上
    ]);
  }
}
