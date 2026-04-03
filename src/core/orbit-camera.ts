/**
 * OrbitCamera — 轨道相机。
 * 绕目标点旋转/缩放/平移，适用于塔防俯瞰、SLG 大地图、3D 查看器等场景。
 * 支持编程控制和阻尼平滑。
 * @see test/unit/core/orbit-camera.test.ts
 */

export const __STUB__ = true;

import { PerspectiveCamera } from './camera';
import { type Vec3, vec3 } from '../math/vec3';

export interface OrbitCameraOptions {
  /** 轨道中心点，默认 [0, 0, 0] */
  target?: Vec3;
  /** 初始距离，默认 10 */
  distance?: number;
  /** 最小距离，默认 1 */
  minDistance?: number;
  /** 最大距离，默认 100 */
  maxDistance?: number;
  /** 最小极角（弧度），默认 0.1 */
  minPolarAngle?: number;
  /** 最大极角（弧度），默认 PI - 0.1 */
  maxPolarAngle?: number;
  /** 阻尼系数，默认 0.1 */
  damping?: number;
  /** 旋转灵敏度，默认 1 */
  rotateSpeed?: number;
  /** 缩放灵敏度，默认 1 */
  zoomSpeed?: number;
  /** 是否启用平移，默认 true */
  enablePan?: boolean;
  /** 平移灵敏度，默认 1 */
  panSpeed?: number;
}

export class OrbitCamera extends PerspectiveCamera {
  orbitTarget: Vec3;
  distance: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  damping: number;
  rotateSpeed: number;
  zoomSpeed: number;
  enablePan: boolean;
  panSpeed: number;

  azimuthAngle: number;
  polarAngle: number;

  private _initialAzimuth: number;
  private _initialPolar: number;
  private _initialDistance: number;
  private _initialTarget: Vec3;

  constructor(options?: OrbitCameraOptions) {
    super();
    this.orbitTarget = options?.target ? vec3(options.target[0], options.target[1], options.target[2]) : vec3(0, 0, 0);
    this.distance = options?.distance ?? 10;
    this.minDistance = options?.minDistance ?? 1;
    this.maxDistance = options?.maxDistance ?? 100;
    this.minPolarAngle = options?.minPolarAngle ?? 0.1;
    this.maxPolarAngle = options?.maxPolarAngle ?? Math.PI - 0.1;
    this.damping = options?.damping ?? 0.1;
    this.rotateSpeed = options?.rotateSpeed ?? 1;
    this.zoomSpeed = options?.zoomSpeed ?? 1;
    this.enablePan = options?.enablePan ?? true;
    this.panSpeed = options?.panSpeed ?? 1;
    this.azimuthAngle = 0;
    this.polarAngle = Math.PI / 4;
    this._initialAzimuth = this.azimuthAngle;
    this._initialPolar = this.polarAngle;
    this._initialDistance = this.distance;
    this._initialTarget = vec3(this.orbitTarget[0], this.orbitTarget[1], this.orbitTarget[2]);
  }

  /** 旋转：调整方位角和极角 */
  rotate(_deltaAzimuth: number, _deltaPolar: number): void { /* stub */ }

  /** 缩放：调整距离 */
  zoom(_factor: number): void { /* stub */ }

  /** 平移：移动轨道中心 */
  pan(_deltaX: number, _deltaY: number): void { /* stub */ }

  /** 每帧更新相机位置 */
  update(_dt: number): void { /* stub */ }

  /** 设置轨道中心 */
  setTarget(target: Vec3): void {
    this.orbitTarget[0] = target[0];
    this.orbitTarget[1] = target[1];
    this.orbitTarget[2] = target[2];
  }

  /** 重置到初始状态 */
  reset(): void { /* stub */ }
}
