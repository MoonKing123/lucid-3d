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

export function splitFrustum(opts: CascadeSplitOptions): CascadeSplit[] {
  const { near, far, numCascades } = opts;
  const lambda = opts.lambda ?? 0.5;

  if (numCascades < 1) throw new Error('CascadeSplitter: numCascades 必须 >= 1');
  if (near >= far) throw new Error('CascadeSplitter: near 必须小于 far');

  const splits: CascadeSplit[] = [];
  let prevBound = near;

  for (let i = 1; i <= numCascades; i++) {
    const t = i / numCascades;
    const uniformSplit = near + (far - near) * t;
    // near=0 时对数项无意义，退化为 uniform
    const logSplit = near > 0 ? near * Math.pow(far / near, t) : uniformSplit;
    const bound = i < numCascades
      ? lambda * logSplit + (1 - lambda) * uniformSplit
      : far; // 最后一级精确等于 far，消除浮点误差
    splits.push({ near: prevBound, far: bound });
    prevBound = bound;
  }

  return splits;
}
