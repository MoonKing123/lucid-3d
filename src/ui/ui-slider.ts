/**
 * UISlider — 可拖动滑块 UI 元素（STUB）。
 * 用于音量 / 亮度 / 难度 / 游戏速度等范围参数调节。
 * 核心能力：value [0, 1] + min/max 映射 + 拖动交互 + onChange 回调。
 * @see test/unit/ui/ui-slider.test.ts
 */

export const __STUB__ = true;

export interface UISliderOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  value?: number;
  step?: number;
  trackColor?: unknown;
  fillColor?: unknown;
  handleColor?: unknown;
  handleRadius?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export class UISlider {
  constructor(_options?: UISliderOptions) {
    throw new Error('UISlider is a stub — implement in Phase 46 #<issue>');
  }
}
