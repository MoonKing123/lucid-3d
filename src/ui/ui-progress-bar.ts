/**
 * UIProgressBar — 进度条 UI 元素。
 * 可配置填充方向、背景色、填充色、边框。
 * 用于血量条、经验条、加载进度等。
 * @see test/unit/ui/ui-progress-bar.test.ts
 */

import { UIElement, type UIElementOptions, type ScreenBounds } from './ui-element';
import { vec3, type Vec3 } from '../math/vec3';

export type BarDirection = 'leftToRight' | 'rightToLeft' | 'bottomToTop' | 'topToBottom';

export interface UIProgressBarOptions extends UIElementOptions {
  value?: number;
  fillColor?: Vec3;
  backgroundColor?: Vec3;
  borderColor?: Vec3 | null;
  borderWidth?: number;
  direction?: BarDirection;
}

export class UIProgressBar extends UIElement {
  value: number;
  fillColor: Vec3;
  backgroundColor: Vec3;
  borderColor: Vec3 | null;
  borderWidth: number;
  direction: BarDirection;

  constructor(options?: UIProgressBarOptions) {
    super(options);
    this.value = options?.value ?? 0;
    this.fillColor = options?.fillColor ?? vec3(0, 1, 0);
    this.backgroundColor = options?.backgroundColor ?? vec3(0.2, 0.2, 0.2);
    this.borderColor = options?.borderColor ?? null;
    this.borderWidth = options?.borderWidth ?? 0;
    this.direction = options?.direction ?? 'leftToRight';
  }

  /** 设置进度值（自动 clamp 到 [0, 1]） */
  setValue(v: number): void {
    this.value = Math.max(0, Math.min(1, v));
  }

  /** 计算填充区域的屏幕包围框（基于 value 和 direction） */
  getFillBounds(): ScreenBounds {
    const bounds = this.getScreenBounds();
    const { x, y, width, height } = bounds;
    const v = this.value;

    switch (this.direction) {
      case 'leftToRight':
        return { x, y, width: width * v, height };
      case 'rightToLeft':
        return { x: x + width * (1 - v), y, width: width * v, height };
      case 'bottomToTop':
        return { x, y: y + height * (1 - v), width, height: height * v };
      case 'topToBottom':
        return { x, y, width, height: height * v };
    }
  }
}
