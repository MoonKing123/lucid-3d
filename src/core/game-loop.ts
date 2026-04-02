/**
 * GameLoop — 游戏主循环。
 * 支持固定时间步长的 fixedUpdate + 可变帧率的 update + render 回调。
 */
import { Clock } from './clock';

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

  private fixedTimeStep: number;
  private maxSubSteps: number;
  private accumulator: number;
  private clock: Clock;
  private rafId: number | null;

  constructor(options?: GameLoopOptions) {
    this.running = false;
    this.onUpdate = null;
    this.onFixedUpdate = null;
    this.onRender = null;
    this.fixedTimeStep = options?.fixedTimeStep ?? 1 / 60;
    this.maxSubSteps = options?.maxSubSteps ?? 3;
    this.accumulator = 0;
    this.clock = new Clock(false);
    this.rafId = null;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const tick = () => {
      if (!this.running) return;
      const dt = this.clock.getDelta();
      this.step(dt);
      this.rafId = this._requestFrame(tick);
    };
    this.rafId = this._requestFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      this._cancelFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Manually advance one frame by dt seconds.
   * Useful for deterministic testing without rAF.
   */
  step(dt: number): void {
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
      this.onFixedUpdate?.(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      steps++;
    }
    this.onUpdate?.(dt);
    this.onRender?.();
  }

  private _requestFrame(cb: () => void): number {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(cb);
    }
    return setTimeout(cb, 0) as unknown as number;
  }

  private _cancelFrame(id: number): void {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }
}
