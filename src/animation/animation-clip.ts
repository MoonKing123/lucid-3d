/**
 * AnimationClip — 动画片段，包含多个 KeyframeTrack。
 * @see test/unit/animation/animation-mixer.test.ts
 */

import { KeyframeTrack } from './keyframe-track';

export class AnimationClip {
  readonly name: string;
  readonly duration: number;
  readonly tracks: ReadonlyArray<KeyframeTrack>;

  constructor(name: string, tracks: KeyframeTrack[]) {
    this.name = name;
    this.tracks = tracks;
    this.duration = tracks.reduce((max, t) => Math.max(max, t.duration), 0);
  }
}
