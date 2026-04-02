import { Light } from './light';
import type { Vec3 } from '../math/vec3';

/**
 * 点光源 — 从场景中某一点向所有方向发射光线，带距离衰减。
 * 用于灯泡、火把、爆炸等效果。
 *
 * 衰减公式（兼容 Three.js）：
 *   distance == 0: 1 / max(d^decay, 0.01)       — 无截断，永不为零
 *   distance >  0: max((1 - d/distance)^decay, 0) — 在 distance 处截断为 0，decay 越大衰减越陡
 * 其中 d 为光源位置到目标点的欧氏距离。
 */
export class PointLight extends Light {
  distance: number;
  decay: number;

  constructor(opts?: {
    color?: Vec3;
    intensity?: number;
    distance?: number;
    decay?: number;
  }) {
    super(opts?.color, opts?.intensity);
    this.distance = opts?.distance ?? 0;
    this.decay = opts?.decay ?? 2;
  }

  getAttenuationAt(target: Vec3): number {
    const px = this.position[0];
    const py = this.position[1];
    const pz = this.position[2];
    const dx = px - target[0];
    const dy = py - target[1];
    const dz = pz - target[2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (this.distance === 0) {
      return 1 / Math.max(Math.pow(d, this.decay), 0.01);
    }
    return Math.pow(Math.max(1 - d / this.distance, 0), this.decay);
  }
}
