/**
 * STUB — Sprite (not yet implemented).
 * Billboard quad that always faces the camera.
 * @see test/unit/renderer/sprite.test.ts
 */
export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Material } from './material';
import type { Texture } from './texture';

export class SpriteMaterial extends Material {
  color!: Vec3;
  opacity!: number;
  texture!: Texture | null;

  constructor(_opts?: { color?: Vec3; opacity?: number; texture?: Texture }) {
    super();
    throw new Error('Not implemented');
  }
}

export class Sprite extends Node3D {
  material!: SpriteMaterial;

  constructor(_material?: SpriteMaterial) {
    super('sprite');
    throw new Error('Not implemented');
  }
}
