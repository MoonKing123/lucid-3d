/**
 * Quat — 纯函数四元数数学库。
 * 布局：[x, y, z, w]，Hamilton 约定，与 glTF 一致。
 * Quat 是长度为 4 的 Float32Array。
 * 所有函数均为纯函数（不修改输入）。
 */

import { normalize as normalizeVec3, type Vec3 } from './vec3';
import { mat4, type Mat4 } from './mat4';

export type Quat = Float32Array;

/** 创建四元数，默认为单位四元数 (0,0,0,1) */
export function quat(x = 0, y = 0, z = 0, w = 1): Quat {
  const q = new Float32Array(4);
  q[0] = x;
  q[1] = y;
  q[2] = z;
  q[3] = w;
  return q;
}

/** 从轴角创建四元数（内部归一化轴） */
export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const n = normalizeVec3(axis);
  const half = angle / 2;
  const s = Math.sin(half);
  return quat(n[0] * s, n[1] * s, n[2] * s, Math.cos(half));
}

/** 从欧拉角（弧度）创建四元数，YXZ 顺序 */
export function fromEuler(x: number, y: number, z: number): Quat {
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);

  // 合并顺序：qY * qX * qZ
  return quat(
    cy * sx * cz + sy * cx * sz,
    -cy * sx * sz + sy * cx * cz,
    cy * cx * sz - sy * sx * cz,
    cy * cx * cz + sy * sx * sz,
  );
}

/** Hamilton 乘积：a * b */
export function multiplyQuat(a: Quat, b: Quat): Quat {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  return quat(
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  );
}

/** 共轭：(-x, -y, -z, w)，对单位四元数等价于逆 */
export function conjugate(q: Quat): Quat {
  return quat(-q[0], -q[1], -q[2], q[3]);
}

/** 归一化到单位长度 */
export function normalizeQuat(q: Quat): Quat {
  const len = quatLength(q);
  if (len === 0) return quat(0, 0, 0, 1);
  const inv = 1 / len;
  return quat(q[0] * inv, q[1] * inv, q[2] * inv, q[3] * inv);
}

/** 球面线性插值 */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = quatDot(a, b);

  // 取最短路径
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  if (dot < 0) {
    dot = -dot;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  if (dot > 0.9995) {
    // 退化为线性插值
    const out = new Float32Array(4);
    out[0] = a[0] + t * (bx - a[0]);
    out[1] = a[1] + t * (by - a[1]);
    out[2] = a[2] + t * (bz - a[2]);
    out[3] = a[3] + t * (bw - a[3]);
    return normalizeQuat(out);
  }

  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const s1 = Math.sin((1 - t) * theta) / sinTheta;
  const s2 = Math.sin(t * theta) / sinTheta;

  return quat(
    s1 * a[0] + s2 * bx,
    s1 * a[1] + s2 * by,
    s1 * a[2] + s2 * bz,
    s1 * a[3] + s2 * bw,
  );
}

/** 转换为 4x4 旋转矩阵（列主序） */
export function quatToMat4(q: Quat): Mat4 {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  const m = mat4();
  // 列 0
  m[0]  = 1 - (yy + zz);
  m[1]  = xy + wz;
  m[2]  = xz - wy;
  m[3]  = 0;
  // 列 1
  m[4]  = xy - wz;
  m[5]  = 1 - (xx + zz);
  m[6]  = yz + wx;
  m[7]  = 0;
  // 列 2
  m[8]  = xz + wy;
  m[9]  = yz - wx;
  m[10] = 1 - (xx + yy);
  m[11] = 0;
  // 列 3（无平移）
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;
  return m;
}

/** quatToMat4 的别名（方便导入） */
export const toMat4 = quatToMat4;

/** 欧几里得长度 */
export function quatLength(q: Quat): number {
  return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

/** 点积 */
export function quatDot(a: Quat, b: Quat): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
