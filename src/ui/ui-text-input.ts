/**
 * UITextInput — 文本输入框 UI 元素。
 * 用于玩家名 / 聊天 / 搜索 / 作弊码等输入场景。
 */

import { UIElement, type UIElementOptions } from './ui-element';
import { vec3, type Vec3 } from '../math/vec3';
import type { BitmapFontData } from '../renderer/bitmap-font';

export interface UITextInputOptions extends UIElementOptions {
  value?: string;
  placeholder?: string;
  maxLength?: number;
  fontSize?: number;
  textColor?: Vec3;
  placeholderColor?: Vec3;
  backgroundColor?: Vec3;
  focusedColor?: Vec3;
  font?: BitmapFontData;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
}

export class UITextInput extends UIElement {
  value: string;
  placeholder: string;
  maxLength: number;
  fontSize: number;
  textColor: Vec3;
  placeholderColor: Vec3;
  backgroundColor: Vec3;
  focusedColor: Vec3;
  font: BitmapFontData | null;
  onChange: ((value: string) => void) | null;
  onSubmit: ((value: string) => void) | null;
  disabled: boolean;
  focused: boolean;

  constructor(options?: UITextInputOptions) {
    super({ ...options, interactive: true });
    this.value = options?.value ?? '';
    this.placeholder = options?.placeholder ?? '';
    this.maxLength = options?.maxLength ?? Infinity;
    this.fontSize = options?.fontSize ?? 16;
    this.textColor = options?.textColor ?? vec3(1, 1, 1);
    this.placeholderColor = options?.placeholderColor ?? vec3(0.5, 0.5, 0.5);
    this.backgroundColor = options?.backgroundColor ?? vec3(0.2, 0.2, 0.2);
    this.focusedColor = options?.focusedColor ?? vec3(0.3, 0.3, 0.3);
    this.font = options?.font ?? null;
    this.onChange = options?.onChange ?? null;
    this.onSubmit = options?.onSubmit ?? null;
    this.disabled = options?.disabled ?? false;
    this.focused = false;
  }

  focus(): void {
    if (this.disabled) return;
    this.focused = true;
  }

  blur(): void {
    this.focused = false;
  }

  setValue(value: string): void {
    const prev = this.value;
    this.value = value;
    if (this.value !== prev) {
      this.onChange?.(this.value);
    }
  }

  handleKeyDown(key: string): void {
    if (!this.focused || this.disabled) return;

    if (key === 'Backspace') {
      const prev = this.value;
      this.value = this.value.slice(0, -1);
      if (this.value !== prev) {
        this.onChange?.(this.value);
      }
    } else if (key === 'Enter') {
      this.onSubmit?.(this.value);
    } else if (key === 'Escape') {
      this.blur();
    } else if (key.length === 1) {
      if (this.value.length < this.maxLength) {
        this.value += key;
        this.onChange?.(this.value);
      }
    }
  }

  getVertices(): Float32Array {
    const { x, y, width, height } = this;
    return new Float32Array([
      x,         y,
      x + width, y,
      x + width, y + height,
      x,         y + height,
    ]);
  }
}
