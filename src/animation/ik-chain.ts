/**
 * IKChain — Skeleton 集成层，把 IK 求解结果应用到 bone hierarchy。
 * @see test/unit/animation/ik-chain.test.ts
 */

import { type Vec3, vec3, add } from '../math/vec3';
import { type Quat, quat, multiplyQuat, conjugate, normalizeQuat, slerp } from '../math/quat';
import { type Skeleton } from './skeleton';
import { solveTwoBoneIK } from './two-bone-ik';
import { solveCCD } from './ccd-solver';

export type IKSolverType = 'two-bone' | 'ccd';

export interface IKChainOptions {
  solver: IKSolverType;
  boneIndices: number[];   // skeleton 中的 bone 索引,必须是父子链
  target: Vec3;
  iterations?: number;     // 仅 ccd 使用,默认 10
  tolerance?: number;      // 仅 ccd 使用,默认 0.01
  weight?: number;         // 0~1,部分应用 IK 旋转,默认 1
}

function rotateVecByQuat(q: Quat, v: Vec3): Vec3 {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const vx = v[0], vy = v[1], vz = v[2];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return vec3(
    vx + qw * tx + qy * tz - qz * ty,
    vy + qw * ty + qz * tx - qx * tz,
    vz + qw * tz + qx * ty - qy * tx,
  );
}

export class IKChain {
  private _solver: IKSolverType;
  private _boneIndices: number[];
  private _target: Vec3;
  private _iterations: number;
  private _tolerance: number;
  private _weight: number;

  constructor(options: IKChainOptions) {
    const { solver, boneIndices, target, iterations = 10, tolerance = 0.01, weight = 1 } = options;

    if (solver === 'two-bone' && boneIndices.length !== 3) {
      throw new Error('two-bone solver requires exactly 3 bone indices');
    }
    if (solver === 'ccd' && boneIndices.length < 2) {
      throw new Error('ccd solver requires at least 2 bone indices');
    }

    this._solver = solver;
    this._boneIndices = boneIndices.slice();
    this._target = target;
    this._iterations = iterations;
    this._tolerance = tolerance;
    this._weight = weight;
  }

  setTarget(target: Vec3): void {
    this._target = target;
  }

  solve(skeleton: Skeleton): boolean {
    if (skeleton == null) throw new Error('skeleton is required');

    const indices = this._boneIndices;

    // 验证索引不越界
    for (const idx of indices) {
      if (idx < 0 || idx >= skeleton.boneCount) {
        throw new Error(`Bone index ${idx} out of bounds (boneCount=${skeleton.boneCount})`);
      }
    }

    // 验证 boneIndices 是连续父子链
    for (let i = 1; i < indices.length; i++) {
      if (skeleton.bones[indices[i]].parentIndex !== indices[i - 1]) {
        throw new Error('boneIndices is not a consecutive parent-child chain');
      }
    }

    // 计算所有骨骼 [0..maxIdx] 的世界旋转和位置（不含 IBM）
    const maxIdx = Math.max(...indices);
    const worldRots: Quat[] = new Array(maxIdx + 1);
    const worldPos: Vec3[] = new Array(maxIdx + 1);

    for (let i = 0; i <= maxIdx; i++) {
      const lr = skeleton.localRotations;
      const lp = skeleton.localPositions;
      const localRot = quat(lr[i * 4], lr[i * 4 + 1], lr[i * 4 + 2], lr[i * 4 + 3]);
      const localPos = vec3(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2]);

      const parentIndex = skeleton.bones[i].parentIndex;
      if (parentIndex < 0) {
        worldRots[i] = localRot;
        worldPos[i] = localPos;
      } else {
        worldRots[i] = normalizeQuat(multiplyQuat(worldRots[parentIndex], localRot));
        const rotated = rotateVecByQuat(worldRots[parentIndex], localPos);
        worldPos[i] = add(worldPos[parentIndex], rotated);
      }
    }

    let converged: boolean;

    if (this._solver === 'two-bone') {
      const result = solveTwoBoneIK({
        rootPos: worldPos[indices[0]],
        midPos: worldPos[indices[1]],
        endPos: worldPos[indices[2]],
        targetPos: this._target,
      });

      // rootRotation 应用到 boneIndices[0]，其父节点世界旋转不变
      const rootParentIdx = skeleton.bones[indices[0]].parentIndex;
      const rootParentWorldRot = rootParentIdx >= 0 ? worldRots[rootParentIdx] : quat(0, 0, 0, 1);
      this._applyWorldDelta(skeleton, indices[0], result.rootRotation, worldRots[indices[0]], rootParentWorldRot);

      // midRotation 应用到 boneIndices[1]，父节点 = boneIndices[0]（使用原始世界旋转）
      this._applyWorldDelta(skeleton, indices[1], result.midRotation, worldRots[indices[1]], worldRots[indices[0]]);

      converged = true;
    } else {
      // CCD：传入链节点的世界位置
      const bonePositions = indices.map(idx => worldPos[idx]);
      const result = solveCCD({
        bonePositions,
        targetPos: this._target,
        iterations: this._iterations,
        tolerance: this._tolerance,
      });

      // result.rotations[i] 对应 indices[i]（不含最后一个节点）
      for (let i = 0; i < result.rotations.length; i++) {
        const boneIdx = indices[i];
        const parentIdx = skeleton.bones[boneIdx].parentIndex;
        const parentWorldRot = parentIdx >= 0 ? worldRots[parentIdx] : quat(0, 0, 0, 1);
        this._applyWorldDelta(skeleton, boneIdx, result.rotations[i], worldRots[boneIdx], parentWorldRot);
      }

      converged = result.converged;
    }

    skeleton.update();
    return converged;
  }

  /**
   * 将世界空间 delta 旋转转换为 local 旋转并写回 skeleton，支持 weight slerp。
   * newWorldRot = delta * worldRot
   * newLocalRot = inv(parentWorldRot) * newWorldRot
   */
  private _applyWorldDelta(
    skeleton: Skeleton,
    boneIdx: number,
    delta: Quat,
    worldRot: Quat,
    parentWorldRot: Quat,
  ): void {
    if (this._weight === 0) return;

    const newWorldRot = normalizeQuat(multiplyQuat(delta, worldRot));
    const newLocalRot = normalizeQuat(multiplyQuat(conjugate(parentWorldRot), newWorldRot));

    const off = boneIdx * 4;
    if (this._weight >= 1) {
      skeleton.localRotations[off]     = newLocalRot[0];
      skeleton.localRotations[off + 1] = newLocalRot[1];
      skeleton.localRotations[off + 2] = newLocalRot[2];
      skeleton.localRotations[off + 3] = newLocalRot[3];
    } else {
      const oldLocalRot = quat(
        skeleton.localRotations[off],
        skeleton.localRotations[off + 1],
        skeleton.localRotations[off + 2],
        skeleton.localRotations[off + 3],
      );
      const blended = slerp(oldLocalRot, newLocalRot, this._weight);
      skeleton.localRotations[off]     = blended[0];
      skeleton.localRotations[off + 1] = blended[1];
      skeleton.localRotations[off + 2] = blended[2];
      skeleton.localRotations[off + 3] = blended[3];
    }
  }
}
