/**
 * Pre-written tests for Clock — game loop time management.
 * AI must implement src/core/clock.ts to make these pass.
 *
 * API:
 *   class Clock {
 *     autoStart: boolean;       // auto-start on first getDelta() call
 *     startTime: number;        // ms timestamp when start() was called
 *     oldTime: number;          // ms timestamp of previous getDelta()
 *     elapsedTime: number;      // total elapsed seconds since start
 *     running: boolean;         // whether the clock is running
 *
 *     constructor(autoStart?: boolean);  // default true
 *     start(): void;            // reset and begin timing
 *     stop(): void;             // pause timing
 *     getDelta(): number;       // seconds since last getDelta() call
 *     getElapsed(): number;     // total seconds since start
 *   }
 *
 * Implementation notes:
 * - Use performance.now() for high-resolution timing
 * - getDelta() returns 0 on first call (or auto-starts clock)
 * - getElapsed() updates internal state like getDelta()
 * - All time values returned in SECONDS (not ms)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mod from '../../../src/core/clock';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Clock } = mod;

/* ───────────── Construction ───────────── */

describeImpl('Clock — construction', () => {
  it('should default autoStart to true', () => {
    const c = new Clock();
    expect(c.autoStart).toBe(true);
  });

  it('should accept autoStart=false', () => {
    const c = new Clock(false);
    expect(c.autoStart).toBe(false);
  });

  it('should not be running initially', () => {
    const c = new Clock();
    expect(c.running).toBe(false);
  });

  it('should have zero elapsed time initially', () => {
    const c = new Clock();
    expect(c.elapsedTime).toBe(0);
  });
});

/* ───────────── start / stop ───────────── */

describeImpl('Clock — start/stop', () => {
  it('start() should set running to true', () => {
    const c = new Clock(false);
    c.start();
    expect(c.running).toBe(true);
  });

  it('start() should record startTime', () => {
    const c = new Clock(false);
    c.start();
    expect(c.startTime).toBeGreaterThan(0);
  });

  it('stop() should set running to false', () => {
    const c = new Clock(false);
    c.start();
    c.stop();
    expect(c.running).toBe(false);
  });

  it('stop() should not reset elapsedTime', () => {
    const c = new Clock(false);
    c.start();
    c.getDelta();
    c.stop();
    expect(c.elapsedTime).toBeGreaterThanOrEqual(0);
  });
});

/* ───────────── getDelta ───────────── */

describeImpl('Clock — getDelta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should auto-start and return 0 on first call when autoStart=true', () => {
    const c = new Clock(true);
    const delta = c.getDelta();
    expect(delta).toBe(0);
    expect(c.running).toBe(true);
  });

  it('should return 0 when not started and autoStart=false', () => {
    const c = new Clock(false);
    const delta = c.getDelta();
    expect(delta).toBe(0);
    expect(c.running).toBe(false);
  });

  it('should return elapsed seconds between calls', () => {
    const c = new Clock(false);
    c.start();
    c.getDelta(); // first call, resets oldTime

    vi.advanceTimersByTime(100); // 100ms
    const delta = c.getDelta();

    expect(delta).toBeCloseTo(0.1, 1);
  });

  it('should accumulate elapsedTime', () => {
    const c = new Clock(false);
    c.start();
    c.getDelta();

    vi.advanceTimersByTime(200);
    c.getDelta();

    vi.advanceTimersByTime(300);
    c.getDelta();

    expect(c.elapsedTime).toBeCloseTo(0.5, 1);
  });

  it('should return 0 when stopped', () => {
    const c = new Clock(false);
    c.start();
    c.getDelta();
    vi.advanceTimersByTime(100);
    c.stop();

    vi.advanceTimersByTime(500);
    const delta = c.getDelta();
    expect(delta).toBe(0);
  });
});

/* ───────────── getElapsed ───────────── */

describeImpl('Clock — getElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 before start', () => {
    const c = new Clock(false);
    expect(c.getElapsed()).toBe(0);
  });

  it('should return total seconds since start', () => {
    const c = new Clock(false);
    c.start();

    vi.advanceTimersByTime(250);
    const elapsed = c.getElapsed();

    expect(elapsed).toBeCloseTo(0.25, 1);
  });

  it('should auto-start when autoStart=true', () => {
    const c = new Clock(true);
    c.getElapsed();
    expect(c.running).toBe(true);
  });

  it('should freeze when stopped', () => {
    const c = new Clock(false);
    c.start();

    vi.advanceTimersByTime(100);
    c.getElapsed();
    c.stop();
    const frozen = c.elapsedTime;

    vi.advanceTimersByTime(500);
    expect(c.getElapsed()).toBeCloseTo(frozen, 5);
  });
});
