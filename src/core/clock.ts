/**
 * STUB — Clock (not yet implemented).
 * Game loop time management: delta time, elapsed time, start/stop.
 * @see test/unit/core/clock.test.ts
 */
export const __STUB__ = true;

export class Clock {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;

  constructor(_autoStart?: boolean) {
    this.autoStart = _autoStart ?? true;
    this.startTime = 0;
    this.oldTime = 0;
    this.elapsedTime = 0;
    this.running = false;
  }

  start(): void { throw new Error('Not implemented'); }
  stop(): void { throw new Error('Not implemented'); }
  getDelta(): number { throw new Error('Not implemented'); }
  getElapsed(): number { throw new Error('Not implemented'); }
}
