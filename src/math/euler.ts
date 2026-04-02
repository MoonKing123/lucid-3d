/**
 * Euler 角旋转 — 支持 6 种旋转顺序。
 * 角度单位：弧度。
 * 使用列主序 Mat4（row + col*4 索引）与 [x, y, z, w] Quat。
 */

import { quat as createQuat, multiplyQuat, quatToMat4, type Quat } from './quat';
import { type Mat4 } from './mat4';

export type RotationOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'XZY' | 'YZX' | 'ZYX';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class Euler {
  x: number;
  y: number;
  z: number;
  order: RotationOrder;

  constructor(x = 0, y = 0, z = 0, order: RotationOrder = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }

  set(x: number, y: number, z: number, order?: RotationOrder): this {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order !== undefined) this.order = order;
    return this;
  }

  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  copy(other: Euler): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    this.order = other.order;
    return this;
  }

  equals(other: Euler): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z && this.order === other.order;
  }

  /**
   * 将欧拉角转换为四元数。
   * 对每种顺序分别组合三个轴的半角四元数，按旋转顺序左乘合并。
   */
  toQuaternion(): Quat {
    const cx = Math.cos(this.x / 2), sx = Math.sin(this.x / 2);
    const cy = Math.cos(this.y / 2), sy = Math.sin(this.y / 2);
    const cz = Math.cos(this.z / 2), sz = Math.sin(this.z / 2);

    const qx = createQuat(sx, 0, 0, cx);
    const qy = createQuat(0, sy, 0, cy);
    const qz = createQuat(0, 0, sz, cz);
    const mul = multiplyQuat;

    switch (this.order) {
      case 'XYZ': return mul(mul(qx, qy), qz);
      case 'YXZ': return mul(mul(qy, qx), qz);
      case 'ZXY': return mul(mul(qz, qx), qy);
      case 'XZY': return mul(mul(qx, qz), qy);
      case 'YZX': return mul(mul(qy, qz), qx);
      case 'ZYX': return mul(mul(qz, qy), qx);
    }
  }

  /**
   * 先将四元数转旋转矩阵，再调用 setFromRotationMatrix 提取欧拉角。
   */
  setFromQuaternion(q: Quat, order?: RotationOrder): this {
    return this.setFromRotationMatrix(quatToMat4(q), order);
  }

  /**
   * 从旋转矩阵（列主序）提取欧拉角，处理万向节锁。
   * m[row + col*4]；上3×3旋转部分：
   *   m[0] m[4] m[8]
   *   m[1] m[5] m[9]
   *   m[2] m[6] m[10]
   */
  setFromRotationMatrix(m: Mat4, order?: RotationOrder): this {
    const ord = order ?? this.order;

    let x: number, y: number, z: number;

    switch (ord) {
      case 'XYZ': {
        // R = Rx*Ry*Rz: m[8] = sin(y)
        y = Math.asin(clamp(m[8], -1, 1));
        if (Math.abs(m[8]) < 0.9999999) {
          x = Math.atan2(-m[9], m[10]);
          z = Math.atan2(-m[4], m[0]);
        } else {
          x = Math.atan2(m[6], m[5]);
          z = 0;
        }
        break;
      }
      case 'YXZ': {
        // R = Ry*Rx*Rz: m[9] = -sin(x)
        x = Math.asin(-clamp(m[9], -1, 1));
        if (Math.abs(m[9]) < 0.9999999) {
          y = Math.atan2(m[8], m[10]);
          z = Math.atan2(m[1], m[5]);
        } else {
          y = Math.atan2(-m[2], m[0]);
          z = 0;
        }
        break;
      }
      case 'ZXY': {
        // R = Rz*Rx*Ry: m[6] = sin(x)
        x = Math.asin(clamp(m[6], -1, 1));
        if (Math.abs(m[6]) < 0.9999999) {
          y = Math.atan2(-m[2], m[10]);
          z = Math.atan2(-m[4], m[5]);
        } else {
          y = 0;
          z = Math.atan2(m[1], m[0]);
        }
        break;
      }
      case 'XZY': {
        // R = Rx*Rz*Ry: m[4] = -sin(z)
        z = Math.asin(-clamp(m[4], -1, 1));
        if (Math.abs(m[4]) < 0.9999999) {
          x = Math.atan2(m[6], m[5]);
          y = Math.atan2(m[8], m[0]);
        } else {
          x = Math.atan2(-m[9], m[10]);
          y = 0;
        }
        break;
      }
      case 'YZX': {
        // R = Ry*Rz*Rx: m[1] = sin(z)
        z = Math.asin(clamp(m[1], -1, 1));
        if (Math.abs(m[1]) < 0.9999999) {
          x = Math.atan2(-m[9], m[5]);
          y = Math.atan2(-m[2], m[0]);
        } else {
          x = 0;
          y = Math.atan2(m[8], m[10]);
        }
        break;
      }
      case 'ZYX': {
        // R = Rz*Ry*Rx: m[2] = -sin(y)
        y = Math.asin(-clamp(m[2], -1, 1));
        if (Math.abs(m[2]) < 0.9999999) {
          x = Math.atan2(m[6], m[10]);
          z = Math.atan2(m[1], m[0]);
        } else {
          x = Math.atan2(-m[9], m[5]);
          z = 0;
        }
        break;
      }
    }

    this.x = x!;
    this.y = y!;
    this.z = z!;
    this.order = ord;
    return this;
  }
}
