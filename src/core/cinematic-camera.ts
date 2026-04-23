/**
 * CinematicCamera — 关键帧驱动过场动画相机。
 * 支持线性或 CatmullRom 插值关键帧序列（position + lookAt + fov）。
 * 典型用途：游戏过场动画、回放镜头、UI 演示自动镜头。
 * @see test/unit/core/cinematic-camera.test.ts
 */

import { PerspectiveCamera } from './camera';
import { vec3, lerp as vec3Lerp } from '../math/vec3';
import type { Vec3 } from '../math/vec3';
import { Curve3 } from '../math/curve3';

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

export class CinematicCamera extends PerspectiveCamera {
  private _keyframes: Keyframe[];
  private _interpolation: 'linear' | 'catmullrom';
  private _loop: boolean;
  private _currentTime: number = 0;
  private _isPlaying: boolean = false;
  private _isFinished: boolean = false;
  private _positionCurve: Curve3 | null = null;
  private _lookAtCurve: Curve3 | null = null;

  onStart?: () => void;
  onEnd?: () => void;

  constructor(options: CinematicCameraOptions) {
    super();
    if (!options.keyframes || options.keyframes.length === 0) {
      throw new Error('CinematicCamera: keyframes must be non-empty');
    }
    for (let i = 1; i < options.keyframes.length; i++) {
      if (options.keyframes[i].time <= options.keyframes[i - 1].time) {
        throw new Error(`CinematicCamera: keyframe times must be strictly increasing (index ${i})`);
      }
    }
    this._keyframes = options.keyframes;
    this._interpolation = options.interpolation ?? 'linear';
    this._loop = options.loop ?? false;

    if (this._interpolation === 'catmullrom' && this._keyframes.length >= 2) {
      const posPts = this._keyframes.map(k => vec3(k.position[0], k.position[1], k.position[2]));
      const lookPts = this._keyframes.map(k => vec3(k.lookAt[0], k.lookAt[1], k.lookAt[2]));
      this._positionCurve = new Curve3(posPts);
      this._lookAtCurve = new Curve3(lookPts);
    }

    // Apply initial frame (t=0)
    this._applyAtTime(0);
  }

  play(): void {
    if (this._isPlaying) return;
    // Trigger onStart on fresh play (not resume): currentTime==0 and not finished
    const isFreshStart = this._currentTime === 0 && !this._isFinished;
    this._isPlaying = true;
    if (isFreshStart && this.onStart) this.onStart();
  }

  pause(): void {
    this._isPlaying = false;
  }

  stop(): void {
    this._isPlaying = false;
    this._currentTime = 0;
    this._isFinished = false;
    this._applyAtTime(0);
  }

  seek(time: number): void {
    const clamped = Math.max(0, Math.min(this.duration, time));
    this._currentTime = clamped;
    this._applyAtTime(clamped);
  }

  update(dt: number): void {
    if (!this._isPlaying) return;
    this._currentTime += dt;

    if (this._loop) {
      if (this._currentTime >= this.duration) {
        this._currentTime = this._currentTime % this.duration;
      }
    } else {
      if (this._currentTime >= this.duration) {
        this._currentTime = this.duration;
        this._isPlaying = false;
        if (!this._isFinished) {
          this._isFinished = true;
          if (this.onEnd) this.onEnd();
        }
      }
    }

    this._applyAtTime(this._currentTime);
  }

  get currentTime(): number { return this._currentTime; }
  get duration(): number { return this._keyframes[this._keyframes.length - 1].time; }
  get isPlaying(): boolean { return this._isPlaying; }
  get isFinished(): boolean { return this._isFinished; }

  /** Compute position + lookAt + fov at given time and apply to this camera. */
  private _applyAtTime(t: number): void {
    const kfs = this._keyframes;
    const n = kfs.length;
    if (n === 0) return;

    // Single keyframe: apply directly
    if (n === 1) {
      const k = kfs[0];
      this.position = vec3(k.position[0], k.position[1], k.position[2]);
      this.lookAt(vec3(k.lookAt[0], k.lookAt[1], k.lookAt[2]));
      if (k.fov !== undefined) this.fov = k.fov;
      return;
    }

    // Clamp out-of-range times to endpoints
    if (t <= kfs[0].time) {
      const k = kfs[0];
      this.position = vec3(k.position[0], k.position[1], k.position[2]);
      this.lookAt(vec3(k.lookAt[0], k.lookAt[1], k.lookAt[2]));
      if (k.fov !== undefined) this.fov = k.fov;
      return;
    }
    if (t >= kfs[n - 1].time) {
      const k = kfs[n - 1];
      this.position = vec3(k.position[0], k.position[1], k.position[2]);
      this.lookAt(vec3(k.lookAt[0], k.lookAt[1], k.lookAt[2]));
      if (k.fov !== undefined) this.fov = k.fov;
      return;
    }

    // Find segment containing time t
    let i = 0;
    while (i < n - 1 && kfs[i + 1].time < t) i++;
    const k0 = kfs[i];
    const k1 = kfs[i + 1];
    const segSpan = k1.time - k0.time;
    const alpha = segSpan > 0 ? (t - k0.time) / segSpan : 0;

    let pos: Vec3;
    let look: Vec3;

    if (this._interpolation === 'catmullrom' && this._positionCurve && this._lookAtCurve) {
      // Map time to global t in [0, 1]
      const globalT = (t - kfs[0].time) / (kfs[n - 1].time - kfs[0].time);
      pos = this._positionCurve.getPoint(globalT);
      look = this._lookAtCurve.getPoint(globalT);
    } else {
      // Linear per-segment interpolation
      const p0 = vec3(k0.position[0], k0.position[1], k0.position[2]);
      const p1 = vec3(k1.position[0], k1.position[1], k1.position[2]);
      pos = vec3Lerp(p0, p1, alpha);
      const l0 = vec3(k0.lookAt[0], k0.lookAt[1], k0.lookAt[2]);
      const l1 = vec3(k1.lookAt[0], k1.lookAt[1], k1.lookAt[2]);
      look = vec3Lerp(l0, l1, alpha);
    }

    this.position = pos;
    this.lookAt(look);

    // fov interpolation: linear between segment endpoints if both defined
    if (k0.fov !== undefined && k1.fov !== undefined) {
      this.fov = k0.fov + (k1.fov - k0.fov) * alpha;
    } else if (k0.fov !== undefined) {
      this.fov = k0.fov;
    } else if (k1.fov !== undefined) {
      this.fov = k1.fov;
    }
  }
}
