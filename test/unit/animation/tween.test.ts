/**
 * Pre-written tests for Tween — property animation with easing.
 * AI must implement src/animation/tween.ts to make these pass.
 *
 * API — Easing:
 *   type EasingFn = (t: number) => number;  // t in [0,1], returns [0,1]
 *   Easing.linear, easeInQuad, easeOutQuad, easeInOutQuad,
 *          easeInCubic, easeOutCubic, easeInOutCubic, easeInOutSine
 *
 * API — Tween<T>:
 *   class Tween<T extends Record<string, number>> {
 *     constructor(target: T);               // the object to animate
 *     to(end: Partial<T>, duration: number): this;  // set end values + duration (seconds)
 *     easing(fn: EasingFn): this;           // set easing (default: linear)
 *     onUpdate(cb: (target: T) => void): this;  // called each update
 *     onComplete(cb: () => void): this;     // called when done
 *     start(): this;                        // begin (records start values snapshot)
 *     update(elapsed: number): boolean;     // advance to elapsed seconds since start(); returns true if still running
 *     stop(): void;                         // abort the tween
 *     get isRunning(): boolean;
 *   }
 *
 * Implementation notes:
 * - update(elapsed) receives absolute elapsed time since start(), not delta
 * - Tween mutates the original target object directly
 * - start() snapshots current target values as start values
 * - At t>=duration, snap to end values and fire onComplete exactly once
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/animation/tween';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Tween, Easing } = mod;

/* ───────────── Easing functions ───────────── */

describeImpl('Easing functions', () => {
  it('linear(0)=0, linear(1)=1, linear(0.5)=0.5', () => {
    expect(Easing.linear(0)).toBeCloseTo(0);
    expect(Easing.linear(1)).toBeCloseTo(1);
    expect(Easing.linear(0.5)).toBeCloseTo(0.5);
  });

  it('easeInQuad(0)=0, easeInQuad(1)=1', () => {
    expect(Easing.easeInQuad(0)).toBeCloseTo(0);
    expect(Easing.easeInQuad(1)).toBeCloseTo(1);
  });

  it('easeInQuad should accelerate (value < t for middle)', () => {
    expect(Easing.easeInQuad(0.5)).toBeLessThan(0.5);
  });

  it('easeOutQuad should decelerate (value > t for middle)', () => {
    expect(Easing.easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });

  it('easeInOutQuad(0)=0, easeInOutQuad(1)=1, easeInOutQuad(0.5)=0.5', () => {
    expect(Easing.easeInOutQuad(0)).toBeCloseTo(0);
    expect(Easing.easeInOutQuad(1)).toBeCloseTo(1);
    expect(Easing.easeInOutQuad(0.5)).toBeCloseTo(0.5);
  });

  it('easeInCubic should be slower start than easeInQuad', () => {
    expect(Easing.easeInCubic(0.5)).toBeLessThan(Easing.easeInQuad(0.5));
  });

  it('easeOutCubic(0)=0, easeOutCubic(1)=1', () => {
    expect(Easing.easeOutCubic(0)).toBeCloseTo(0);
    expect(Easing.easeOutCubic(1)).toBeCloseTo(1);
  });

  it('easeInOutSine(0)=0, easeInOutSine(1)=1', () => {
    expect(Easing.easeInOutSine(0)).toBeCloseTo(0);
    expect(Easing.easeInOutSine(1)).toBeCloseTo(1);
  });

  it('all easing functions should be monotonically increasing on [0,1]', () => {
    const fns: mod.EasingFn[] = [
      Easing.linear, Easing.easeInQuad, Easing.easeOutQuad, Easing.easeInOutQuad,
      Easing.easeInCubic, Easing.easeOutCubic, Easing.easeInOutCubic, Easing.easeInOutSine,
    ];
    for (const fn of fns) {
      let prev = fn(0);
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const curr = fn(t);
        expect(curr).toBeGreaterThanOrEqual(prev - 1e-10);
        prev = curr;
      }
    }
  });
});

/* ───────────── Tween construction ───────────── */

describeImpl('Tween — construction', () => {
  it('should not be running initially', () => {
    const obj = { x: 0, y: 0 };
    const tw = new Tween(obj);
    expect(tw.isRunning).toBe(false);
  });

  it('to() should be chainable', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj).to({ x: 10 }, 1);
    expect(tw).toBeInstanceOf(Tween);
  });
});

/* ───────────── Tween animation ───────────── */

describeImpl('Tween — linear animation', () => {
  it('should interpolate to end value over duration', () => {
    const obj = { x: 0, y: 0 };
    const tw = new Tween(obj)
      .to({ x: 100, y: 50 }, 1)
      .easing(Easing.linear)
      .start();

    tw.update(0.5);
    expect(obj.x).toBeCloseTo(50);
    expect(obj.y).toBeCloseTo(25);
  });

  it('should snap to end values when elapsed >= duration', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj)
      .to({ x: 100 }, 1)
      .start();

    tw.update(2.0);
    expect(obj.x).toBeCloseTo(100);
  });

  it('should return true while running, false when done', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj).to({ x: 10 }, 1).start();

    expect(tw.update(0.5)).toBe(true);
    expect(tw.update(1.0)).toBe(false);
  });

  it('should not be running after completion', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj).to({ x: 10 }, 1).start();
    tw.update(1.5);
    expect(tw.isRunning).toBe(false);
  });
});

/* ───────────── Tween with easing ───────────── */

describeImpl('Tween — eased animation', () => {
  it('easeInQuad should move slower at start', () => {
    const linear = { x: 0 };
    const eased = { x: 0 };

    new Tween(linear).to({ x: 100 }, 1).easing(Easing.linear).start().update(0.3);
    new Tween(eased).to({ x: 100 }, 1).easing(Easing.easeInQuad).start().update(0.3);

    expect(eased.x).toBeLessThan(linear.x);
  });

  it('easeOutQuad should move faster at start', () => {
    const linear = { x: 0 };
    const eased = { x: 0 };

    new Tween(linear).to({ x: 100 }, 1).easing(Easing.linear).start().update(0.3);
    new Tween(eased).to({ x: 100 }, 1).easing(Easing.easeOutQuad).start().update(0.3);

    expect(eased.x).toBeGreaterThan(linear.x);
  });
});

/* ───────────── Callbacks ───────────── */

describeImpl('Tween — callbacks', () => {
  it('onUpdate should be called on each update()', () => {
    const obj = { x: 0 };
    const spy = vi.fn();
    const tw = new Tween(obj).to({ x: 10 }, 1).onUpdate(spy).start();

    tw.update(0.3);
    tw.update(0.6);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it('onComplete should fire exactly once when done', () => {
    const obj = { x: 0 };
    const spy = vi.fn();
    const tw = new Tween(obj).to({ x: 10 }, 1).onComplete(spy).start();

    tw.update(0.9);
    expect(spy).not.toHaveBeenCalled();

    tw.update(1.0);
    expect(spy).toHaveBeenCalledTimes(1);

    tw.update(1.5);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onUpdate should NOT be called after completion', () => {
    const obj = { x: 0 };
    const spy = vi.fn();
    const tw = new Tween(obj).to({ x: 10 }, 1).onUpdate(spy).start();

    tw.update(1.0);
    spy.mockClear();

    tw.update(1.5);
    expect(spy).not.toHaveBeenCalled();
  });
});

/* ───────────── stop ───────────── */

describeImpl('Tween — stop', () => {
  it('stop() should halt animation at current value', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj).to({ x: 100 }, 1).start();

    tw.update(0.5);
    const valueAtStop = obj.x;
    tw.stop();

    tw.update(1.0);
    expect(obj.x).toBeCloseTo(valueAtStop);
    expect(tw.isRunning).toBe(false);
  });
});

/* ───────────── Partial and non-zero start ───────────── */

describeImpl('Tween — partial property animation', () => {
  it('should only animate specified properties', () => {
    const obj = { x: 10, y: 20, z: 30 };
    const tw = new Tween(obj).to({ x: 100 }, 1).start();

    tw.update(1.0);
    expect(obj.x).toBeCloseTo(100);
    expect(obj.y).toBeCloseTo(20);
    expect(obj.z).toBeCloseTo(30);
  });
});

describeImpl('Tween — non-zero start values', () => {
  it('should interpolate from current value, not from zero', () => {
    const obj = { x: 50 };
    const tw = new Tween(obj).to({ x: 150 }, 1).start();

    tw.update(0.5);
    expect(obj.x).toBeCloseTo(100); // 50 + (150-50)*0.5
  });
});
