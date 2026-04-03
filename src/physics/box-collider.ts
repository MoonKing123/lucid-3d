/**
 * BoxCollider — AABB 盒碰撞体。
 *
 * 轴对齐包围盒，使用 center + halfExtents 定义。
 * 支持 box-box 和 box-sphere 交叉检测，以及重叠深度计算。
 *
 * @see test/unit/physics/box-collider.test.ts
 */

import { type Vec3, vec3 } from '../math/vec3';
import { AABB } from '../math/aabb';
import { type SphereCollider } from './collision';

export class BoxCollider {
  center: Vec3;
  halfExtents: Vec3;

  constructor(halfExtents?: Vec3, center?: Vec3) {
    this.halfExtents = halfExtents
      ? vec3(halfExtents[0], halfExtents[1], halfExtents[2])
      : vec3(0.5, 0.5, 0.5);
    this.center = center
      ? vec3(center[0], center[1], center[2])
      : vec3(0, 0, 0);
  }

  /** 3 轴 AABB 重叠检测，触碰（边界接触）也算相交。 */
  intersectsBox(other: BoxCollider): boolean {
    for (let i = 0; i < 3; i++) {
      const aMin = this.center[i] - this.halfExtents[i];
      const aMax = this.center[i] + this.halfExtents[i];
      const bMin = other.center[i] - other.halfExtents[i];
      const bMax = other.center[i] + other.halfExtents[i];
      if (aMax < bMin || bMax < aMin) return false;
    }
    return true;
  }

  /** 求 box 上离球心最近的点，比较距离与半径。 */
  intersectsSphere(sphere: SphereCollider): boolean {
    let sqDist = 0;
    for (let i = 0; i < 3; i++) {
      const min = this.center[i] - this.halfExtents[i];
      const max = this.center[i] + this.halfExtents[i];
      const v = sphere.center[i];
      if (v < min) sqDist += (min - v) * (min - v);
      else if (v > max) sqDist += (v - max) * (v - max);
    }
    return sqDist <= sphere.radius * sphere.radius;
  }

  /** SAT 最小穿透深度：正数=重叠，0=恰好接触，负数=分离。 */
  overlapBox(other: BoxCollider): number {
    let minOverlap = Infinity;
    for (let i = 0; i < 3; i++) {
      const aMin = this.center[i] - this.halfExtents[i];
      const aMax = this.center[i] + this.halfExtents[i];
      const bMin = other.center[i] - other.halfExtents[i];
      const bMax = other.center[i] + other.halfExtents[i];
      const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
      if (overlap < minOverlap) minOverlap = overlap;
    }
    return minOverlap;
  }

  /** 重叠深度 = radius - dist(closestPointOnBox, sphereCenter)。 */
  overlapSphere(sphere: SphereCollider): number {
    let sqDist = 0;
    for (let i = 0; i < 3; i++) {
      const min = this.center[i] - this.halfExtents[i];
      const max = this.center[i] + this.halfExtents[i];
      const v = sphere.center[i];
      if (v < min) sqDist += (min - v) * (min - v);
      else if (v > max) sqDist += (v - max) * (v - max);
    }
    return sphere.radius - Math.sqrt(sqDist);
  }

  /** 检查点是否在 box 内（边界算含）。 */
  containsPoint(point: Vec3): boolean {
    for (let i = 0; i < 3; i++) {
      const min = this.center[i] - this.halfExtents[i];
      const max = this.center[i] + this.halfExtents[i];
      if (point[i] < min || point[i] > max) return false;
    }
    return true;
  }

  /** 返回 AABB(center - halfExtents, center + halfExtents)。 */
  toAABB(): AABB {
    return new AABB(
      vec3(
        this.center[0] - this.halfExtents[0],
        this.center[1] - this.halfExtents[1],
        this.center[2] - this.halfExtents[2],
      ),
      vec3(
        this.center[0] + this.halfExtents[0],
        this.center[1] + this.halfExtents[1],
        this.center[2] + this.halfExtents[2],
      ),
    );
  }

  clone(): BoxCollider {
    return new BoxCollider(
      vec3(this.halfExtents[0], this.halfExtents[1], this.halfExtents[2]),
      vec3(this.center[0], this.center[1], this.center[2]),
    );
  }
}
