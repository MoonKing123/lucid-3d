/**
 * Ray and Raycaster — stub implementation.
 * AI must implement the actual logic.
 */

export const __STUB__ = true;

import { type Vec3 } from '../math/vec3';
import { type AABB } from '../math/aabb';
import { type Node3D } from './node3d';
import { type PerspectiveCamera } from './camera';

export interface RaycastHit {
  object: Node3D;
  distance: number;
  point: Vec3;
}

export class Ray {
  origin: Vec3;
  direction: Vec3;

  constructor(origin?: Vec3, direction?: Vec3) {
    throw new Error('Not implemented');
  }

  at(t: number): Vec3 {
    throw new Error('Not implemented');
  }

  intersectAABB(aabb: AABB): number | null {
    throw new Error('Not implemented');
  }

  intersectTriangle(v0: Vec3, v1: Vec3, v2: Vec3): number | null {
    throw new Error('Not implemented');
  }
}

export class Raycaster {
  ray: Ray;
  near: number;
  far: number;

  constructor(origin?: Vec3, direction?: Vec3) {
    throw new Error('Not implemented');
  }

  setFromCamera(ndc: { x: number; y: number }, camera: PerspectiveCamera): void {
    throw new Error('Not implemented');
  }

  intersectObject(object: Node3D, recursive?: boolean): RaycastHit[] {
    throw new Error('Not implemented');
  }

  intersectObjects(objects: Node3D[], recursive?: boolean): RaycastHit[] {
    throw new Error('Not implemented');
  }
}
