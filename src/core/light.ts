/**
 * Light — 光源基类及具体实现
 * AmbientLight: 环境光
 * DirectionalLight: 平行光
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Node3D } from './node3d';

export abstract class Light extends Node3D {
  color: Vec3;
  intensity: number;

  constructor(color: Vec3 = vec3(1, 1, 1), intensity = 1) {
    super();
    this.color = color;
    this.intensity = intensity;
  }
}

export class AmbientLight extends Light {
  constructor(color: Vec3 = vec3(1, 1, 1), intensity = 1) {
    super(color, intensity);
  }
}

export class DirectionalLight extends Light {
  direction: Vec3;

  constructor(
    color: Vec3 = vec3(1, 1, 1),
    intensity = 1,
    direction: Vec3 = vec3(0, -1, 0),
  ) {
    super(color, intensity);
    this.direction = direction;
  }
}
