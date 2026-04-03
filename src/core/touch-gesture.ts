/**
 * TouchGesture — 触摸手势识别器。
 * 基于 InputManager 的 pointer 事件识别 swipe/tap/double-tap/long-press。
 * 面向微信/抖音小游戏平台的移动端手势交互。
 * @see test/unit/core/touch-gesture.test.ts
 */

export const __STUB__ = true;

import type { InputManager } from './input';

export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TapEvent {
  x: number;
  y: number;
  ndcX: number;
  ndcY: number;
}

export interface LongPressEvent {
  x: number;
  y: number;
  ndcX: number;
  ndcY: number;
  duration: number;
}

export interface TouchGestureOptions {
  /** 触发 swipe 的最小滑动距离（像素），默认 50 */
  swipeThreshold?: number;
  /** 触发 swipe 的最小速度（像素/秒），默认 200 */
  swipeVelocityThreshold?: number;
  /** tap 最大持续时间（毫秒），默认 300 */
  tapMaxDuration?: number;
  /** tap 最大移动距离（像素），默认 10 */
  tapMaxDistance?: number;
  /** 长按触发延迟（毫秒），默认 500 */
  longPressDelay?: number;
  /** 双击最大间隔（毫秒），默认 300 */
  doubleTapInterval?: number;
}

export type SwipeCallback = (e: SwipeEvent) => void;
export type TapCallback = (e: TapEvent) => void;
export type LongPressCallback = (e: LongPressEvent) => void;

export class TouchGesture {
  constructor(_input: InputManager, _options?: TouchGestureOptions) {
    // stub
  }

  onSwipe(_callback: SwipeCallback): void { /* stub */ }
  onTap(_callback: TapCallback): void { /* stub */ }
  onDoubleTap(_callback: TapCallback): void { /* stub */ }
  onLongPress(_callback: LongPressCallback): void { /* stub */ }

  offSwipe(_callback: SwipeCallback): void { /* stub */ }
  offTap(_callback: TapCallback): void { /* stub */ }
  offDoubleTap(_callback: TapCallback): void { /* stub */ }
  offLongPress(_callback: LongPressCallback): void { /* stub */ }

  dispose(): void { /* stub */ }
}
