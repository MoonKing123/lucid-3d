/**
 * TwoBoneIKSolver — 解析两骨 IK 求解器（人形手臂/腿）。
 * @see test/unit/animation/two-bone-ik.test.ts
 */

import {
  type Vec3,
  vec3,
  sub,
  add,
  scale,
  dot,
  cross,
  length,
  normalize,
} from '../math/vec3';
import {
  type Quat,
  quat,
  fromAxisAngle,
  normalizeQuat,
} from '../math/quat';

export interface TwoBoneIKResult {
  rootRotation: Quat;
  midRotation: Quat;
}

export interface TwoBoneIKInput {
  rootPos: Vec3;
  midPos: Vec3;
  endPos: Vec3;
  targetPos: Vec3;
  poleVector?: Vec3;
}

function rotateVecByQuat(q: Quat, v: Vec3): Vec3 {
  // v' = v + 2*qw*(q.xyz × v) + 2*(q.xyz × (q.xyz × v))
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

function findPerpendicularTo(v: Vec3): Vec3 {
  const ax = Math.abs(v[0]), ay = Math.abs(v[1]);
  if (ax <= ay && ax <= Math.abs(v[2])) {
    // cross(v, (1,0,0)) = (0, v[2], -v[1])
    return normalize(vec3(0, v[2], -v[1]));
  } else if (ay <= Math.abs(v[2])) {
    // cross(v, (0,1,0)) = (-v[2], 0, v[0])
    return normalize(vec3(-v[2], 0, v[0]));
  } else {
    // cross(v, (0,0,1)) = (v[1], -v[0], 0)
    return normalize(vec3(v[1], -v[0], 0));
  }
}

function rotationFromTo(from: Vec3, to: Vec3): Quat {
  const d = dot(from, to);
  if (d >= 1 - 1e-7) return quat(0, 0, 0, 1);
  if (d <= -1 + 1e-7) {
    return fromAxisAngle(findPerpendicularTo(from), Math.PI);
  }
  const axis = cross(from, to);
  const axisLen = length(axis);
  if (axisLen < 1e-7) return quat(0, 0, 0, 1);
  const angle = Math.acos(Math.max(-1, Math.min(1, d)));
  return fromAxisAngle(scale(axis, 1 / axisLen), angle);
}

export function solveTwoBoneIK(input: TwoBoneIKInput): TwoBoneIKResult {
  const { rootPos, midPos, endPos, targetPos, poleVector } = input;

  const boneA = sub(midPos, rootPos);
  const boneB = sub(endPos, midPos);

  const a = length(boneA);
  const b = length(boneB);

  if (a < 1e-6) throw new Error('Bone segment has zero length');
  if (b < 1e-6) throw new Error('Bone segment has zero length');

  const boneA_norm = scale(boneA, 1 / a);
  const boneB_norm = scale(boneB, 1 / b);

  const toTarget = sub(targetPos, rootPos);
  const c_raw = length(toTarget);
  const c = Math.max(Math.abs(a - b), Math.min(a + b, c_raw));

  // 新的 mid 内角 (余弦定理)
  const cosNew = Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b)));
  const midAngleNew = Math.acos(cosNew);

  // 当前 mid 内角
  const cosCur = Math.max(-1, Math.min(1, dot(vec3(-boneA_norm[0], -boneA_norm[1], -boneA_norm[2]), boneB_norm)));
  const midAngleCur = Math.acos(cosCur);

  // 铰链轴 (mid joint 弯曲平面的法向)
  let hingeAxis: Vec3;
  if (poleVector !== undefined) {
    const chainDir = c_raw > 1e-6 ? normalize(toTarget) : boneA_norm;
    const poleDot = dot(poleVector, chainDir);
    const poleProj = sub(poleVector, scale(chainDir, poleDot));
    hingeAxis = length(poleProj) > 1e-6
      ? normalize(cross(chainDir, poleProj))
      : findPerpendicularTo(chainDir);
  } else {
    const rawAxis = cross(boneA, boneB);
    if (length(rawAxis) > 1e-6) {
      hingeAxis = normalize(rawAxis);
    } else if (c_raw > 1e-6) {
      const alt = cross(boneA, toTarget);
      hingeAxis = length(alt) > 1e-6
        ? normalize(alt)
        : findPerpendicularTo(boneA_norm);
    } else {
      hingeAxis = findPerpendicularTo(boneA_norm);
    }
  }

  // mid rotation: 从当前角度弯曲到新角度
  const midRotation = normalizeQuat(fromAxisAngle(hingeAxis, midAngleNew - midAngleCur));

  // root rotation: 让 chain 端点对齐 target
  const boneBRotated = rotateVecByQuat(midRotation, boneB);
  const newEndRelToRoot = add(boneA, boneBRotated);
  const newEndLen = length(newEndRelToRoot);

  let rootRotation: Quat;
  if (newEndLen < 1e-6 || c_raw < 1e-6) {
    rootRotation = quat(0, 0, 0, 1);
  } else {
    rootRotation = normalizeQuat(
      rotationFromTo(scale(newEndRelToRoot, 1 / newEndLen), normalize(toTarget)),
    );
  }

  return { rootRotation, midRotation };
}
