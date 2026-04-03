/**
 * SkinnedMesh — 蒙皮网格，将 Geometry 与 Skeleton 关联。
 * @see test/unit/renderer/skinned-mesh.test.ts
 */

import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import { Skeleton } from '../animation/skeleton';

export class SkinnedMesh extends Mesh {
  skeleton: Skeleton;

  constructor(
    geometry: Geometry,
    material: Material,
    skeleton: Skeleton,
    name = 'skinned-mesh',
  ) {
    super(geometry, material, name);
    this.skeleton = skeleton;
  }
}
