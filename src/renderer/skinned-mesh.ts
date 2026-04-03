/**
 * SkinnedMesh — 带骨骼蒙皮的可渲染节点。
 * 扩展 Mesh，持有 Skeleton 引用，用于骨骼动画渲染。
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
