/**
 * UIProgressBar — 进度条 UI 元素。
 * 可配置填充方向、背景色、填充色、边框。
 * 用于血量条、经验条、加载进度等。
 * @see test/unit/ui/ui-progress-bar.test.ts
 */

export const __STUB__ = true;

import { UIElement, type UIElementOptions, type ScreenBounds } from './ui-element';
import type { Vec3 } from '../math/vec3';

export type BarDirection = 'leftToRight' | 'rightToLeft' | 'bottomToTop' | 'topToBottom';

export interface UIProgressBarOptions extends UIElementOptions {
  value?: number;
  fillColor?: Vec3;
  backgroundColor?: Vec3;
  borderColor?: Vec3;
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

  constructor(_options?: UIProgressBarOptions) {
    super(_options);
    throw new Error('STUB');
  }

  /** 设置进度值（自动 clamp 到 [0, 1]） */
  setValue(_v: number): void { throw new Error('STUB'); }

  /** 计算填充区域的屏幕包围框（基于 value 和 direction） */
  getFillBounds(): ScreenBounds { throw new Error('STUB'); }
}
