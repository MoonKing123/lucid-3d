/**
 * STUB — SkinnedMesh (not yet implemented).
 * @see test/unit/renderer/skinned-mesh.test.ts
 */
export const __STUB__ = true;

import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import { Skeleton } from '../animation/skeleton';

export class SkinnedMesh extends Mesh {
  skeleton: Skeleton;

  constructor(
    _geometry: Geometry,
    _material: Material,
    _skeleton: Skeleton,
    _name = 'skinned-mesh',
  ) {
    super(_geometry, _material, _name);
    this.skeleton = _skeleton;
    throw new Error('Not implemented');
  }
}
