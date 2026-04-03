/**
 * StaticBatch — 将多个共享同材质的静态 Mesh 合并为一次 draw call。
 * 顶点位置烘焙世界变换，适合不再移动的场景物体（建筑、地形碎片等）。
 *
 * @see test/unit/renderer/static-batch.test.ts
 */

import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import { normalMatrix as calcNormalMatrix } from '../math/mat4';

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

    // 统计各属性
    let totalVertexCount = 0;
    let hasNormals = false;
    let hasUvs = false;
    let hasIndices = false;

    for (const m of meshes) {
      const geo = m.geometry;
      totalVertexCount += geo.positions.length / 3;
      if (geo.normals) hasNormals = true;
      if (geo.uvs) hasUvs = true;
      if (geo.indices) hasIndices = true;
    }

    // 统计总索引数
    let totalIndexCount = 0;
    if (hasIndices) {
      for (const m of meshes) {
        const geo = m.geometry;
        totalIndexCount += geo.indices ? geo.indices.length : geo.positions.length / 3;
      }
    }

    // 分配合并缓冲区
    const mergedPositions = new Float32Array(totalVertexCount * 3);
    const mergedColors    = new Float32Array(totalVertexCount * 3);
    const mergedNormals   = hasNormals ? new Float32Array(totalVertexCount * 3) : null;
    const mergedUvs       = hasUvs     ? new Float32Array(totalVertexCount * 2) : null;
    const mergedIndices   = hasIndices  ? new Uint16Array(totalIndexCount)       : null;

    let vertexOffset = 0;
    let indexOffset  = 0;

    for (const m of meshes) {
      const geo = m.geometry;
      const wm  = m.worldMatrix;
      const vertexCount = geo.positions.length / 3;

      // 烘焙顶点位置（世界空间变换）
      for (let v = 0; v < vertexCount; v++) {
        const si = v * 3;
        const x = geo.positions[si], y = geo.positions[si + 1], z = geo.positions[si + 2];
        const rx = wm[0]*x + wm[4]*y + wm[8]*z  + wm[12];
        const ry = wm[1]*x + wm[5]*y + wm[9]*z  + wm[13];
        const rz = wm[2]*x + wm[6]*y + wm[10]*z + wm[14];
        const rw = wm[3]*x + wm[7]*y + wm[11]*z + wm[15];
        const di = (vertexOffset + v) * 3;
        if (rw !== 0 && rw !== 1) {
          mergedPositions[di]     = rx / rw;
          mergedPositions[di + 1] = ry / rw;
          mergedPositions[di + 2] = rz / rw;
        } else {
          mergedPositions[di]     = rx;
          mergedPositions[di + 1] = ry;
          mergedPositions[di + 2] = rz;
        }
      }

      // 直接拷贝 colors
      mergedColors.set(geo.colors, vertexOffset * 3);

      // 变换 normals（normalMatrix = transpose(inverse(worldMatrix))，方向向量 w=0）
      if (hasNormals && mergedNormals) {
        if (geo.normals) {
          const nm = calcNormalMatrix(wm);
          for (let v = 0; v < vertexCount; v++) {
            const si = v * 3;
            const nx = geo.normals[si], ny = geo.normals[si + 1], nz = geo.normals[si + 2];
            let rnx: number, rny: number, rnz: number;
            if (nm) {
              // 方向向量（w=0），忽略第 4 列（平移）
              rnx = nm[0]*nx + nm[4]*ny + nm[8]*nz;
              rny = nm[1]*nx + nm[5]*ny + nm[9]*nz;
              rnz = nm[2]*nx + nm[6]*ny + nm[10]*nz;
            } else {
              rnx = nx; rny = ny; rnz = nz;
            }
            const len = Math.sqrt(rnx*rnx + rny*rny + rnz*rnz) || 1;
            const di = (vertexOffset + v) * 3;
            mergedNormals[di]     = rnx / len;
            mergedNormals[di + 1] = rny / len;
            mergedNormals[di + 2] = rnz / len;
          }
        } else {
          // 该 mesh 无法线，填充默认朝前方向
          for (let v = 0; v < vertexCount; v++) {
            const di = (vertexOffset + v) * 3;
            mergedNormals[di]     = 0;
            mergedNormals[di + 1] = 0;
            mergedNormals[di + 2] = 1;
          }
        }
      }

      // 直接拷贝 uvs
      if (hasUvs && mergedUvs && geo.uvs) {
        mergedUvs.set(geo.uvs, vertexOffset * 2);
      }

      // 重建索引（偏移 baseVertex）
      if (hasIndices && mergedIndices) {
        if (geo.indices) {
          for (let i = 0; i < geo.indices.length; i++) {
            mergedIndices[indexOffset + i] = geo.indices[i] + vertexOffset;
          }
          indexOffset += geo.indices.length;
        } else {
          // 生成顺序索引
          for (let v = 0; v < vertexCount; v++) {
            mergedIndices[indexOffset + v] = vertexOffset + v;
          }
          indexOffset += vertexCount;
        }
      }

      vertexOffset += vertexCount;
    }

    this.mergedGeometry = new Geometry({
      positions: mergedPositions,
      colors:    mergedColors,
      normals:   mergedNormals   ?? undefined,
      uvs:       mergedUvs       ?? undefined,
      indices:   mergedIndices   ?? undefined,
    });
    this.mesh = new Mesh(this.mergedGeometry, this.material, 'static-batch');
  }
}

/**
 * 将一组 Mesh 按 Material 实例分组，每组生成一个 StaticBatch。
 * @returns 合并后的 StaticBatch 数组（每个 batch 对应一种 Material）
 */
export function batchMeshes(meshes: Mesh[]): StaticBatch[] {
  if (meshes.length === 0) return [];

  const groups = new Map<Material, Mesh[]>();
  for (const mesh of meshes) {
    const mat = mesh.material;
    if (!groups.has(mat)) {
      groups.set(mat, []);
    }
    groups.get(mat)!.push(mesh);
  }

  const batches: StaticBatch[] = [];
  for (const group of groups.values()) {
    batches.push(new StaticBatch(group));
  }
  return batches;
}
