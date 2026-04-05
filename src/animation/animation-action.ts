/**
 * AnimationAction — weight-based animation playback with fade transitions.
 * Stub — to be implemented by Dev.
 * @see test/unit/animation/animation-action.test.ts
 */

export const __STUB__ = true;

import type { AnimationClip } from './animation-clip';
import type { Skeleton } from './skeleton';

export class AnimationAction {
  readonly clip: AnimationClip;
  readonly skeleton: Skeleton;

  weight: number = 1;
  timeScale: number = 1;
  loop: boolean = false;
  enabled: boolean = true;
  clampWhenFinished: boolean = false;

  constructor(clip: AnimationClip, skeleton: Skeleton) {
    this.clip = clip;
    this.skeleton = skeleton;
  }

  get time(): number { throw new Error('Not implemented'); }
  set time(_v: number) { throw new Error('Not implemented'); }
  get isRunning(): boolean { throw new Error('Not implemented'); }
  get effectiveWeight(): number { throw new Error('Not implemented'); }

  play(): this { throw new Error('Not implemented'); }
  stop(): this { throw new Error('Not implemented'); }
  reset(): this { throw new Error('Not implemented'); }

  fadeIn(_duration: number): this { throw new Error('Not implemented'); }
  fadeOut(_duration: number): this { throw new Error('Not implemented'); }
  crossFadeTo(_action: AnimationAction, _duration: number): this { throw new Error('Not implemented'); }

  /** Advance time and fade state. Called by mixer or manually. */
  _update(_deltaTime: number): void { throw new Error('Not implemented'); }

  /**
   * Sample clip tracks at current time. Returns per-bone transforms.
   * positions: Float32Array(boneCount * 3)
   * rotations: Float32Array(boneCount * 4)
   * scales:    Float32Array(boneCount * 3)
   */
  _sample(): { positions: Float32Array; rotations: Float32Array; scales: Float32Array } {
    throw new Error('Not implemented');
  }
}
