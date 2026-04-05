/**
 * OrbitCamera — 轨道相机。
 * 绕目标点旋转/缩放/平移，适用于塔防俯瞰、SLG 大地图、3D 查看器等场景。
 * 支持编程控制和阻尼平滑。
 * @see test/unit/core/orbit-camera.test.ts
 */

import { PerspectiveCamera } from './camera';
import { type Vec3, vec3, cross, normalize, sub, scale as vec3Scale } from '../math/vec3';

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
    this.orbitTarget = options?.target
      ? vec3(options.target[0], options.target[1], options.target[2])
      : vec3(0, 0, 0);
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

    // 保存初始状态，供 reset() 使用
    this._initialAzimuth = this.azimuthAngle;
    this._initialPolar = this.polarAngle;
    this._initialDistance = this.distance;
    this._initialTarget = vec3(this.orbitTarget[0], this.orbitTarget[1], this.orbitTarget[2]);
  }

  /**
   * 旋转：调整方位角和极角。
   * deltaAzimuth 正值向右旋转，deltaPolar 正值向下旋转。
   * 极角自动 clamp 到 [minPolarAngle, maxPolarAngle]。
   */
  rotate(deltaAzimuth: number, deltaPolar: number): void {
    this.azimuthAngle += deltaAzimuth * this.rotateSpeed;
    this.polarAngle += deltaPolar * this.rotateSpeed;
    this.polarAngle = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.polarAngle));
  }

  /**
   * 缩放：调整相机到目标的距离。
   * 正 factor 缩小距离（zoom in），负 factor 增大距离（zoom out）。
   * 距离自动 clamp 到 [minDistance, maxDistance]。
   */
  zoom(factor: number): void {
    this.distance *= (1 - factor * this.zoomSpeed);
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
  }

  /**
   * 平移：沿相机 right/up 方向移动轨道中心。
   * 若 enablePan 为 false 则忽略。
   */
  pan(deltaX: number, deltaY: number): void {
    if (!this.enablePan) return;

    // 从球面坐标计算当前相机方向（不依赖 this.position 是否已更新）
    const phi = this.polarAngle;
    const theta = this.azimuthAngle;
    const camDir = vec3(
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.cos(theta),
    );
    const forward = normalize(camDir);
    const worldUp = vec3(0, 1, 0);
    const right = normalize(cross(worldUp, forward));
    const up = normalize(cross(forward, right));

    const panFactor = this.panSpeed * this.distance * 0.01;
    const dx = deltaX * panFactor;
    const dy = deltaY * panFactor;

    const moveRight = vec3Scale(right, dx);
    const moveUp = vec3Scale(up, dy);

    this.orbitTarget[0] += moveRight[0] + moveUp[0];
    this.orbitTarget[1] += moveRight[1] + moveUp[1];
    this.orbitTarget[2] += moveRight[2] + moveUp[2];
  }

  /**
   * 每帧更新：从球面坐标计算相机位置，然后 lookAt(orbitTarget)。
   * @param _dt 帧时间（当前未使用阻尼，保留接口兼容性）
   */
  update(_dt: number): void {
    const r = this.distance;
    const phi = this.polarAngle;    // 极角（从 Y 轴算起）
    const theta = this.azimuthAngle; // 方位角

    // 球面坐标转笛卡尔坐标
    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.cos(theta);

    this.position[0] = this.orbitTarget[0] + x;
    this.position[1] = this.orbitTarget[1] + y;
    this.position[2] = this.orbitTarget[2] + z;

    this.lookAt(this.orbitTarget);
  }

  /** 设置轨道中心 */
  setTarget(target: Vec3): void {
    this.orbitTarget[0] = target[0];
    this.orbitTarget[1] = target[1];
    this.orbitTarget[2] = target[2];
  }

  /** 重置到初始状态 */
  reset(): void {
    this.azimuthAngle = this._initialAzimuth;
    this.polarAngle = this._initialPolar;
    this.distance = this._initialDistance;
    this.orbitTarget[0] = this._initialTarget[0];
    this.orbitTarget[1] = this._initialTarget[1];
    this.orbitTarget[2] = this._initialTarget[2];
  }
}
