import { Node3D } from './node3d';
import { type Vec3, vec3 } from '../math/vec3';

/**
 * 所有光源的抽象基类。
 * 继承 Node3D，使光源参与场景图。
 */
export abstract class Light extends Node3D {
  color: Vec3;
  intensity: number;

  constructor(color?: Vec3, intensity?: number) {
    super();
    this.color = color ?? vec3(1, 1, 1);
    this.intensity = intensity ?? 1.0;
  }
}

/**
 * 环境光 — 均匀照亮所有表面，无方向性。
 */
export class AmbientLight extends Light {
  constructor(color?: Vec3, intensity?: number) {
    super(color, intensity);
  }
}

/**
 * 方向光 — 模拟太阳光，平行光线从指定方向射入。
 * direction 表示光线行进方向（例如 (0,-1,0) 表示从上方射下）。
 */
export class DirectionalLight extends Light {
  direction: Vec3;

  constructor(color?: Vec3, intensity?: number, direction?: Vec3) {
    super(color, intensity);
    this.direction = direction ?? vec3(0, -1, 0);
  }
}
