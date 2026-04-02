/**
 * Ray 和 Raycaster — 射线检测与场景对象拾取。
 */

import { type Vec3, vec3, sub, cross, dot, normalize } from '../math/vec3';
import { AABB } from '../math/aabb';
import { Node3D } from './node3d';
import { Mesh } from '../renderer/mesh';
import { PerspectiveCamera } from './camera';
import { invert, type Mat4 } from '../math/mat4';

export interface RaycastHit {
  object: Node3D;
  distance: number;
  point: Vec3;
}

/** 将点通过列优先 4×4 矩阵变换（包含透视除法）。 */
function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = m[0] * p[0] + m[4] * p[1] + m[8]  * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9]  * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return vec3(x / w, y / w, z / w);
}

export class Ray {
  origin: Vec3;
  direction: Vec3;

  constructor(origin?: Vec3, direction?: Vec3) {
    this.origin    = origin    ? vec3(origin[0],    origin[1],    origin[2])    : vec3(0, 0, 0);
    this.direction = direction ? vec3(direction[0], direction[1], direction[2]) : vec3(0, 0, -1);
  }

  /** 射线上参数 t 处的点：origin + t * direction */
  at(t: number): Vec3 {
    return vec3(
      this.origin[0] + t * this.direction[0],
      this.origin[1] + t * this.direction[1],
      this.origin[2] + t * this.direction[2],
    );
  }

  /** Slab 法 AABB 求交。返回 t 或 null。 */
  intersectAABB(aabb: AABB): number | null {
    let tMin = -Infinity;
    let tMax =  Infinity;

    for (let i = 0; i < 3; i++) {
      const d  = this.direction[i];
      const o  = this.origin[i];
      const lo = aabb.min[i];
      const hi = aabb.max[i];

      if (Math.abs(d) < 1e-10) {
        // 射线平行于当前轴的 slab
        if (o < lo || o > hi) return null;
      } else {
        const invD = 1 / d;
        let t1 = (lo - o) * invD;
        let t2 = (hi - o) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
      }
    }

    if (tMax < tMin) return null;
    const t = Math.max(tMin, 0);
    if (tMax < t) return null;
    return t;
  }

  /** Möller-Trumbore 三角形求交。返回 t 或 null。 */
  intersectTriangle(v0: Vec3, v1: Vec3, v2: Vec3): number | null {
    const EPSILON = 1e-8;
    const edge1 = sub(v1, v0);
    const edge2 = sub(v2, v0);
    const h = cross(this.direction, edge2);
    const a = dot(edge1, h);

    if (Math.abs(a) < EPSILON) return null; // 射线与三角形平行

    const f = 1 / a;
    const s = sub(this.origin, v0);
    const u = f * dot(s, h);
    if (u < 0 || u > 1) return null;

    const q = cross(s, edge1);
    const v = f * dot(this.direction, q);
    if (v < 0 || u + v > 1) return null;

    const t = f * dot(edge2, q);
    if (t < EPSILON) return null; // 交点在射线起点后方

    return t;
  }
}

export class Raycaster {
  ray: Ray;
  near: number;
  far: number;

  constructor(origin?: Vec3, direction?: Vec3) {
    this.ray  = new Ray(origin, direction);
    this.near = 0;
    this.far  = Infinity;
  }

  /** 从相机 NDC 坐标 [-1,+1] 设置射线，通过逆 VP 矩阵反投影。 */
  setFromCamera(ndc: { x: number; y: number }, camera: PerspectiveCamera): void {
    const vp    = camera.viewProjectionMatrix;
    const invVP = invert(vp);
    if (!invVP) return;

    // 将 NDC 近平面点 (x, y, -1, 1) 反投影到世界空间
    const nx = ndc.x, ny = ndc.y, nz = -1;
    const cx = invVP[0] * nx + invVP[4] * ny + invVP[8]  * nz + invVP[12];
    const cy = invVP[1] * nx + invVP[5] * ny + invVP[9]  * nz + invVP[13];
    const cz = invVP[2] * nx + invVP[6] * ny + invVP[10] * nz + invVP[14];
    const cw = invVP[3] * nx + invVP[7] * ny + invVP[11] * nz + invVP[15];
    const nearWorld = vec3(cx / cw, cy / cw, cz / cw);

    this.ray.origin    = vec3(camera.position[0], camera.position[1], camera.position[2]);
    this.ray.direction = normalize(sub(nearWorld, this.ray.origin));
  }

  /** 检测单个对象（可选递归）。AABB 预过滤 + 逐三角形检测。 */
  intersectObject(object: Node3D, recursive = false): RaycastHit[] {
    const hits: RaycastHit[] = [];
    this._intersectNode(object, recursive, hits);
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  /** 检测多个对象，返回按距离排序的命中列表。 */
  intersectObjects(objects: Node3D[], recursive = false): RaycastHit[] {
    const hits: RaycastHit[] = [];
    for (const obj of objects) {
      this._intersectNode(obj, recursive, hits);
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  private _intersectNode(node: Node3D, recursive: boolean, hits: RaycastHit[]): void {
    if (node instanceof Mesh) {
      this._intersectMesh(node, hits);
    }
    if (recursive) {
      for (const child of node.children) {
        this._intersectNode(child, true, hits);
      }
    }
  }

  private _intersectMesh(mesh: Mesh, hits: RaycastHit[]): void {
    const worldMatrix = mesh.worldMatrix;
    const geo         = mesh.geometry;
    const positions   = geo.positions;
    const indices     = geo.indices;

    // 计算世界空间 AABB（变换 8 个角点）
    const localAABB = AABB.fromGeometry(geo);
    const worldAABB = new AABB();
    const mn = localAABB.min, mx = localAABB.max;
    const corners: [number, number, number][] = [
      [mn[0], mn[1], mn[2]], [mx[0], mn[1], mn[2]],
      [mn[0], mx[1], mn[2]], [mx[0], mx[1], mn[2]],
      [mn[0], mn[1], mx[2]], [mx[0], mn[1], mx[2]],
      [mn[0], mx[1], mx[2]], [mx[0], mx[1], mx[2]],
    ];
    for (const [cx, cy, cz] of corners) {
      worldAABB.expandByPoint(transformPoint(worldMatrix, vec3(cx, cy, cz)));
    }

    // AABB 预过滤
    if (this.ray.intersectAABB(worldAABB) === null) return;

    // 逐三角形检测（世界空间）
    const testTri = (i0: number, i1: number, i2: number): void => {
      const wv0 = transformPoint(worldMatrix, vec3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]));
      const wv1 = transformPoint(worldMatrix, vec3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]));
      const wv2 = transformPoint(worldMatrix, vec3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]));
      const t = this.ray.intersectTriangle(wv0, wv1, wv2);
      if (t !== null && t >= this.near && t <= this.far) {
        hits.push({ object: mesh, distance: t, point: this.ray.at(t) });
      }
    };

    if (indices) {
      for (let i = 0; i < indices.length; i += 3) {
        testTri(indices[i], indices[i + 1], indices[i + 2]);
      }
    } else {
      const vertCount = positions.length / 3;
      for (let i = 0; i < vertCount; i += 3) {
        testTri(i, i + 1, i + 2);
      }
    }
  }
}
