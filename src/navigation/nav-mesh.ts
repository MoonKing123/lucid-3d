/**
 * NavMesh — Polygon-based navigation mesh for 3D pathfinding.
 *
 * Unlike NavGrid (2D grid cells), NavMesh uses arbitrary 3D polygons
 * with automatic adjacency, supporting slopes, multi-level buildings,
 * and irregular terrain.
 *
 * API:
 *   - constructor(vertices: Vec3[], triangles: [a,b,c][])
 *   - getPolygon(point: Vec3): number | null — snap world point to nearest polygon index
 *   - findPath(start: Vec3, end: Vec3): Vec3[] | null — A* over polygons, returns polygon centers
 *   - adjacency(polyIndex: number): number[] — neighbor polygon indices sharing an edge
 *   - get polygonCount(): number
 *
 * @see test/unit/navigation/nav-mesh.test.ts
 */

export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';

export class NavMesh {
  constructor(_vertices: Vec3[], _triangles: Array<[number, number, number]>) {
    throw new Error('NavMesh: Not implemented (stub)');
  }

  get polygonCount(): number {
    throw new Error('NavMesh.polygonCount: Not implemented (stub)');
  }

  getPolygon(_point: Vec3): number | null {
    throw new Error('NavMesh.getPolygon: Not implemented (stub)');
  }

  adjacency(_polyIndex: number): number[] {
    throw new Error('NavMesh.adjacency: Not implemented (stub)');
  }

  findPath(_start: Vec3, _end: Vec3): Vec3[] | null {
    throw new Error('NavMesh.findPath: Not implemented (stub)');
  }
}
