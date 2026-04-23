/**
 * NavMesh — 基于多边形（三角形）的 3D 导航网格。
 *
 * 支持不规则三角形导航、自动邻接计算、A* 寻路。
 * 适用于坡道、楼梯、不规则地形等真实 3D 场景。
 *
 * @see test/unit/navigation/nav-mesh.test.ts
 */

import { vec3 } from '../math/vec3';
import type { Vec3 } from '../math/vec3';

// XZ 平面内的 point-in-triangle 测试（符号法）
function pointInTriangleXZ(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number,
  cx: number, cz: number,
): boolean {
  const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz);
  const d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz);
  const d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// 规范化边 key（小索引在前）
function edgeKey(a: number, b: number): number {
  return a < b ? a * 100000 + b : b * 100000 + a;
}

function dist3(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 最小堆（用于 A*）
interface HeapNode { f: number; id: number; }

class MinHeap {
  private _data: HeapNode[] = [];
  get size(): number { return this._data.length; }

  push(node: HeapNode): void {
    this._data.push(node);
    this._siftUp(this._data.length - 1);
  }

  pop(): HeapNode | undefined {
    if (!this._data.length) return undefined;
    const top = this._data[0];
    const last = this._data.pop()!;
    if (this._data.length) { this._data[0] = last; this._siftDown(0); }
    return top;
  }

  private _siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._data[p].f <= this._data[i].f) break;
      const tmp = this._data[p]; this._data[p] = this._data[i]; this._data[i] = tmp;
      i = p;
    }
  }

  private _siftDown(i: number): void {
    const n = this._data.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[s].f) s = l;
      if (r < n && this._data[r].f < this._data[s].f) s = r;
      if (s === i) break;
      const tmp = this._data[s]; this._data[s] = this._data[i]; this._data[i] = tmp;
      i = s;
    }
  }
}

export class NavMesh {
  private _vertices: Vec3[];
  private _triangles: Array<[number, number, number]>;
  private _centers: Vec3[];
  private _adj: number[][];

  constructor(vertices: Vec3[], triangles: Array<[number, number, number]>) {
    this._vertices = vertices;
    this._triangles = triangles;
    this._centers = triangles.map(([a, b, c]) => {
      const va = vertices[a], vb = vertices[b], vc = vertices[c];
      return vec3(
        (va[0] + vb[0] + vc[0]) / 3,
        (va[1] + vb[1] + vc[1]) / 3,
        (va[2] + vb[2] + vc[2]) / 3,
      );
    });
    this._adj = this._buildAdjacency();
  }

  private _buildAdjacency(): number[][] {
    const adj: number[][] = this._triangles.map(() => []);
    // edge key -> polygon 索引列表
    const edgeMap = new Map<number, number[]>();

    for (let i = 0; i < this._triangles.length; i++) {
      const [a, b, c] = this._triangles[i];
      for (const key of [edgeKey(a, b), edgeKey(b, c), edgeKey(a, c)]) {
        let list = edgeMap.get(key);
        if (!list) { list = []; edgeMap.set(key, list); }
        list.push(i);
      }
    }

    for (const polys of edgeMap.values()) {
      if (polys.length === 2) {
        const [p, q] = polys;
        adj[p].push(q);
        adj[q].push(p);
      }
    }

    return adj;
  }

  get polygonCount(): number {
    return this._triangles.length;
  }

  // 在 XZ 平面投影，测试点落在哪个三角形内
  getPolygon(point: Vec3): number | null {
    const px = point[0], pz = point[2];
    for (let i = 0; i < this._triangles.length; i++) {
      const [a, b, c] = this._triangles[i];
      const va = this._vertices[a], vb = this._vertices[b], vc = this._vertices[c];
      if (pointInTriangleXZ(px, pz, va[0], va[2], vb[0], vb[2], vc[0], vc[2])) {
        return i;
      }
    }
    return null;
  }

  adjacency(polyIndex: number): number[] {
    return this._adj[polyIndex] ?? [];
  }

  findPath(start: Vec3, end: Vec3): Vec3[] | null {
    const startPoly = this.getPolygon(start);
    const endPoly = this.getPolygon(end);
    if (startPoly === null || endPoly === null) return null;

    if (startPoly === endPoly) {
      return [start, end];
    }

    const n = this._triangles.length;
    const gScore = new Float32Array(n).fill(Infinity);
    const cameFrom = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);

    gScore[startPoly] = 0;
    const heap = new MinHeap();
    heap.push({ f: dist3(this._centers[startPoly], this._centers[endPoly]), id: startPoly });

    while (heap.size > 0) {
      const cur = heap.pop()!;
      const cid = cur.id;
      if (closed[cid]) continue;
      closed[cid] = 1;

      if (cid === endPoly) {
        // 重建多边形索引路径
        const polyPath: number[] = [];
        let id = endPoly;
        while (id !== startPoly) {
          polyPath.push(id);
          id = cameFrom[id];
          if (id === -1) return null; // 理论上不会发生
        }
        polyPath.push(startPoly);
        polyPath.reverse();

        // 构建 Vec3 路径：[start, 中间 polygon 中心, end]
        const result: Vec3[] = [start];
        for (let i = 1; i < polyPath.length - 1; i++) {
          result.push(this._centers[polyPath[i]]);
        }
        result.push(end);
        return result;
      }

      for (const neighbor of this._adj[cid]) {
        if (closed[neighbor]) continue;
        const tentG = gScore[cid] + dist3(this._centers[cid], this._centers[neighbor]);
        if (tentG < gScore[neighbor]) {
          gScore[neighbor] = tentG;
          cameFrom[neighbor] = cid;
          heap.push({
            f: tentG + dist3(this._centers[neighbor], this._centers[endPoly]),
            id: neighbor,
          });
        }
      }
    }

    return null; // 不可达
  }
}
