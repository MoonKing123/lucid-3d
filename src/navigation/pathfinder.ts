/**
 * A* Pathfinder — grid-based shortest path search.
 *
 * Finds optimal paths on a NavGrid using the A* algorithm.
 * Supports 4-direction (cardinal) and 8-direction (diagonal) movement,
 * custom cell costs, and iteration limits.
 *
 * @see test/unit/navigation/pathfinder.test.ts
 */

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

const SQRT2 = Math.SQRT2; // ≈ 1.4142

// --- 二叉最小堆 ---
interface HeapNode {
  f: number;
  id: number;
}

class MinHeap {
  private _data: HeapNode[] = [];

  get size(): number { return this._data.length; }

  push(node: HeapNode): void {
    this._data.push(node);
    this._siftUp(this._data.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this._data.length === 0) return undefined;
    const top = this._data[0];
    const last = this._data.pop()!;
    if (this._data.length > 0) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  private _siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].f <= this._data[i].f) break;
      const tmp = this._data[parent];
      this._data[parent] = this._data[i];
      this._data[i] = tmp;
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[smallest].f) smallest = l;
      if (r < n && this._data[r].f < this._data[smallest].f) smallest = r;
      if (smallest === i) break;
      const tmp = this._data[smallest];
      this._data[smallest] = this._data[i];
      this._data[i] = tmp;
      i = smallest;
    }
  }
}

// --- 启发函数 ---
function hManhattan(dx: number, dy: number): number {
  return dx + dy;
}

function hEuclidean(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

function hOctile(dx: number, dy: number): number {
  const mn = Math.min(dx, dy);
  const mx = Math.max(dx, dy);
  return mx + (SQRT2 - 1) * mn;
}

const FAIL: PathResult = { path: [], cost: 0, found: false };

/**
 * Find the shortest path between two grid cells using A*.
 */
export function findPath(
  grid: NavGrid,
  startX: number, startY: number,
  endX: number, endY: number,
  options?: PathfinderOptions,
): PathResult {
  const diagonal = options?.diagonal ?? false;
  const maxIterations = options?.maxIterations ?? 10000;

  // 选择启发函数
  let h: (dx: number, dy: number) => number;
  if (options?.heuristic === 'manhattan') h = hManhattan;
  else if (options?.heuristic === 'euclidean') h = hEuclidean;
  else if (options?.heuristic === 'octile') h = hOctile;
  else h = diagonal ? hOctile : hManhattan;

  // 安全边界检查
  if (!grid.isInBounds(startX, startY) || !grid.isInBounds(endX, endY)) return FAIL;
  if (!grid.isWalkable(startX, startY) || !grid.isWalkable(endX, endY)) return FAIL;

  // 起点 == 终点
  if (startX === endX && startY === endY) {
    return { path: [[startX, startY]], cost: 0, found: true };
  }

  const W = grid.width;
  const total = W * grid.height;
  const endId = endY * W + endX;
  const startId = startY * W + startX;

  const gScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  gScore[startId] = 0;

  const heap = new MinHeap();
  heap.push({
    f: h(Math.abs(endX - startX), Math.abs(endY - startY)),
    id: startId,
  });

  let iterations = 0;

  while (heap.size > 0) {
    const current = heap.pop()!;
    const cid = current.id;

    if (closed[cid]) continue; // 过期条目，跳过
    closed[cid] = 1;

    if (++iterations > maxIterations) return FAIL;

    if (cid === endId) {
      // 重建路径
      const path: Array<[number, number]> = [];
      let id = endId;
      while (id !== -1) {
        path.push([id % W, Math.floor(id / W)]);
        id = cameFrom[id];
      }
      path.reverse();
      return { path, cost: gScore[endId], found: true };
    }

    const cx = cid % W;
    const cy = Math.floor(cid / W);

    for (const [nx, ny] of grid.getNeighbors(cx, cy, diagonal)) {
      const nid = ny * W + nx;
      if (closed[nid]) continue;

      const isDiag = nx !== cx && ny !== cy;
      const c = grid.getCost(nx, ny);
      const moveCost = (isDiag ? SQRT2 : 1) * c * c;
      const tentG = gScore[cid] + moveCost;

      if (tentG < gScore[nid]) {
        gScore[nid] = tentG;
        cameFrom[nid] = cid;
        heap.push({
          f: tentG + h(Math.abs(endX - nx), Math.abs(endY - ny)),
          id: nid,
        });
      }
    }
  }

  return FAIL;
}
