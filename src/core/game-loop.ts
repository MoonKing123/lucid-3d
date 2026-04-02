/**
 * STUB — GameLoop (not yet implemented).
 * @see test/unit/core/game-loop.test.ts
 */
export const __STUB__ = true;

export interface GameLoopOptions {
  /** Fixed timestep in seconds (default: 1/60). */
  fixedTimeStep?: number;
  /** Max fixed-update sub-steps per frame (default: 3). */
  maxSubSteps?: number;
}

export class GameLoop {
  running: boolean;

  /** Called every frame with variable delta time. */
  onUpdate: ((dt: number) => void) | null;
  /** Called at fixed intervals. */
  onFixedUpdate: ((dt: number) => void) | null;
  /** Called after all updates, before next frame. */
  onRender: (() => void) | null;

  constructor(_options?: GameLoopOptions) {
    this.running = false;
    this.onUpdate = null;
    this.onFixedUpdate = null;
    this.onRender = null;
    throw new Error('Not implemented');
  }

  start(): void {
    throw new Error('Not implemented');
  }

  stop(): void {
    throw new Error('Not implemented');
  }

  /**
   * Manually advance one frame by dt seconds.
   * Useful for deterministic testing without rAF.
   */
  step(_dt: number): void {
    throw new Error('Not implemented');
  }
}
