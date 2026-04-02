/**
 * STUB — Tween (not yet implemented).
 * Property animation with easing functions.
 * @see test/unit/animation/tween.test.ts
 */
export const __STUB__ = true;

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeInQuad: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeOutQuad: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeInOutQuad: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeInCubic: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeOutCubic: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeInOutCubic: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
  easeInOutSine: ((_t: number): number => { throw new Error('Not implemented'); }) as EasingFn,
};

export class Tween<T extends Record<string, number> = Record<string, number>> {
  constructor(_target: T) {}
  to(_end: Partial<T>, _duration: number): this { throw new Error('Not implemented'); }
  easing(_fn: EasingFn): this { throw new Error('Not implemented'); }
  onUpdate(_callback: (target: T) => void): this { throw new Error('Not implemented'); }
  onComplete(_callback: () => void): this { throw new Error('Not implemented'); }
  start(): this { throw new Error('Not implemented'); }
  update(_elapsed: number): boolean { throw new Error('Not implemented'); }
  stop(): void { throw new Error('Not implemented'); }
  get isRunning(): boolean { throw new Error('Not implemented'); }
}
