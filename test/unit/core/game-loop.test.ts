/**
 * Pre-written tests for GameLoop — unified update/render cycle.
 * AI must implement src/core/game-loop.ts to make these pass.
 *
 * API:
 *   interface GameLoopOptions {
 *     fixedTimeStep?: number;  // seconds, default 1/60
 *     maxSubSteps?: number;    // default 3
 *   }
 *
 *   class GameLoop {
 *     running: boolean;
 *     onUpdate: ((dt: number) => void) | null;
 *     onFixedUpdate: ((dt: number) => void) | null;
 *     onRender: (() => void) | null;
 *
 *     constructor(options?: GameLoopOptions);
 *     start(): void;
 *     stop(): void;
 *     step(dt: number): void;  // manual frame advance for testing
 *   }
 *
 * Implementation notes:
 * - step(dt) is the core method: accumulates dt, runs fixedUpdate at fixed intervals,
 *   then calls onUpdate(dt), then onRender()
 * - start() uses requestAnimationFrame + Clock internally
 * - stop() cancels the animation frame
 * - fixedUpdate is called N times per step where N = floor(accumulated / fixedTimeStep),
 *   capped at maxSubSteps
 * - Remaining time is carried over to next step
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mod from '../../../src/core/game-loop';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { GameLoop } = mod;

/* ───────────── Construction ───────────── */

describeImpl('GameLoop — construction', () => {
  it('should default to not running', () => {
    const loop = new GameLoop();
    expect(loop.running).toBe(false);
  });

  it('should accept custom options', () => {
    const loop = new GameLoop({ fixedTimeStep: 1 / 30, maxSubSteps: 5 });
    expect(loop.running).toBe(false);
  });

  it('should have null callbacks by default', () => {
    const loop = new GameLoop();
    expect(loop.onUpdate).toBeNull();
    expect(loop.onFixedUpdate).toBeNull();
    expect(loop.onRender).toBeNull();
  });
});

/* ───────────── step() — variable update ───────────── */

describeImpl('GameLoop — step() variable update', () => {
  let loop: InstanceType<typeof GameLoop>;

  beforeEach(() => {
    loop = new GameLoop();
  });

  it('should call onUpdate with the provided dt', () => {
    const spy = vi.fn();
    loop.onUpdate = spy;
    loop.step(0.016);
    expect(spy).toHaveBeenCalledWith(0.016);
  });

  it('should call onUpdate every step', () => {
    const spy = vi.fn();
    loop.onUpdate = spy;
    loop.step(0.016);
    loop.step(0.020);
    loop.step(0.014);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[1][0]).toBeCloseTo(0.020, 5);
  });

  it('should not throw if onUpdate is null', () => {
    expect(() => loop.step(0.016)).not.toThrow();
  });
});

/* ───────────── step() — fixed update ───────────── */

describeImpl('GameLoop — step() fixed update', () => {
  it('should call onFixedUpdate at fixed intervals', () => {
    const spy = vi.fn();
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    loop.onFixedUpdate = spy;

    loop.step(1 / 60);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeCloseTo(1 / 60, 5);
  });

  it('should call onFixedUpdate multiple times for large dt', () => {
    const spy = vi.fn();
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    loop.onFixedUpdate = spy;

    loop.step(3 / 60);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should accumulate remainder across frames', () => {
    const spy = vi.fn();
    const step = 1 / 60;
    const loop = new GameLoop({ fixedTimeStep: step });
    loop.onFixedUpdate = spy;

    loop.step(step * 0.5);
    expect(spy).toHaveBeenCalledTimes(0);

    loop.step(step * 0.5);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should cap fixed updates at maxSubSteps', () => {
    const spy = vi.fn();
    const loop = new GameLoop({ fixedTimeStep: 1 / 60, maxSubSteps: 3 });
    loop.onFixedUpdate = spy;

    loop.step(10 / 60);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should not call fixedUpdate if dt is less than fixedTimeStep', () => {
    const spy = vi.fn();
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    loop.onFixedUpdate = spy;

    loop.step(1 / 120);
    expect(spy).not.toHaveBeenCalled();
  });
});

/* ───────────── step() — callback ordering ───────────── */

describeImpl('GameLoop — step() callback ordering', () => {
  it('should call fixedUpdate before onUpdate before onRender', () => {
    const order: string[] = [];
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    loop.onFixedUpdate = () => order.push('fixed');
    loop.onUpdate = () => order.push('update');
    loop.onRender = () => order.push('render');

    loop.step(1 / 60);
    expect(order).toEqual(['fixed', 'update', 'render']);
  });

  it('should call all fixed updates before onUpdate', () => {
    const order: string[] = [];
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    loop.onFixedUpdate = () => order.push('fixed');
    loop.onUpdate = () => order.push('update');

    loop.step(2 / 60);
    expect(order).toEqual(['fixed', 'fixed', 'update']);
  });
});

/* ───────────── start / stop ───────────── */

describeImpl('GameLoop — start / stop', () => {
  it('start() should set running to true', () => {
    const loop = new GameLoop();
    loop.start();
    expect(loop.running).toBe(true);
    loop.stop();
  });

  it('stop() should set running to false', () => {
    const loop = new GameLoop();
    loop.start();
    loop.stop();
    expect(loop.running).toBe(false);
  });

  it('calling start() twice should be safe', () => {
    const loop = new GameLoop();
    loop.start();
    expect(() => loop.start()).not.toThrow();
    loop.stop();
  });

  it('calling stop() without start() should be safe', () => {
    const loop = new GameLoop();
    expect(() => loop.stop()).not.toThrow();
  });
});
