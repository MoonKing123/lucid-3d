/**
 * CollisionWorld — 基于 SphereCollider 的碰撞检测系统。
 * 支持碰撞事件回调（enter/stay/exit）和空间查询。
 * @see test/unit/physics/collision.test.ts
 */
import { type Vec3, vec3, add, sub, scale, length, normalize } from '../math/vec3';
import { type AABB } from '../math/aabb';
import { type Node3D } from '../core/node3d';

/* ---------- 公共类型 ---------- */

export interface CollisionEvent {
  selfNode: Node3D;
  otherNode: Node3D;
  selfCollider: SphereCollider;
  otherCollider: SphereCollider;
  /** 最小分离向量（从 self 指向 other）。 */
  separation: Vec3;
}

export type CollisionCallback = (event: CollisionEvent) => void;

/* ---------- SphereCollider ---------- */

export class SphereCollider {
  center: Vec3;
  radius: number;

  constructor(radius = 1, center?: Vec3) {
    this.radius = radius;
    this.center = center ? vec3(center[0], center[1], center[2]) : vec3(0, 0, 0);
  }

  /**
   * 检测与另一个球体的相交（触碰也算相交 <=）。
   */
  intersectsSphere(other: SphereCollider): boolean {
    const dist = length(sub(this.center, other.center));
    return dist <= this.radius + other.radius;
  }

  /** 检测与 AABB 的相交（使用平方距离最近点法）。 */
  intersectsAABB(aabb: AABB): boolean {
    let sqDist = 0;
    for (let i = 0; i < 3; i++) {
      const v = this.center[i];
      const mn = aabb.min[i];
      const mx = aabb.max[i];
      if (v < mn) sqDist += (mn - v) * (mn - v);
      else if (v > mx) sqDist += (v - mx) * (v - mx);
    }
    return sqDist <= this.radius * this.radius;
  }

  /**
   * 返回重叠深度：正数=重叠，0=恰好接触，负数=分离。
   * overlapDepth = (r1 + r2) - dist
   */
  overlapSphere(other: SphereCollider): number {
    const dist = length(sub(this.center, other.center));
    return (this.radius + other.radius) - dist;
  }

  clone(): SphereCollider {
    return new SphereCollider(
      this.radius,
      vec3(this.center[0], this.center[1], this.center[2]),
    );
  }
}

/* ---------- CollisionWorld 内部 ID ---------- */

let _nextId = 0;

function ensureId(node: Node3D): number {
  if ((node as any).__collisionId === undefined) {
    (node as any).__collisionId = _nextId++;
  }
  return (node as any).__collisionId as number;
}

function pairKey(a: Node3D, b: Node3D): string {
  const idA = (a as any).__collisionId as number;
  const idB = (b as any).__collisionId as number;
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

/* ---------- CollisionWorld ---------- */

export class CollisionWorld {
  private _colliders: Map<Node3D, SphereCollider> = new Map();

  private _enterCbs: Map<Node3D, CollisionCallback[]> = new Map();
  private _stayCbs: Map<Node3D, CollisionCallback[]> = new Map();
  private _exitCbs: Map<Node3D, CollisionCallback[]> = new Map();

  /** 上一帧活跃的碰撞对 key 集合 */
  private _activePairs: Set<string> = new Set();

  addCollider(node: Node3D, collider: SphereCollider): void {
    ensureId(node);
    this._colliders.set(node, collider);
  }

  removeCollider(node: Node3D): void {
    this._colliders.delete(node);
    const id = (node as any).__collisionId as number | undefined;
    if (id !== undefined) {
      for (const key of this._activePairs) {
        const [a, b] = key.split('-');
        if (a === String(id) || b === String(id)) {
          this._activePairs.delete(key);
        }
      }
    }
  }

  getCollider(node: Node3D): SphereCollider | undefined {
    return this._colliders.get(node);
  }

  onCollisionEnter(node: Node3D, cb: CollisionCallback): void {
    if (!this._enterCbs.has(node)) this._enterCbs.set(node, []);
    this._enterCbs.get(node)!.push(cb);
  }

  onCollisionStay(node: Node3D, cb: CollisionCallback): void {
    if (!this._stayCbs.has(node)) this._stayCbs.set(node, []);
    this._stayCbs.get(node)!.push(cb);
  }

  onCollisionExit(node: Node3D, cb: CollisionCallback): void {
    if (!this._exitCbs.has(node)) this._exitCbs.set(node, []);
    this._exitCbs.get(node)!.push(cb);
  }

  /** O(n²) 遍历所有碰撞对，触发事件。 */
  step(): void {
    const nodes = Array.from(this._colliders.keys());
    const newPairs = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const colA = this._colliders.get(nodeA)!;
        const colB = this._colliders.get(nodeB)!;

        // world-space 位置 = 节点位置 + 碰撞体局部中心偏移
        const posA = add(nodeA.position, colA.center);
        const posB = add(nodeB.position, colB.center);

        const dist = length(sub(posB, posA));
        const overlap = (colA.radius + colB.radius) - dist;

        if (overlap >= 0) {
          const key = pairKey(nodeA, nodeB);
          newPairs.add(key);

          // 分离向量：从 A 指向 B，大小 = overlap depth
          const dir = sub(posB, posA);
          const separationAtoB = dist > 0
            ? scale(normalize(dir), overlap)
            : vec3(overlap, 0, 0); // 同心球退化情况

          if (this._activePairs.has(key)) {
            this._fireEvent(nodeA, nodeB, colA, colB, separationAtoB, 'stay');
          } else {
            this._fireEvent(nodeA, nodeB, colA, colB, separationAtoB, 'enter');
          }
        }
      }
    }

    // 触发 exit 事件：上一帧有、本帧没有
    for (const key of this._activePairs) {
      if (!newPairs.has(key)) {
        const [idAStr, idBStr] = key.split('-');
        const idA = Number(idAStr);
        const idB = Number(idBStr);
        const nodeA = nodes.find(n => (n as any).__collisionId === idA);
        const nodeB = nodes.find(n => (n as any).__collisionId === idB);
        if (nodeA && nodeB) {
          const colA = this._colliders.get(nodeA)!;
          const colB = this._colliders.get(nodeB)!;
          this._fireEvent(nodeA, nodeB, colA, colB, vec3(0, 0, 0), 'exit');
        }
      }
    }

    this._activePairs = newPairs;
  }

  /** 查询与给定球体重叠的所有节点。 */
  query(center: Vec3, radius: number): Node3D[] {
    const results: Node3D[] = [];
    for (const [node, col] of this._colliders) {
      const worldPos = add(node.position, col.center);
      const dist = length(sub(worldPos, center));
      if (dist <= radius + col.radius) {
        results.push(node);
      }
    }
    return results;
  }

  get size(): number {
    return this._colliders.size;
  }

  private _fireEvent(
    nodeA: Node3D,
    nodeB: Node3D,
    colA: SphereCollider,
    colB: SphereCollider,
    separationAtoB: Vec3,
    type: 'enter' | 'stay' | 'exit',
  ): void {
    const cbsMap = type === 'enter' ? this._enterCbs
      : type === 'stay' ? this._stayCbs
      : this._exitCbs;

    // A 视角
    const cbsA = cbsMap.get(nodeA);
    if (cbsA) {
      const eventA: CollisionEvent = {
        selfNode: nodeA,
        otherNode: nodeB,
        selfCollider: colA,
        otherCollider: colB,
        separation: separationAtoB,
      };
      for (const cb of cbsA) cb(eventA);
    }

    // B 视角（分离向量方向相反）
    const cbsB = cbsMap.get(nodeB);
    if (cbsB) {
      const separationBtoA = scale(separationAtoB, -1);
      const eventB: CollisionEvent = {
        selfNode: nodeB,
        otherNode: nodeA,
        selfCollider: colB,
        otherCollider: colA,
        separation: separationBtoA,
      };
      for (const cb of cbsB) cb(eventB);
    }
  }
}
