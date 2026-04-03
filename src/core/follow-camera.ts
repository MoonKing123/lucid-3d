/**
 * FollowCamera — 弹簧阻尼跟随相机。
 * 以可配置的偏移量和阻尼系数平滑跟随目标 Node3D。
 * 适用于 3D 跑酷/赛车/角色扮演等第三人称视角。
 * @see test/unit/core/follow-camera.test.ts
 */

export const __STUB__ = true;

import { PerspectiveCamera } from './camera';
import type { Node3D } from './node3d';
import { type Vec3, vec3 } from '../math/vec3';

export interface FollowCameraOptions {
  /** 相机相对目标的偏移（世界空间），默认 [0, 5, -10] */
  offset?: Vec3;
  /** 注视点相对目标的偏移，默认 [0, 0, 0] */
  lookAtOffset?: Vec3;
  /** 阻尼系数 0-1，0=瞬间跟上，1=永不移动，默认 0.1 */
  damping?: number;
  /** 最小跟随距离，默认 1 */
  minDistance?: number;
  /** 最大跟随距离，默认 100 */
  maxDistance?: number;
}

export class FollowCamera extends PerspectiveCamera {
  target: Node3D | null = null;
  offset: Vec3;
  lookAtOffset: Vec3;
  damping: number;
  minDistance: number;
  maxDistance: number;

  constructor(options?: FollowCameraOptions) {
    super();
    this.offset = options?.offset ?? vec3(0, 5, -10);
    this.lookAtOffset = options?.lookAtOffset ?? vec3(0, 0, 0);
    this.damping = options?.damping ?? 0.1;
    this.minDistance = options?.minDistance ?? 1;
    this.maxDistance = options?.maxDistance ?? 100;
  }

  /** 每帧更新相机位置和朝向 */
  update(_dt: number): void {
    // stub
  }

  /** 瞬间移动到理想位置（无阻尼） */
  snap(): void {
    // stub
  }
}
