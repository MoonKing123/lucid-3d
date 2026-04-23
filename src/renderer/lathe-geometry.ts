/**
 * LatheGeometry — 2D profile 绕 Y 轴旋转成型几何体。
 * 用于生成花瓶、酒杯、陶罐、灯罩等旋转对称模型。
 *
 * 实现思路：
 * 1. points 是 2D (x, y) 坐标数组，x 代表距 Y 轴半径，y 代表沿 Y 轴高度
 * 2. 绕 Y 轴旋转 segments 次，每个 profile 点产生 segments+1 个顶点环
 * 3. 相邻两环展开为四边形带
 */

import type { Geometry } from './geometry';

export const __STUB__ = true;

export interface LatheGeometryOptions {
  points: Array<[number, number]>; // (x=半径, y=高度) 沿 Y 轴从下到上
  segments?: number;   // 绕 Y 轴分段数，默认 12
  phiStart?: number;   // 起始角度（弧度），默认 0
  phiLength?: number;  // 角度跨度（弧度），默认 2π
}

export function createLatheGeometry(_opts: LatheGeometryOptions): Geometry {
  throw new Error('Not implemented');
}
