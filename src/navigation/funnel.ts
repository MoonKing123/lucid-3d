/**
 * Funnel — Simple Stupid Funnel Algorithm for path smoothing.
 *
 * Pure function that converts a sequence of portal edges (shared edges between
 * adjacent NavMesh polygons) into a string-pulled smooth path. The portal edges
 * are specified as two parallel arrays of left and right edge vertices.
 *
 * Reference: Mikko Mononen, "Simple Stupid Funnel Algorithm" (2010).
 *
 * API:
 *   funnelSmooth(start: Vec3, end: Vec3, portalsLeft: Vec3[], portalsRight: Vec3[]): Vec3[]
 *
 * The result always includes `start` as the first waypoint and `end` as the last.
 * The XZ plane is used for funnel tests (Y is preserved from portal vertices).
 *
 * @see test/unit/navigation/funnel.test.ts
 */

export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';

export function funnelSmooth(
  _start: Vec3,
  _end: Vec3,
  _portalsLeft: Vec3[],
  _portalsRight: Vec3[],
): Vec3[] {
  throw new Error('funnelSmooth: Not implemented (stub)');
}
