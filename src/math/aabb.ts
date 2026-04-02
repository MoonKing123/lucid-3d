import { type Vec3, vec3 } from './vec3';
import { type Geometry } from '../renderer/geometry';

export class AABB {
  min: Vec3;
  max: Vec3;

  constructor(min?: Vec3, max?: Vec3) {
    this.min = min ? vec3(min[0], min[1], min[2]) : vec3(Infinity, Infinity, Infinity);
    this.max = max ? vec3(max[0], max[1], max[2]) : vec3(-Infinity, -Infinity, -Infinity);
  }

  static fromGeometry(geometry: Geometry): AABB {
    const box = new AABB();
    const pos = geometry.positions;
    for (let i = 0; i < pos.length; i += 3) {
      box.expandByPoint(vec3(pos[i], pos[i + 1], pos[i + 2]));
    }
    return box;
  }

  center(): Vec3 {
    return vec3(
      (this.min[0] + this.max[0]) / 2,
      (this.min[1] + this.max[1]) / 2,
      (this.min[2] + this.max[2]) / 2,
    );
  }

  size(): Vec3 {
    return vec3(
      this.max[0] - this.min[0],
      this.max[1] - this.min[1],
      this.max[2] - this.min[2],
    );
  }

  containsPoint(point: Vec3): boolean {
    return (
      point[0] >= this.min[0] && point[0] <= this.max[0] &&
      point[1] >= this.min[1] && point[1] <= this.max[1] &&
      point[2] >= this.min[2] && point[2] <= this.max[2]
    );
  }

  intersectsAABB(other: AABB): boolean {
    return (
      this.min[0] <= other.max[0] && this.max[0] >= other.min[0] &&
      this.min[1] <= other.max[1] && this.max[1] >= other.min[1] &&
      this.min[2] <= other.max[2] && this.max[2] >= other.min[2]
    );
  }

  expandByPoint(point: Vec3): void {
    if (point[0] < this.min[0]) this.min[0] = point[0];
    if (point[1] < this.min[1]) this.min[1] = point[1];
    if (point[2] < this.min[2]) this.min[2] = point[2];
    if (point[0] > this.max[0]) this.max[0] = point[0];
    if (point[1] > this.max[1]) this.max[1] = point[1];
    if (point[2] > this.max[2]) this.max[2] = point[2];
  }

  union(other: AABB): AABB {
    return new AABB(
      vec3(
        Math.min(this.min[0], other.min[0]),
        Math.min(this.min[1], other.min[1]),
        Math.min(this.min[2], other.min[2]),
      ),
      vec3(
        Math.max(this.max[0], other.max[0]),
        Math.max(this.max[1], other.max[1]),
        Math.max(this.max[2], other.max[2]),
      ),
    );
  }

  clone(): AABB {
    return new AABB(
      vec3(this.min[0], this.min[1], this.min[2]),
      vec3(this.max[0], this.max[1], this.max[2]),
    );
  }
}
