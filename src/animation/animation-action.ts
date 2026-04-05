/**
 * AnimationAction — 基于权重的动画播放包装器，支持淡入淡出过渡。
 * @see test/unit/animation/animation-action.test.ts
 */

import type { AnimationClip } from './animation-clip';
import type { Skeleton } from './skeleton';

type FadeMode = 'none' | 'in' | 'out';

export class AnimationAction {
  readonly clip: AnimationClip;
  readonly skeleton: Skeleton;

  weight: number = 1;
  timeScale: number = 1;
  loop: boolean = false;
  enabled: boolean = true;
  clampWhenFinished: boolean = false;

  private _time: number = 0;
  private _isRunning: boolean = false;
  private _fadeWeight: number = 1;
  private _fadeMode: FadeMode = 'none';
  private _fadeDuration: number = 0;
  private _fadeElapsed: number = 0;
  private _fadeStartWeight: number = 1;

  constructor(clip: AnimationClip, skeleton: Skeleton) {
    this.clip = clip;
    this.skeleton = skeleton;
  }

  get time(): number { return this._time; }
  set time(v: number) { this._time = v; }

  get isRunning(): boolean { return this._isRunning; }

  get effectiveWeight(): number {
    return this.weight * this._fadeWeight * (this.enabled ? 1 : 0);
  }

  play(): this {
    this._isRunning = true;
    return this;
  }

  stop(): this {
    this._isRunning = false;
    this._time = 0;
    return this;
  }

  /** 重置时间和淡入淡出状态，保持运行状态不变 */
  reset(): this {
    this._time = 0;
    this._fadeWeight = 1;
    this._fadeMode = 'none';
    this._fadeElapsed = 0;
    return this;
  }

  /** 从 0 淡入到 1，持续 duration 秒 */
  fadeIn(duration: number): this {
    this._fadeMode = 'in';
    this._fadeDuration = duration;
    this._fadeElapsed = 0;
    this._fadeWeight = 0;
    return this;
  }

  /** 从当前权重淡出到 0，完成后停止 */
  fadeOut(duration: number): this {
    this._fadeStartWeight = this._fadeWeight;
    this._fadeMode = 'out';
    this._fadeDuration = duration;
    this._fadeElapsed = 0;
    return this;
  }

  crossFadeTo(action: AnimationAction, duration: number): this {
    this.fadeOut(duration);
    action.reset().fadeIn(duration).play();
    return this;
  }

  /** 推进时间和淡入淡出状态 */
  _update(deltaTime: number): void {
    // 处理淡入淡出
    if (this._fadeMode !== 'none') {
      this._fadeElapsed += deltaTime;
      const t = this._fadeDuration > 0
        ? Math.min(this._fadeElapsed / this._fadeDuration, 1)
        : 1;

      if (this._fadeMode === 'in') {
        this._fadeWeight = t;
      } else {
        this._fadeWeight = this._fadeStartWeight * (1 - t);
      }

      if (this._fadeElapsed >= this._fadeDuration) {
        const wasFadeOut = this._fadeMode === 'out';
        this._fadeMode = 'none';
        if (wasFadeOut) {
          this._fadeWeight = 0;
          this._isRunning = false;
        } else {
          this._fadeWeight = 1;
        }
      }
    }

    // 推进时间
    if (!this._isRunning) return;

    this._time += deltaTime * this.timeScale;

    if (this.loop) {
      if (this.clip.duration > 0) {
        this._time = this._time % this.clip.duration;
      }
    } else {
      if (this._time > this.clip.duration) {
        this._time = this.clip.duration;
        if (!this.clampWhenFinished) {
          this._isRunning = false;
        }
      }
    }
  }

  /**
   * 在当前时间采样所有轨道，返回每根骨骼的变换数组。
   * 无轨道覆盖的骨骼使用 skeleton 当前的局部变换。
   */
  _sample(): { positions: Float32Array; rotations: Float32Array; scales: Float32Array } {
    const n = this.skeleton.boneCount;
    const positions = new Float32Array(n * 3);
    const rotations = new Float32Array(n * 4);
    const scales = new Float32Array(n * 3);

    // 默认使用骨骼当前变换
    positions.set(this.skeleton.localPositions);
    rotations.set(this.skeleton.localRotations);
    scales.set(this.skeleton.localScales);

    // 按轨道覆盖
    for (const track of this.clip.tracks) {
      const { targetPath, jointIndex } = track;
      if (targetPath === 'translation') {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        positions.set(out, jointIndex * 3);
      } else if (targetPath === 'rotation') {
        const out = new Float32Array(4);
        track.sample(this._time, out);
        rotations.set(out, jointIndex * 4);
      } else {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        scales.set(out, jointIndex * 3);
      }
    }

    return { positions, rotations, scales };
  }
}
