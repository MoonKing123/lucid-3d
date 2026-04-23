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

import type { Vec3 } from '../math/vec3';

// XZ-plane signed area: (c-a)×(b-a) — positive means c is on the right of a→b
function triArea2D(a: Vec3, b: Vec3, c: Vec3): number {
  return (c[0] - a[0]) * (b[2] - a[2]) - (b[0] - a[0]) * (c[2] - a[2]);
}

function vEqual(a: Vec3, b: Vec3): boolean {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz < 1e-10;
}

export function funnelSmooth(
  start: Vec3,
  end: Vec3,
  portalsLeft: Vec3[],
  portalsRight: Vec3[],
): Vec3[] {
  if (portalsLeft.length !== portalsRight.length) {
    throw new Error('funnelSmooth: portalsLeft and portalsRight must have the same length');
  }

  if (portalsLeft.length === 0) {
    return [start, end];
  }

  const n = portalsLeft.length;
  // Extended portal arrays: degenerate start portal at index 0, end portal at index n+1
  const allLeft: Vec3[] = [start, ...portalsLeft, end];
  const allRight: Vec3[] = [start, ...portalsRight, end];

  const path: Vec3[] = [start];

  let apex = start;
  let apexIndex = 0;
  let left = allLeft[1];
  let right = allRight[1];
  let leftIndex = 1;
  let rightIndex = 1;

  for (let i = 2; i <= n + 1; i++) {
    const newLeft = allLeft[i];
    const newRight = allRight[i];

    // Try to tighten right side of funnel
    if (triArea2D(apex, right, newRight) <= 0) {
      if (vEqual(apex, right) || triArea2D(apex, left, newRight) > 0) {
        right = newRight;
        rightIndex = i;
      } else {
        // New right crosses left boundary — advance apex to left
        path.push(left);
        apex = left;
        apexIndex = leftIndex;
        left = apex;
        right = apex;
        leftIndex = apexIndex;
        rightIndex = apexIndex;
        i = apexIndex;
        continue;
      }
    }

    // Try to tighten left side of funnel
    if (triArea2D(apex, left, newLeft) >= 0) {
      if (vEqual(apex, left) || triArea2D(apex, right, newLeft) < 0) {
        left = newLeft;
        leftIndex = i;
      } else {
        // New left crosses right boundary — advance apex to right
        path.push(right);
        apex = right;
        apexIndex = rightIndex;
        left = apex;
        right = apex;
        leftIndex = apexIndex;
        rightIndex = apexIndex;
        i = apexIndex;
        continue;
      }
    }
  }

  if (!vEqual(path[path.length - 1], end)) {
    path.push(end);
  }

  return path;
}
