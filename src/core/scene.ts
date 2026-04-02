/**
 * STUB — Scene container (not yet implemented).
 * @see test/unit/core/scene.test.ts
 *
 * Scene extends Node3D as the root container for a 3D scene.
 * Provides background color, linear fog config, and auto light collection.
 */
export const __STUB__ = true;

import { Node3D } from './node3d';
import { type Vec3, vec3 } from '../math/vec3';
import type { AmbientLight, DirectionalLight } from './light';
import type { PointLight } from './point-light';

export interface FogOptions {
  color: Vec3;
  near: number;
  far: number;
}

export interface SceneOptions {
  background?: Vec3;
  fog?: FogOptions;
}

export interface CollectedLights {
  ambient: AmbientLight[];
  directional: DirectionalLight[];
  point: PointLight[];
}

export class Scene extends Node3D {
  background: Vec3;
  fog: FogOptions | null;

  constructor(_opts?: SceneOptions) {
    super('scene');
    this.background = vec3(0.1, 0.1, 0.1);
    this.fog = null;
    throw new Error('Not implemented');
  }

  collectLights(): CollectedLights {
    throw new Error('Not implemented');
  }
}
