/**
 * TubeGeometry — 沿 Curve3 路径扫掠的管道几何体。
 * 为 Curve3 (Phase 35) 提供可视化管道表面：轨道、蛇形路径、电缆、河流等。
 *
 * 实现思路：
 * 1. 沿 curve 采样 tubularSegments+1 个环
 * 2. 每个环使用 Frenet-like frame (tangent + binormal 约定) 生成 radialSegments+1 个顶点
 * 3. 顶点环展开为四边形带 (2 三角形/四边形)
 */

import type { Geometry } from './geometry';
import type { Curve3 } from '../math/curve3';

export const __STUB__ = true;

export interface TubeGeometryOptions {
  curve: Curve3;
  tubularSegments?: number; // 沿 curve 方向分段数，默认 64
  radius?: number;           // 管道半径，默认 0.1
  radialSegments?: number;   // 每环分段数，默认 8
  closed?: boolean;          // 首尾相连，默认 false
}

export function createTubeGeometry(_opts: TubeGeometryOptions): Geometry {
  throw new Error('Not implemented');
}
