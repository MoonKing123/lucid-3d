/**
 * AnimationMixer — 动画播放引擎，驱动 Skeleton 按关键帧轨道更新。
 * @see test/unit/animation/animation-mixer.test.ts
 */

import { Skeleton } from './skeleton';
import { AnimationClip } from './animation-clip';

export class AnimationMixer {
  readonly skeleton: Skeleton;
  private _clip: AnimationClip | null = null;
  private _isPlaying: boolean = false;
  private _time: number = 0;
  private _loop: boolean = false;
  private _speed: number = 1;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }

  play(clip: AnimationClip, options?: { loop?: boolean; speed?: number }): void {
    this._clip = clip;
    this._isPlaying = true;
    this._time = 0;
    this._loop = options?.loop ?? false;
    this._speed = options?.speed ?? 1;
  }

  stop(): void {
    this._isPlaying = false;
  }

  update(deltaTime: number): void {
    if (!this._isPlaying || !this._clip) return;

    this._time += deltaTime * this._speed;

    if (this._loop) {
      if (this._clip.duration > 0) {
        this._time = this._time % this._clip.duration;
      }
    } else {
      if (this._time >= this._clip.duration) {
        this._time = this._clip.duration;
        this._isPlaying = false;
      }
    }

    // 对每个轨道采样并写入骨骼
    for (const track of this._clip.tracks) {
      const { targetPath, jointIndex } = track;
      if (targetPath === 'translation') {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        this.skeleton.localPositions.set(out, jointIndex * 3);
      } else if (targetPath === 'rotation') {
        const out = new Float32Array(4);
        track.sample(this._time, out);
        this.skeleton.localRotations.set(out, jointIndex * 4);
      } else {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        this.skeleton.localScales.set(out, jointIndex * 3);
      }
    }

    this.skeleton.update();
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get time(): number {
    return this._time;
  }
}
