/**
 * CascadeSplitter — Practical Split Scheme (PSSM) frustum 划分纯函数。
 *
 * 给定相机 near/far 平面 + numCascades + lambda，返回 N 个级联的近远区间。
 * 标准 PSSM 公式 (Practical Split Scheme by Wolfgang Engel)：
 *   - lambda = 0: 均匀划分，远处 cascade 大、近处密集均等。
 *   - lambda = 1: 对数划分，相邻级别比例 = (far/near)^(1/N)，近处 cascade 极小、远处大。
 *   - lambda 推荐 0.5（mix uniform + log），实践常用值。
 *
 * 输出连续的 N 个 CascadeSplit，且 cascades[i].far == cascades[i+1].near。
 *
 * @see test/unit/renderer/cascade-splitter.test.ts
 */

export interface CascadeSplitOptions {
  /** 相机近裁剪面 */
  near: number;
  /** 相机远裁剪面 */
  far: number;
  /** 级联数（推荐 2-4） */
  numCascades: number;
  /** uniform↔log 混合系数 ∈ [0,1]，默认 0.5 */
  lambda?: number;
}

export interface CascadeSplit {
  near: number;
  far: number;
}

export function splitFrustum(_opts: CascadeSplitOptions): CascadeSplit[] {
  throw new Error('CascadeSplitter: Not implemented (stub)');
}

export const __STUB__ = true;
