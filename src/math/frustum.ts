/**
 * Frustum — 视锥体裁剪
 * 从 viewProjection 矩阵提取 6 个裁剪平面，判断点/AABB 是否在视锥内。
 */

import { vec3, type Vec3 } from './vec3';
import type { Mat4 } from './mat4';

/** 3D 平面：法线 + 常量（ax + by + cz + d = 0 形式） */
export interface Plane {
  normal: Vec3;
  constant: number;
}

/** 创建平面，默认 normal=(0,0,1), constant=0 */
export function createPlane(normal?: Vec3, constant = 0): Plane {
  return {
    normal: normal ? normal : vec3(0, 0, 1),
    constant,
  };
}

/** 计算点到平面的有符号距离（正=法线侧，负=背面）
 *  distance = dot(normal, point) + constant
 */
export function distanceToPoint(plane: Plane, point: Vec3): number {
  return (
    plane.normal[0] * point[0] +
    plane.normal[1] * point[1] +
    plane.normal[2] * point[2] +
    plane.constant
  );
}

export class Frustum {
  planes: Plane[];

  constructor() {
    this.planes = [];
  }

  /**
   * 从 viewProjection 矩阵提取 6 个裁剪平面（Gribb/Hartmann 方法）。
   * Mat4 为列主序，row_i = [m[i], m[i+4], m[i+8], m[i+12]]
   * 平面法线指向视锥内部，提取后归一化。
   */
  setFromProjectionMatrix(m: Mat4): void {
    // 列主序读取各行：row_r 的第 c 列 = m[r + c*4]
    // row0 = [m[0], m[4], m[8],  m[12]]
    // row1 = [m[1], m[5], m[9],  m[13]]
    // row2 = [m[2], m[6], m[10], m[14]]
    // row3 = [m[3], m[7], m[11], m[15]]

    const extractPlane = (
      ax: number, ay: number, az: number, aw: number,
      bx: number, by: number, bz: number, bw: number,
    ): Plane => {
      const nx = ax + bx;
      const ny = ay + by;
      const nz = az + bz;
      const d  = aw + bw;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return {
        normal: vec3(nx / len, ny / len, nz / len),
        constant: d / len,
      };
    };

    // row3 分量
    const r3x = m[3], r3y = m[7], r3z = m[11], r3w = m[15];

    // Left:   row3 + row0
    this.planes[0] = extractPlane(r3x, r3y, r3z, r3w,  m[0], m[4], m[8],  m[12]);
    // Right:  row3 - row0
    this.planes[1] = extractPlane(r3x, r3y, r3z, r3w, -m[0], -m[4], -m[8],  -m[12]);
    // Bottom: row3 + row1
    this.planes[2] = extractPlane(r3x, r3y, r3z, r3w,  m[1], m[5], m[9],  m[13]);
    // Top:    row3 - row1
    this.planes[3] = extractPlane(r3x, r3y, r3z, r3w, -m[1], -m[5], -m[9],  -m[13]);
    // Near:   row3 + row2
    this.planes[4] = extractPlane(r3x, r3y, r3z, r3w,  m[2], m[6], m[10], m[14]);
    // Far:    row3 - row2
    this.planes[5] = extractPlane(r3x, r3y, r3z, r3w, -m[2], -m[6], -m[10], -m[14]);
  }

  /** 判断点是否在视锥内（所有 6 个平面的正侧） */
  containsPoint(point: Vec3): boolean {
    for (const plane of this.planes) {
      if (distanceToPoint(plane, point) < 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * 判断 AABB 是否与视锥相交。
   * 对每个平面测试 P-vertex（沿法线方向最远的顶点）。
   * 如果 P-vertex 在任一平面外侧，则不相交。
   */
  intersectsAABB(aabb: { min: Vec3; max: Vec3 }): boolean {
    for (const plane of this.planes) {
      // P-vertex：每个分量取 normal 同号的极值
      const px = plane.normal[0] >= 0 ? aabb.max[0] : aabb.min[0];
      const py = plane.normal[1] >= 0 ? aabb.max[1] : aabb.min[1];
      const pz = plane.normal[2] >= 0 ? aabb.max[2] : aabb.min[2];
      const d = plane.normal[0] * px + plane.normal[1] * py + plane.normal[2] * pz + plane.constant;
      if (d < 0) {
        return false;
      }
    }
    return true;
  }
}
