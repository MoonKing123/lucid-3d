/**
 * AABB (Axis-Aligned Bounding Box) — stub implementation.
 * AI must implement the actual logic.
 */

export const __STUB__ = true;

import { type Vec3 } from './vec3';
import { type Geometry } from '../renderer/geometry';

export class AABB {
  min: Vec3 = null as any;
  max: Vec3 = null as any;

  constructor(min?: Vec3, max?: Vec3) {
    // stub: no-op constructor to allow describe.skip collection phase
  }

  static fromGeometry(geometry: Geometry): AABB {
    throw new Error('Not implemented');
  }

  center(): Vec3 {
    throw new Error('Not implemented');
  }

  size(): Vec3 {
    throw new Error('Not implemented');
  }

  containsPoint(point: Vec3): boolean {
    throw new Error('Not implemented');
  }

  intersectsAABB(other: AABB): boolean {
    throw new Error('Not implemented');
  }

  expandByPoint(point: Vec3): void {
    throw new Error('Not implemented');
  }

  union(other: AABB): AABB {
    throw new Error('Not implemented');
  }

  clone(): AABB {
    throw new Error('Not implemented');
  }
}
