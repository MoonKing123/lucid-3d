/**
 * NavGrid — 2D grid-based navigation map.
 *
 * Represents a walkability grid for A* pathfinding.
 * Each cell has a walkable flag and a traversal cost.
 * Supports world ↔ grid coordinate conversion.
 *
 * @see test/unit/navigation/nav-grid.test.ts
 */

export const __STUB__ = true;

/** A 2D grid for navigation — cells are either walkable or blocked. */
export class NavGrid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;

  constructor(width: number, height: number, cellSize: number = 1) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
  }

  isInBounds(_x: number, _y: number): boolean { return false; }
  isWalkable(_x: number, _y: number): boolean { return false; }
  setWalkable(_x: number, _y: number, _walkable: boolean): void {}
  getCost(_x: number, _y: number): number { return 1; }
  setCost(_x: number, _y: number, _cost: number): void {}

  /** Convert world coordinates (X, Z) to grid coordinates. */
  worldToGrid(_worldX: number, _worldZ: number): [number, number] { return [0, 0]; }

  /** Convert grid coordinates to world center coordinates (X, Z). */
  gridToWorld(_gridX: number, _gridY: number): [number, number] { return [0, 0]; }

  /** Set a rectangle of cells to walkable or blocked. */
  fillRect(_x: number, _y: number, _w: number, _h: number, _walkable: boolean): void {}

  /**
   * Get walkable neighbor cells.
   * @param diagonal - include diagonal neighbors (default: false)
   */
  getNeighbors(_x: number, _y: number, _diagonal: boolean = false): Array<[number, number]> { return []; }

  /** Reset all cells to walkable with cost 1. */
  clear(): void {}
}
