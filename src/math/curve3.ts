/**
 * Curve3 — CatmullRom 3D 参数化样条曲线。
 *
 * 通过控制点序列创建平滑 3D 曲线，支持：
 * - getPoint(t)        — 参数 t∈[0,1] 处的位置
 * - getTangent(t)      — 参数 t 处的归一化切线
 * - getPoints(n)       — n+1 个等参数间距的采样点
 * - getLength()        — 弧长近似
 * - getPointAtLength(d) — 弧长 d 处的位置
 *
 * CatmullRom 插值经过所有控制点，tension 参数控制曲率。
 *
 * @module math/curve3
 */

export const __STUB__ = true;

import type { Vec3 } from './vec3';

export interface Curve3Options {
  /** Tension parameter. 0 = Catmull-Rom default, 1 = straight lines. Default 0. */
  tension?: number;
  /** Whether the curve loops back to the first point. Default false. */
  closed?: boolean;
}

export class Curve3 {
  readonly points: Vec3[];
  readonly tension: number;
  readonly closed: boolean;

  constructor(_points: Vec3[], _opts?: Curve3Options) {
    this.points = [];
    this.tension = 0;
    this.closed = false;
    throw new Error('Not implemented — stub');
  }

  /** Get position at parameter t ∈ [0, 1]. */
  getPoint(_t: number): Vec3 {
    throw new Error('Not implemented — stub');
  }

  /** Get normalized tangent at parameter t ∈ [0, 1]. */
  getTangent(_t: number): Vec3 {
    throw new Error('Not implemented — stub');
  }

  /** Get n+1 evenly-spaced points along the curve (parameter space). */
  getPoints(_divisions: number): Vec3[] {
    throw new Error('Not implemented — stub');
  }

  /** Approximate total arc length by summing segment distances. */
  getLength(): number {
    throw new Error('Not implemented — stub');
  }

  /** Get position at a given arc length distance from start. */
  getPointAtLength(_d: number): Vec3 {
    throw new Error('Not implemented — stub');
  }
}
