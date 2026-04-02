/**
 * Geometry Primitives — stub implementation.
 * AI must implement the actual logic.
 */

export const __STUB__ = true;

import { Geometry } from './geometry';

export function createPlaneGeometry(
  width?: number,
  height?: number,
  widthSegments?: number,
  heightSegments?: number,
): Geometry {
  throw new Error('Not implemented');
}

export function createSphereGeometry(
  radius?: number,
  widthSegments?: number,
  heightSegments?: number,
): Geometry {
  throw new Error('Not implemented');
}

export function createCylinderGeometry(opts?: {
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  radialSegments?: number;
  heightSegments?: number;
}): Geometry {
  throw new Error('Not implemented');
}
