/**
 * AnimationClip — 动画片段，包含多个 KeyframeTrack。
 * @see test/unit/animation/animation-mixer.test.ts
 */

import { KeyframeTrack } from './keyframe-track';

export class AnimationClip {
  readonly name: string;
  readonly duration: number;
  readonly tracks: ReadonlyArray<KeyframeTrack>;

  constructor(name: string, tracks: KeyframeTrack[]);
  constructor(name: string, duration: number, tracks: KeyframeTrack[]);
  constructor(name: string, tracksOrDuration: KeyframeTrack[] | number, tracks?: KeyframeTrack[]) {
    this.name = name;
    if (typeof tracksOrDuration === 'number') {
      this.tracks = tracks ?? [];
      this.duration = tracksOrDuration > 0 ? tracksOrDuration : this.tracks.reduce((max, t) => Math.max(max, t.duration), 0);
    } else {
      this.tracks = tracksOrDuration;
      this.duration = this.tracks.reduce((max, t) => Math.max(max, t.duration), 0);
    }
  }
}
