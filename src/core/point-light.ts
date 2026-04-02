/**
 * STUB — PointLight (not yet implemented).
 * Positional light with distance attenuation.
 * @see test/unit/core/point-light.test.ts
 */
export const __STUB__ = true;

import { Light } from './light';
import type { Vec3 } from '../math/vec3';

/**
 * 点光源 — 从场景中某一点向所有方向发射光线。
 * 有距离衰减（intensity falloff），用于灯泡、火把等效果。
 */
export class PointLight extends Light {
  distance!: number;
  decay!: number;

  constructor(_opts?: { color?: Vec3; intensity?: number; distance?: number; decay?: number }) {
    super();
    throw new Error('Not implemented');
  }

  /**
   * 计算该点光源在 target 位置的衰减系数。
   * 返回值: distance=0 时为 1/max(d^decay, 0.01)，
   * distance>0 时为 max(1-(d/distance)^decay, 0)。
   */
  getAttenuationAt(_target: Vec3): number {
    throw new Error('Not implemented');
  }
}
