/**
 * NavGrid — 2D grid-based navigation map.
 *
 * Represents a walkability grid for A* pathfinding.
 * Each cell has a walkable flag and a traversal cost.
 * Supports world ↔ grid coordinate conversion.
 *
 * @see test/unit/navigation/nav-grid.test.ts
 */

/** A 2D grid for navigation — cells are either walkable or blocked. */
export class NavGrid {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;

  private _walkable: Uint8Array;
  private _cost: Float32Array;

  constructor(width: number, height: number, cellSize: number = 1) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    const size = width * height;
    this._walkable = new Uint8Array(size).fill(1);
    this._cost = new Float32Array(size).fill(1);
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return false;
    return this._walkable[y * this.width + x] === 1;
  }

  setWalkable(x: number, y: number, walkable: boolean): void {
    if (!this.isInBounds(x, y)) return;
    this._walkable[y * this.width + x] = walkable ? 1 : 0;
  }

  getCost(x: number, y: number): number {
    if (!this.isInBounds(x, y)) return 1;
    return this._cost[y * this.width + x];
  }

  setCost(x: number, y: number, cost: number): void {
    if (!this.isInBounds(x, y)) return;
    this._cost[y * this.width + x] = cost;
  }

  /** Convert world coordinates (X, Z) to grid coordinates. */
  worldToGrid(worldX: number, worldZ: number): [number, number] {
    return [
      Math.floor(worldX / this.cellSize),
      Math.floor(worldZ / this.cellSize),
    ];
  }

  /** Convert grid coordinates to world center coordinates (X, Z). */
  gridToWorld(gridX: number, gridY: number): [number, number] {
    return [
      (gridX + 0.5) * this.cellSize,
      (gridY + 0.5) * this.cellSize,
    ];
  }

  /** Set a rectangle of cells to walkable or blocked. */
  fillRect(x: number, y: number, w: number, h: number, walkable: boolean): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setWalkable(x + dx, y + dy, walkable);
      }
    }
  }

  /**
   * Get walkable neighbor cells.
   * @param diagonal - include diagonal neighbors (default: false)
   */
  getNeighbors(x: number, y: number, diagonal: boolean = false): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    const cardinals: Array<[number, number]> = [
      [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
    ];
    for (const [nx, ny] of cardinals) {
      if (this.isWalkable(nx, ny)) result.push([nx, ny]);
    }
    if (diagonal) {
      const diags: Array<[number, number]> = [
        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1],
      ];
      for (const [nx, ny] of diags) {
        if (this.isWalkable(nx, ny)) result.push([nx, ny]);
      }
    }
    return result;
  }

  /** Reset all cells to walkable with cost 1. */
  clear(): void {
    this._walkable.fill(1);
    this._cost.fill(1);
  }
}
