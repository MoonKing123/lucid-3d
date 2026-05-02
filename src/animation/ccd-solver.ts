/**
 * CCDSolver — Cyclic Coordinate Descent 多骨链 IK 求解器。
 * @see test/unit/animation/ccd-solver.test.ts
 */

import { type Vec3, vec3, sub, cross, dot, normalize, distance } from '../math/vec3';
import { type Quat, quat, fromAxisAngle, multiplyQuat, normalizeQuat } from '../math/quat';

export interface CCDSolverInput {
  bonePositions: Vec3[];
  targetPos: Vec3;
  iterations?: number;
  tolerance?: number;
}

export interface CCDSolverResult {
  rotations: Quat[];
  converged: boolean;
  iterationsUsed: number;
}

/** 用四元数旋转向量 v（Rodrigues 公式，不修改输入）*/
function rotateVecByQuat(v: Vec3, q: Quat): Vec3 {
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

export function solveCCD(input: CCDSolverInput): CCDSolverResult {
  const { bonePositions, targetPos, iterations = 10, tolerance = 0.01 } = input;
  const n = bonePositions.length;

  if (n < 2) throw new Error('Chain needs >= 2 joints');

  const rotations: Quat[] = Array.from({ length: n - 1 }, () => quat());
  const currentPos: Vec3[] = bonePositions.map(p => vec3(p[0], p[1], p[2]));

  // 初始就已收敛
  if (distance(currentPos[n - 1], targetPos) < tolerance) {
    return { rotations, converged: true, iterationsUsed: 0 };
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = n - 2; i >= 0; i--) {
      const end = currentPos[n - 1];
      if (distance(end, targetPos) < tolerance) {
        return { rotations, converged: true, iterationsUsed: iter + 1 };
      }

      const bone = currentPos[i];
      const toEnd = normalize(sub(end, bone));
      const toTarget = normalize(sub(targetPos, bone));

      const axisRaw = cross(toEnd, toTarget);
      const axisLen = Math.sqrt(axisRaw[0] ** 2 + axisRaw[1] ** 2 + axisRaw[2] ** 2);
      if (axisLen < 1e-6) continue;

      const cosA = Math.max(-1, Math.min(1, dot(toEnd, toTarget)));
      const angle = Math.acos(cosA);
      if (Math.abs(angle) < 1e-8) continue;

      const deltaQ = fromAxisAngle(normalize(axisRaw), angle);
      rotations[i] = normalizeQuat(multiplyQuat(deltaQ, rotations[i]));

      // 将 bone[i] 之后的所有关节位置绕 bone[i] 旋转
      for (let j = i + 1; j < n; j++) {
        const v = sub(currentPos[j], bone);
        const vr = rotateVecByQuat(v, deltaQ);
        currentPos[j] = vec3(bone[0] + vr[0], bone[1] + vr[1], bone[2] + vr[2]);
      }
    }
  }

  return { rotations, converged: false, iterationsUsed: iterations };
}
