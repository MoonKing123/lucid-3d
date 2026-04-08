/**
 * FPSCamera — 第一人称相机。
 * 封装 PerspectiveCamera，通过 yaw（绕 Y 轴）和 pitch（绕 X 轴）控制视角。
 * 相机位置与玩家脚部位置绑定，加上头部高度偏移。
 */

import { PerspectiveCamera } from '../../../src/core/camera';
import { type Vec3, vec3 } from '../../../src/math/vec3';

const DEG_TO_RAD = Math.PI / 180;

export class FPSCamera {
  readonly camera: PerspectiveCamera;

  /** 水平旋转角（绕 Y 轴），弧度 */
  yaw: number = 0;
  /** 垂直旋转角（绕 X 轴），弧度，clamp 在 ±89° */
  pitch: number = 0;
  /** 相机相对玩家脚部的头顶高度（世界单位） */
  headHeight: number;
  /** 鼠标灵敏度（弧度/像素） */
  sensitivity: number;

  private static readonly PITCH_LIMIT = 89 * DEG_TO_RAD;

  constructor(opts?: {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
    headHeight?: number;
    sensitivity?: number;
  }) {
    this.camera = new PerspectiveCamera({
      fov: opts?.fov ?? Math.PI / 2.5,  // ~72°
      aspect: opts?.aspect ?? 16 / 9,
      near: opts?.near ?? 0.1,
      far: opts?.far ?? 500,
    });
    this.headHeight = opts?.headHeight ?? 1.7;
    this.sensitivity = opts?.sensitivity ?? 0.002;
  }

  /**
   * 应用鼠标位移到 yaw/pitch。
   * dx > 0 → 向右看（yaw 减小），dy > 0 → 向下看（pitch 减小）。
   */
  applyMouseDelta(dx: number, dy: number): void {
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(
      -FPSCamera.PITCH_LIMIT,
      Math.min(FPSCamera.PITCH_LIMIT, this.pitch),
    );
  }

  /**
   * 获取仅考虑 yaw 的水平前向向量（用于 WASD 移动）。
   * yaw=0 时为 (0, 0, -1)（看向 -Z）。
   */
  getForwardXZ(): Vec3 {
    return vec3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /**
   * 获取仅考虑 yaw 的水平右向向量（用于 A/D 横移）。
   */
  getRightXZ(): Vec3 {
    return vec3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }

  /**
   * 获取完整三维视线方向（yaw + pitch）。
   */
  getViewDirection(): Vec3 {
    const cosPitch = Math.cos(this.pitch);
    return vec3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cosPitch,
    );
  }

  /**
   * 每帧更新相机位置和朝向。
   * 将相机绑定到玩家位置 + 头部偏移，并根据 yaw/pitch 计算 lookAt 目标。
   */
  update(playerPosition: Vec3): void {
    const camX = playerPosition[0];
    const camY = playerPosition[1] + this.headHeight;
    const camZ = playerPosition[2];

    this.camera.position[0] = camX;
    this.camera.position[1] = camY;
    this.camera.position[2] = camZ;

    const dir = this.getViewDirection();
    this.camera.lookAt(vec3(camX + dir[0], camY + dir[1], camZ + dir[2]));
  }
}
