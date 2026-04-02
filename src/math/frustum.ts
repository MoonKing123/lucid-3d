/**
 * STUB — Frustum (not yet implemented).
 * View frustum defined by 6 clip planes, extracted from a viewProjection matrix.
 * @see test/unit/math/frustum.test.ts
 */
export const __STUB__ = true;

import type { Vec3 } from './vec3';
import type { Mat4 } from './mat4';

export interface Plane {
  normal: Vec3;
  constant: number;
}

export function createPlane(_normal?: Vec3, _constant?: number): Plane {
  throw new Error('Not implemented');
}

export function distanceToPoint(_plane: Plane, _point: Vec3): number {
  throw new Error('Not implemented');
}

export class Frustum {
  planes: Plane[];

  constructor() {
    this.planes = [];
  }

  setFromProjectionMatrix(_m: Mat4): void {
    throw new Error('Not implemented');
  }

  containsPoint(_point: Vec3): boolean {
    throw new Error('Not implemented');
  }

  intersectsAABB(_aabb: { min: Vec3; max: Vec3 }): boolean {
    throw new Error('Not implemented');
  }
}
