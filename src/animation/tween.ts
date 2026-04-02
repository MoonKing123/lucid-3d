/**
 * Tween — 属性动画与缓动函数
 * 对任意数字属性对象做缓动插值动画。
 */

/** 缓动函数签名：t ∈ [0,1] → [0,1] */
export type EasingFn = (t: number) => number;

/** 8 种标准缓动函数 */
export const Easing: {
  linear: EasingFn;
  easeInQuad: EasingFn;
  easeOutQuad: EasingFn;
  easeInOutQuad: EasingFn;
  easeInCubic: EasingFn;
  easeOutCubic: EasingFn;
  easeInOutCubic: EasingFn;
  easeInOutSine: EasingFn;
} = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - 4 * (1 - t) * (1 - t) * (1 - t),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export class Tween<T extends Record<string, number>> {
  private _target: T;
  private _end: Partial<T> = {};
  private _duration = 0;
  private _easingFn: EasingFn = Easing.linear;
  private _onUpdateCb: ((target: T) => void) | null = null;
  private _onCompleteCb: (() => void) | null = null;
  private _startValues: Partial<T> = {};
  private _running = false;
  private _completed = false;

  constructor(target: T) {
    this._target = target;
  }

  to(end: Partial<T>, duration: number): this {
    this._end = end;
    this._duration = duration;
    return this;
  }

  easing(fn: EasingFn): this {
    this._easingFn = fn;
    return this;
  }

  onUpdate(callback: (target: T) => void): this {
    this._onUpdateCb = callback;
    return this;
  }

  onComplete(callback: () => void): this {
    this._onCompleteCb = callback;
    return this;
  }

  start(): this {
    // 快照当前目标值作为起点
    this._startValues = {} as Partial<T>;
    for (const key in this._end) {
      (this._startValues as Record<string, number>)[key] = (this._target as Record<string, number>)[key];
    }
    this._running = true;
    this._completed = false;
    return this;
  }

  update(elapsed: number): boolean {
    if (!this._running) return false;

    if (elapsed >= this._duration) {
      // snap 到终值
      for (const key in this._end) {
        (this._target as Record<string, number>)[key] = (this._end as Record<string, number>)[key]!;
      }
      this._running = false;
      this._completed = true;
      if (this._onUpdateCb) this._onUpdateCb(this._target);
      if (this._onCompleteCb) {
        const cb = this._onCompleteCb;
        this._onCompleteCb = null;
        cb();
      }
      return false;
    }

    const t = this._easingFn(elapsed / this._duration);
    for (const key in this._end) {
      const start = (this._startValues as Record<string, number>)[key];
      const end = (this._end as Record<string, number>)[key]!;
      (this._target as Record<string, number>)[key] = start + (end - start) * t;
    }
    if (this._onUpdateCb) this._onUpdateCb(this._target);
    return true;
  }

  stop(): void {
    this._running = false;
  }

  get isRunning(): boolean {
    return this._running;
  }
}
