/**
 * CapsuleGeometry — 胶囊体几何（两半球 + 中段圆柱）。
 * 角色碰撞代理、胶囊关节、快速角色模型的标准形状。
 *
 * 实现思路：
 * 1. 上半球 capSegments 环 (从 π/2 到 π)
 * 2. 中段圆柱 2 环 (顶部 + 底部，高度差 = length)
 * 3. 下半球 capSegments 环 (从 0 到 π/2)
 * 4. 所有环通过 radialSegments+1 顶点环展开为四边形带
 * 5. length=0 退化为球体
 */

import type { Geometry } from './geometry';

export const __STUB__ = true;

export interface CapsuleGeometryOptions {
  radius?: number;         // 半球半径 + 圆柱半径，默认 0.5
  length?: number;         // 中段圆柱长度 (不含两端半球)，默认 1
  capSegments?: number;    // 每个半球沿经度分段数，默认 4
  radialSegments?: number; // 绕 Y 轴分段数，默认 16
}

export function createCapsuleGeometry(_opts?: CapsuleGeometryOptions): Geometry {
  throw new Error('Not implemented');
}
