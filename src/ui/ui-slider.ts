/**
 * UISlider — 可拖动滑块 UI 元素。
 * 用于音量 / 亮度 / 难度 / 游戏速度等范围参数调节。
 * @see test/unit/ui/ui-slider.test.ts
 */

import { UIElement, type UIElementOptions } from './ui-element';
import { vec3, type Vec3 } from '../math/vec3';

export interface UISliderOptions extends UIElementOptions {
  min?: number;
  max?: number;
  value?: number;
  step?: number;
  trackColor?: Vec3;
  fillColor?: Vec3;
  handleColor?: Vec3;
  handleRadius?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export class UISlider extends UIElement {
  min: number;
  max: number;
  value: number;
  step: number;
  trackColor: Vec3;
  fillColor: Vec3;
  handleColor: Vec3;
  handleRadius: number;
  onChange: ((value: number) => void) | null;
  disabled: boolean;
  isPressed: boolean;

  constructor(options?: UISliderOptions) {
    super({ interactive: true, ...options });
    const min = options?.min ?? 0;
    const max = options?.max ?? 1;
    if (min >= max) throw new Error(`UISlider: min (${min}) must be less than max (${max})`);
    this.min = min;
    this.max = max;
    this.step = options?.step ?? 0;
    this.trackColor = options?.trackColor ?? vec3(0.3, 0.3, 0.3);
    this.fillColor = options?.fillColor ?? vec3(0.2, 0.6, 1);
    this.handleColor = options?.handleColor ?? vec3(1, 1, 1);
    this.handleRadius = options?.handleRadius ?? (this.height / 2);
    this.onChange = options?.onChange ?? null;
    this.disabled = options?.disabled ?? false;
    this.isPressed = false;
    this.value = options?.value ?? min;
  }

  setValue(v: number): void {
    const clamped = Math.max(this.min, Math.min(this.max, v));
    const quantized = this._quantize(clamped);
    if (quantized === this.value) return;
    this.value = quantized;
    this.onChange?.(this.value);
  }

  getNormalizedValue(): number {
    return (this.value - this.min) / (this.max - this.min);
  }

  handlePointerDown(x: number, _y: number): void {
    if (this.disabled) return;
    this.isPressed = true;
    this._updateValueFromX(x);
  }

  handlePointerMove(x: number, _y: number): void {
    if (this.disabled || !this.isPressed) return;
    this._updateValueFromX(x);
  }

  handlePointerUp(_x: number, _y: number): void {
    if (this.disabled) return;
    this.isPressed = false;
  }

  getVertices(): Float32Array {
    const b = this.getScreenBounds();
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.width;
    const y1 = b.y + b.height;
    return new Float32Array([
      x0, y0, 0, 0,
      x0, y1, 0, 1,
      x1, y0, 1, 0,
      x0, y1, 0, 1,
      x1, y1, 1, 1,
      x1, y0, 1, 0,
    ]);
  }

  private _updateValueFromX(x: number): void {
    const b = this.getScreenBounds();
    const ratio = Math.max(0, Math.min(1, (x - b.x) / b.width));
    this.setValue(this.min + ratio * (this.max - this.min));
  }

  private _quantize(v: number): number {
    if (this.step <= 0) return v;
    return this.min + Math.round((v - this.min) / this.step) * this.step;
  }
}
