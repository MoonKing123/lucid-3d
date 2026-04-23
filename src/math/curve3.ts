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

import { vec3 } from './vec3';
import type { Vec3 } from './vec3';

export interface Curve3Options {
  /** Tension parameter. 0 = Catmull-Rom default, 1 = straight lines. Default 0. */
  tension?: number;
  /** Whether the curve loops back to the first point. Default false. */
  closed?: boolean;
}

/** 镜像点：关于 anchor 点对 opposite 做反射，用于边界外推 */
function mirror(anchor: Vec3, opposite: Vec3): Vec3 {
  return vec3(
    2 * anchor[0] - opposite[0],
    2 * anchor[1] - opposite[1],
    2 * anchor[2] - opposite[2],
  );
}

/** 单分量 CatmullRom 插值 */
function cr1d(p0: number, p1: number, p2: number, p3: number, alpha: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return p1
    + t * alpha * (p2 - p0)
    + t2 * (2 * alpha * p0 + (alpha - 3) * p1 + (3 - 2 * alpha) * p2 - alpha * p3)
    + t3 * (-alpha * p0 + (2 - alpha) * p1 + (alpha - 2) * p2 + alpha * p3);
}

/** 单分量 CatmullRom 一阶导数 */
function crDeriv1d(p0: number, p1: number, p2: number, p3: number, alpha: number, t: number): number {
  const t2 = t * t;
  return alpha * (p2 - p0)
    + 2 * t * (2 * alpha * p0 + (alpha - 3) * p1 + (3 - 2 * alpha) * p2 - alpha * p3)
    + 3 * t2 * (-alpha * p0 + (2 - alpha) * p1 + (alpha - 2) * p2 + alpha * p3);
}

export class Curve3 {
  readonly points: Vec3[];
  readonly tension: number;
  readonly closed: boolean;

  private _lengthTable: { t: number; d: number }[] | null = null;
  private _totalLength: number | null = null;

  constructor(points: Vec3[], opts?: Curve3Options) {
    this.points = [...points];
    this.tension = opts?.tension ?? 0;
    this.closed = opts?.closed ?? false;
  }

  /** 获取段所需的 4 个控制点 */
  private _getSegPoints(segIndex: number): [Vec3, Vec3, Vec3, Vec3] {
    const pts = this.points;
    const N = pts.length;
    if (this.closed) {
      const P0 = pts[((segIndex - 1) % N + N) % N];
      const P1 = pts[segIndex % N];
      const P2 = pts[(segIndex + 1) % N];
      const P3 = pts[(segIndex + 2) % N];
      return [P0, P1, P2, P3];
    }
    // 开放曲线：镜像边界外推，保证端点处线性
    const P1 = pts[segIndex];
    const P2 = pts[segIndex + 1];
    const P0 = segIndex > 0 ? pts[segIndex - 1] : mirror(P1, P2);
    const P3 = segIndex + 2 < N ? pts[segIndex + 2] : mirror(P2, P1);
    return [P0, P1, P2, P3];
  }

  /** 将全局 t∈[0,1] 映射为 (段索引, 局部 t) */
  private _tToSeg(t: number): [number, number] {
    const N = this.points.length;
    const numSeg = this.closed ? N : N - 1;
    const raw = t * numSeg;
    const segIndex = Math.min(Math.floor(raw), numSeg - 1);
    return [segIndex, raw - segIndex];
  }

  /** Get position at parameter t ∈ [0, 1]. */
  getPoint(t: number): Vec3 {
    const [segIndex, localT] = this._tToSeg(t);
    const alpha = (1 - this.tension) / 2;
    const [P0, P1, P2, P3] = this._getSegPoints(segIndex);
    return vec3(
      cr1d(P0[0], P1[0], P2[0], P3[0], alpha, localT),
      cr1d(P0[1], P1[1], P2[1], P3[1], alpha, localT),
      cr1d(P0[2], P1[2], P2[2], P3[2], alpha, localT),
    );
  }

  /** Get normalized tangent at parameter t ∈ [0, 1]. */
  getTangent(t: number): Vec3 {
    const [segIndex, localT] = this._tToSeg(t);
    const alpha = (1 - this.tension) / 2;
    const [P0, P1, P2, P3] = this._getSegPoints(segIndex);
    const dx = crDeriv1d(P0[0], P1[0], P2[0], P3[0], alpha, localT);
    const dy = crDeriv1d(P0[1], P1[1], P2[1], P3[1], alpha, localT);
    const dz = crDeriv1d(P0[2], P1[2], P2[2], P3[2], alpha, localT);
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) return vec3(1, 0, 0);
    return vec3(dx / len, dy / len, dz / len);
  }

  /** Get n+1 evenly-spaced points along the curve (parameter space). */
  getPoints(divisions: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i <= divisions; i++) {
      result.push(this.getPoint(i / divisions));
    }
    return result;
  }

  /** Approximate total arc length by summing segment distances. */
  getLength(): number {
    if (this._totalLength !== null) return this._totalLength;
    this._buildLengthTable();
    return this._totalLength!;
  }

  /** Get position at a given arc length distance from start. */
  getPointAtLength(d: number): Vec3 {
    this._buildLengthTable();
    const table = this._lengthTable!;
    const totalLen = this._totalLength!;

    if (d <= 0) return this.getPoint(0);
    if (d >= totalLen) return this.getPoint(1);

    let lo = 0;
    let hi = table.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid].d <= d) lo = mid;
      else hi = mid;
    }

    const a = table[lo];
    const b = table[hi];
    const span = b.d - a.d;
    if (span < 1e-10) return this.getPoint(a.t);
    const frac = (d - a.d) / span;
    return this.getPoint(a.t + (b.t - a.t) * frac);
  }

  private _buildLengthTable(): void {
    if (this._lengthTable !== null) return;

    const STEPS = 200;
    const table: { t: number; d: number }[] = [{ t: 0, d: 0 }];
    let prev = this.getPoint(0);
    let total = 0;

    for (let i = 1; i <= STEPS; i++) {
      const t = i / STEPS;
      const curr = this.getPoint(t);
      const dx = curr[0] - prev[0];
      const dy = curr[1] - prev[1];
      const dz = curr[2] - prev[2];
      total += Math.sqrt(dx * dx + dy * dy + dz * dz);
      table.push({ t, d: total });
      prev = curr;
    }

    this._lengthTable = table;
    this._totalLength = total;
  }
}
