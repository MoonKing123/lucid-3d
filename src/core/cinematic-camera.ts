/**
 * CinematicCamera — 关键帧驱动过场动画相机。
 * 支持线性或 CatmullRom 插值关键帧序列（position + lookAt + fov）。
 * 典型用途：游戏过场动画、回放镜头、UI 演示自动镜头。
 * @see test/unit/core/cinematic-camera.test.ts
 */

import { PerspectiveCamera } from './camera';
import { vec3 } from '../math/vec3';

export interface Keyframe {
  /** 时间轴（秒），单调递增 */
  time: number;
  /** 相机位置 */
  position: [number, number, number];
  /** 注视点 */
  lookAt: [number, number, number];
  /** 视场角（弧度），可选，默认保持当前 fov */
  fov?: number;
}

export interface CinematicCameraOptions {
  /** 关键帧数组，按 time 递增 */
  keyframes: Keyframe[];
  /** 插值方式 'linear' | 'catmullrom'，默认 'linear' */
  interpolation?: 'linear' | 'catmullrom';
  /** 是否循环播放，默认 false */
  loop?: boolean;
}

/** 单分量 CatmullRom 插值 */
function cr1d(p0: number, p1: number, p2: number, p3: number, a: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return p1
    + t * a * (p2 - p0)
    + t2 * (2 * a * p0 + (a - 3) * p1 + (3 - 2 * a) * p2 - a * p3)
    + t3 * (-a * p0 + (2 - a) * p1 + (a - 2) * p2 + a * p3);
}

export class CinematicCamera extends PerspectiveCamera {
  private _keyframes: Keyframe[];
  private _interpolation: 'linear' | 'catmullrom';
  private _loop: boolean;
  private _currentTime: number = 0;
  private _playing: boolean = false;
  private _finished: boolean = false;
  private _started: boolean = false;

  onStart?: () => void;
  onEnd?: () => void;

  constructor(options: CinematicCameraOptions) {
    super();

    const { keyframes, interpolation = 'linear', loop = false } = options;

    if (keyframes.length === 0) {
      throw new Error('CinematicCamera: keyframes must not be empty');
    }
    for (let i = 1; i < keyframes.length; i++) {
      if (keyframes[i].time <= keyframes[i - 1].time) {
        throw new Error('CinematicCamera: keyframe times must be strictly increasing');
      }
    }

    this._keyframes = keyframes;
    this._interpolation = interpolation;
    this._loop = loop;

    this._applyTime(0);
  }

  play(): void {
    if (this._playing || this._finished) return;
    this._playing = true;
    if (!this._started) {
      this._started = true;
      this.onStart?.();
    }
  }

  pause(): void {
    this._playing = false;
  }

  stop(): void {
    this._playing = false;
    this._finished = false;
    this._started = false;
    this._currentTime = 0;
    this._applyTime(0);
  }

  seek(time: number): void {
    this._currentTime = Math.max(0, Math.min(time, this.duration));
    this._applyTime(this._currentTime);
  }

  update(dt: number): void {
    if (!this._playing || this._finished) return;

    this._currentTime += dt;

    if (this._currentTime >= this.duration) {
      if (this._loop && this.duration > 0) {
        this._currentTime = this._currentTime % this.duration;
      } else {
        this._currentTime = this.duration;
        this._playing = false;
        this._finished = true;
        this._applyTime(this._currentTime);
        this.onEnd?.();
        return;
      }
    }

    this._applyTime(this._currentTime);
  }

  get currentTime(): number { return this._currentTime; }

  get duration(): number {
    return this._keyframes[this._keyframes.length - 1].time;
  }

  get isPlaying(): boolean { return this._playing; }
  get isFinished(): boolean { return this._finished; }

  private _applyTime(t: number): void {
    const kfs = this._keyframes;

    if (kfs.length === 1) {
      const kf = kfs[0];
      this.position[0] = kf.position[0];
      this.position[1] = kf.position[1];
      this.position[2] = kf.position[2];
      this.lookAt(vec3(kf.lookAt[0], kf.lookAt[1], kf.lookAt[2]));
      if (kf.fov !== undefined) this.fov = kf.fov;
      return;
    }

    // 找到包含 t 的分段
    let segIdx = kfs.length - 2;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t <= kfs[i + 1].time) {
        segIdx = i;
        break;
      }
    }

    const kf0 = kfs[segIdx];
    const kf1 = kfs[segIdx + 1];
    const alpha = (t - kf0.time) / (kf1.time - kf0.time);

    let pos: [number, number, number];
    let look: [number, number, number];

    if (this._interpolation === 'catmullrom') {
      pos = this._catmullRom3(segIdx, alpha, 'position');
      look = this._catmullRom3(segIdx, alpha, 'lookAt');
    } else {
      pos = [
        kf0.position[0] + (kf1.position[0] - kf0.position[0]) * alpha,
        kf0.position[1] + (kf1.position[1] - kf0.position[1]) * alpha,
        kf0.position[2] + (kf1.position[2] - kf0.position[2]) * alpha,
      ];
      look = [
        kf0.lookAt[0] + (kf1.lookAt[0] - kf0.lookAt[0]) * alpha,
        kf0.lookAt[1] + (kf1.lookAt[1] - kf0.lookAt[1]) * alpha,
        kf0.lookAt[2] + (kf1.lookAt[2] - kf0.lookAt[2]) * alpha,
      ];
    }

    this.position[0] = pos[0];
    this.position[1] = pos[1];
    this.position[2] = pos[2];
    this.lookAt(vec3(look[0], look[1], look[2]));

    if (kf0.fov !== undefined && kf1.fov !== undefined) {
      this.fov = kf0.fov + (kf1.fov - kf0.fov) * alpha;
    } else if (kf0.fov !== undefined) {
      this.fov = kf0.fov;
    } else if (kf1.fov !== undefined) {
      this.fov = kf1.fov;
    }
  }

  private _catmullRom3(
    segIdx: number,
    t: number,
    prop: 'position' | 'lookAt',
  ): [number, number, number] {
    const kfs = this._keyframes;
    const N = kfs.length;
    const clamp = (i: number) => Math.max(0, Math.min(i, N - 1));
    const p0 = kfs[clamp(segIdx - 1)][prop];
    const p1 = kfs[clamp(segIdx)][prop];
    const p2 = kfs[clamp(segIdx + 1)][prop];
    const p3 = kfs[clamp(segIdx + 2)][prop];
    const a = 0.5;
    return [
      cr1d(p0[0], p1[0], p2[0], p3[0], a, t),
      cr1d(p0[1], p1[1], p2[1], p3[1], a, t),
      cr1d(p0[2], p1[2], p2[2], p3[2], a, t),
    ];
  }
}
