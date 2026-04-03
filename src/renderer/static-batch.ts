/**
 * StaticBatch — 将多个共享同材质的静态 Mesh 合并为一次 draw call。
 * 顶点位置烘焙世界变换，适合不再移动的场景物体（建筑、地形碎片等）。
 *
 * @see test/unit/renderer/static-batch.test.ts
 */
export const __STUB__ = true;

import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';

/**
 * 一个合并后的批次：包含合并后的 Geometry、共享的 Material、以及可直接渲染的 Mesh。
 */
export class StaticBatch {
  /** 合并后的几何体 */
  readonly mergedGeometry: Geometry;
  /** 共享的材质（所有源 Mesh 的 material 相同） */
  readonly material: Material;
  /** 可直接添加到 Scene 的合并 Mesh */
  readonly mesh: Mesh;
  /** 合并前的源 Mesh 数量 */
  readonly sourceCount: number;

  /**
   * @param meshes 必须使用同一个 Material 实例的 Mesh 数组
   * @throws 如果 meshes 为空或材质不一致
   */
  constructor(meshes: Mesh[]) {
    if (meshes.length === 0) {
      throw new Error('StaticBatch requires at least one mesh');
    }
    const mat = meshes[0].material;
    for (let i = 1; i < meshes.length; i++) {
      if (meshes[i].material !== mat) {
        throw new Error('All meshes in a StaticBatch must share the same Material instance');
      }
    }
    this.sourceCount = meshes.length;
    this.material = mat;
    // Stub — 实际实现需要：
    // 1. 遍历每个 mesh，将顶点位置乘以其 worldMatrix 烘焙
    // 2. 合并所有顶点数据（positions, colors, normals, uvs）
    // 3. 重建索引（偏移后拼接）
    // 4. 创建合并后的 Geometry 和 Mesh
    this.mergedGeometry = meshes[0].geometry; // placeholder
    this.mesh = new Mesh(this.mergedGeometry, this.material, 'static-batch');
  }
}

/**
 * 将一组 Mesh 按 Material 分组，每组生成一个 StaticBatch。
 * @returns 合并后的 StaticBatch 数组（每个 batch 对应一种 Material）
 */
export function batchMeshes(_meshes: Mesh[]): StaticBatch[] {
  throw new Error('Not implemented — stub');
}
