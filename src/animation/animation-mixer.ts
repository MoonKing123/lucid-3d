/**
 * STUB — AnimationMixer (not yet implemented).
 * @see test/unit/animation/animation-mixer.test.ts
 */
export const __STUB__ = true;

import { Skeleton } from './skeleton';
import { AnimationClip } from './animation-clip';

export class AnimationMixer {
  readonly skeleton: Skeleton;

  constructor(_skeleton: Skeleton) {
    this.skeleton = _skeleton;
    throw new Error('Not implemented');
  }

  play(_clip: AnimationClip, _options?: { loop?: boolean; speed?: number }): void {
    throw new Error('Not implemented');
  }

  stop(): void {
    throw new Error('Not implemented');
  }

  update(_deltaTime: number): void {
    throw new Error('Not implemented');
  }

  get isPlaying(): boolean {
    throw new Error('Not implemented');
  }

  get time(): number {
    throw new Error('Not implemented');
  }
}
