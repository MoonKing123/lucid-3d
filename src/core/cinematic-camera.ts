/**
 * CinematicCamera — 关键帧驱动过场动画相机。
 * 支持线性或 CatmullRom 插值关键帧序列（position + lookAt + fov）。
 * 典型用途：游戏过场动画、回放镜头、UI 演示自动镜头。
 * @see test/unit/core/cinematic-camera.test.ts
 */

import { PerspectiveCamera } from './camera';

export const __STUB__ = true;

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
  constructor(_options: CinematicCameraOptions) {
    super();
    throw new Error('Not implemented');
  }
  play(): void { throw new Error('Not implemented'); }
  pause(): void { throw new Error('Not implemented'); }
  stop(): void { throw new Error('Not implemented'); }
  seek(_time: number): void { throw new Error('Not implemented'); }
  update(_dt: number): void { throw new Error('Not implemented'); }
  get currentTime(): number { throw new Error('Not implemented'); }
  get duration(): number { throw new Error('Not implemented'); }
  get isPlaying(): boolean { throw new Error('Not implemented'); }
  get isFinished(): boolean { throw new Error('Not implemented'); }
  onStart?: () => void;
  onEnd?: () => void;
}
