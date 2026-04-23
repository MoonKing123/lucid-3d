/**
 * Terrain — Heightmap 驱动的地形 Mesh
 *
 * 用途：从 Float32Array/Uint8Array 高度图数据生成三角化地形网格。
 * 支持自定义分辨率、世界尺寸、垂直缩放。
 *
 * API 设计（Forge 实现时参考）：
 * - new Terrain({ heightmap, widthSegments, depthSegments, width, depth, heightScale })
 * - heightmap: Float32Array 长度必须等于 (widthSegments+1) * (depthSegments+1)
 * - 自动生成 position / uv / normal attributes
 * - getHeightAt(x, z): 双线性插值采样，用于角色贴地 / 碰撞查询
 */

export const __STUB__ = true;

export interface TerrainOptions {
  heightmap: Float32Array;
  widthSegments: number;
  depthSegments: number;
  width?: number;
  depth?: number;
  heightScale?: number;
}

export class Terrain {
  constructor(_opts: TerrainOptions) {
    throw new Error('Not implemented');
  }

  getHeightAt(_x: number, _z: number): number {
    throw new Error('Not implemented');
  }
}
