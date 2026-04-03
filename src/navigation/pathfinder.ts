/**
 * A* Pathfinder — grid-based shortest path search.
 *
 * Finds optimal paths on a NavGrid using the A* algorithm.
 * Supports 4-direction (cardinal) and 8-direction (diagonal) movement,
 * custom cell costs, and iteration limits.
 *
 * @see test/unit/navigation/pathfinder.test.ts
 */

export const __STUB__ = true;

import type { NavGrid } from './nav-grid';

export interface PathResult {
  /** Grid coordinates of the path, from start to end (inclusive). */
  path: Array<[number, number]>;
  /** Total traversal cost. */
  cost: number;
  /** Whether a valid path was found. */
  found: boolean;
}

export interface PathfinderOptions {
  /** Allow diagonal movement (default: true). */
  diagonal?: boolean;
  /** Maximum A* iterations before giving up (default: 10000). */
  maxIterations?: number;
  /** Heuristic function (default: octile for diagonal, manhattan otherwise). */
  heuristic?: 'manhattan' | 'euclidean' | 'octile';
}

/**
 * Find the shortest path between two grid cells using A*.
 */
export function findPath(
  _grid: NavGrid,
  _startX: number, _startY: number,
  _endX: number, _endY: number,
  _options?: PathfinderOptions,
): PathResult {
  return { path: [], cost: 0, found: false };
}
