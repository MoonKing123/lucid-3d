/**
 * TouchGesture — 触摸手势识别器。
 * 基于 InputManager 的 pointer 事件识别 swipe/tap/double-tap/long-press。
 * 面向微信/抖音小游戏平台的移动端手势交互。
 * @see test/unit/core/touch-gesture.test.ts
 */

import type { InputManager, InputEventData } from './input';

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
  private input: InputManager;
  private opts: Required<TouchGestureOptions>;

  private swipeCallbacks = new Set<SwipeCallback>();
  private tapCallbacks = new Set<TapCallback>();
  private doubleTapCallbacks = new Set<TapCallback>();
  private longPressCallbacks = new Set<LongPressCallback>();

  private startX = 0;
  private startY = 0;
  private startNdcX = 0;
  private startNdcY = 0;
  private startTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private lastTapTime: number | null = null;

  private readonly handleDown: (e: InputEventData) => void;
  private readonly handleMove: (e: InputEventData) => void;
  private readonly handleUp: (e: InputEventData) => void;

  constructor(input: InputManager, options?: TouchGestureOptions) {
    this.input = input;
    this.opts = {
      swipeThreshold: options?.swipeThreshold ?? 50,
      swipeVelocityThreshold: options?.swipeVelocityThreshold ?? 200,
      tapMaxDuration: options?.tapMaxDuration ?? 300,
      tapMaxDistance: options?.tapMaxDistance ?? 10,
      longPressDelay: options?.longPressDelay ?? 500,
      doubleTapInterval: options?.doubleTapInterval ?? 300,
    };

    this.handleDown = (e) => {
      this.startX = e.x!;
      this.startY = e.y!;
      this.startNdcX = e.ndcX!;
      this.startNdcY = e.ndcY!;
      this.startTime = Date.now();
      this.clearLongPressTimer();
      this.longPressTimer = setTimeout(() => {
        const duration = Date.now() - this.startTime;
        for (const cb of this.longPressCallbacks) {
          cb({ x: this.startX, y: this.startY, ndcX: this.startNdcX, ndcY: this.startNdcY, duration });
        }
      }, this.opts.longPressDelay);
    };

    this.handleMove = (_e) => {
      this.clearLongPressTimer();
    };

    this.handleUp = (e) => {
      this.clearLongPressTimer();

      const endX = e.x!;
      const endY = e.y!;
      const duration = Date.now() - this.startTime;

      const dx = endX - this.startX;
      const dy = endY - this.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = duration > 0 ? distance / (duration / 1000) : Infinity;

      // 滑动检测：距离和速度都超过阈值
      if (distance > this.opts.swipeThreshold && velocity > this.opts.swipeVelocityThreshold) {
        let direction: SwipeEvent['direction'];
        if (Math.abs(dx) >= Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
        for (const cb of this.swipeCallbacks) {
          cb({ direction, distance, velocity, startX: this.startX, startY: this.startY, endX, endY });
        }
        return;
      }

      // 点击检测：移动距离和持续时间都在阈值内
      if (distance < this.opts.tapMaxDistance && duration < this.opts.tapMaxDuration) {
        const now = Date.now();
        if (this.lastTapTime !== null && now - this.lastTapTime < this.opts.doubleTapInterval) {
          // 双击
          this.lastTapTime = null;
          for (const cb of this.doubleTapCallbacks) {
            cb({ x: endX, y: endY, ndcX: e.ndcX!, ndcY: e.ndcY! });
          }
        } else {
          // 单击
          this.lastTapTime = now;
          for (const cb of this.tapCallbacks) {
            cb({ x: endX, y: endY, ndcX: e.ndcX!, ndcY: e.ndcY! });
          }
        }
      }
    };

    this.input.on('pointerdown', this.handleDown);
    this.input.on('pointermove', this.handleMove);
    this.input.on('pointerup', this.handleUp);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== undefined) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  onSwipe(callback: SwipeCallback): void { this.swipeCallbacks.add(callback); }
  onTap(callback: TapCallback): void { this.tapCallbacks.add(callback); }
  onDoubleTap(callback: TapCallback): void { this.doubleTapCallbacks.add(callback); }
  onLongPress(callback: LongPressCallback): void { this.longPressCallbacks.add(callback); }

  offSwipe(callback: SwipeCallback): void { this.swipeCallbacks.delete(callback); }
  offTap(callback: TapCallback): void { this.tapCallbacks.delete(callback); }
  offDoubleTap(callback: TapCallback): void { this.doubleTapCallbacks.delete(callback); }
  offLongPress(callback: LongPressCallback): void { this.longPressCallbacks.delete(callback); }

  dispose(): void {
    this.clearLongPressTimer();
    this.input.off('pointerdown', this.handleDown);
    this.input.off('pointermove', this.handleMove);
    this.input.off('pointerup', this.handleUp);
    this.swipeCallbacks.clear();
    this.tapCallbacks.clear();
    this.doubleTapCallbacks.clear();
    this.longPressCallbacks.clear();
  }
}
