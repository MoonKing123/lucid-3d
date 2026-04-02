/**
 * STUB — AnimationClip (not yet implemented).
 * @see test/unit/animation/animation-mixer.test.ts
 */
export const __STUB__ = true;

import { KeyframeTrack } from './keyframe-track';

export class AnimationClip {
  readonly name: string;
  readonly duration: number;
  readonly tracks: ReadonlyArray<KeyframeTrack>;

  constructor(_name: string, _tracks: KeyframeTrack[]) {
    this.name = _name;
    this.tracks = _tracks;
    this.duration = 0;
    throw new Error('Not implemented');
  }
}
