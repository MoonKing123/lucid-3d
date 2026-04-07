/**
 * CollisionWorld — 基于 SphereCollider 的碰撞检测系统。
 * 支持碰撞事件回调（enter/stay/exit）和空间查询。
 * @see test/unit/physics/collision.test.ts
 */
import { type Vec3, vec3, add, sub, scale, length, normalize, dot } from '../math/vec3';
import { type AABB } from '../math/aabb';
import { Node3D } from '../core/node3d';

/* ---------- 公共类型 ---------- */

export interface CollisionEvent {
  selfNode: Node3D;
  otherNode: Node3D;
  selfCollider: SphereCollider;
  otherCollider: SphereCollider;
  /** 最小分离向量（从 self 指向 other）。触发器模式下始终为零向量。 */
  separation: Vec3;
}

export type CollisionCallback = (event: CollisionEvent) => void;

export interface BodyOptions {
  shape: SphereCollider | { center: Vec3; halfExtents?: Vec3; radius?: number };
  /** 碰撞体所在层（bitmask，默认 1）。 */
  layer?: number;
  /** 检测哪些层（bitmask，默认 0xFFFFFFFF）。 */
  mask?: number;
  /** 触发器模式：触发事件但 separation 始终为零向量（默认 false）。 */
  isTrigger?: boolean;
}

/** 内部存储每个节点的碰撞体信息。 */
interface BodyEntry {
  shape: SphereCollider | { center: Vec3; halfExtents?: Vec3; radius?: number };
  layer: number;
  mask: number;
  isTrigger: boolean;
}

/* ---------- SphereCollider ---------- */

export class SphereCollider {
  center: Vec3;
  radius: number;

  // 重载签名：旧风格 (radius, center?) 和新风格 (center, radius?)
  constructor(radius?: number, center?: Vec3);
  constructor(center: Vec3, radius?: number);
  constructor(arg1?: number | Vec3, arg2?: Vec3 | number) {
    if (typeof arg1 === 'number') {
      // 旧风格 (radius, center?)
      this.radius = arg1;
      this.center = arg2 != null
        ? vec3((arg2 as Vec3)[0], (arg2 as Vec3)[1], (arg2 as Vec3)[2])
        : vec3(0, 0, 0);
    } else if (arg1 != null) {
      // 新风格 (center, radius?)
      this.center = vec3(arg1[0], arg1[1], arg1[2]);
      this.radius = typeof arg2 === 'number' ? arg2 : 1;
    } else {
      // 零参数
      this.radius = 1;
      this.center = vec3(0, 0, 0);
    }
  }

  /** 静态工厂：center-first 风格，与 BoxCollider.fromCenter 保持一致。 */
  static fromCenter(center: Vec3, radius = 1): SphereCollider {
    return new SphereCollider(center, radius);
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

export interface CollisionRaycastHit {
  node: Node3D;
  distance: number;
  point: Vec3;
}

/* ---------- CollisionWorld ---------- */

export class CollisionWorld {
  private _bodies: Map<Node3D, BodyEntry> = new Map();

  private _enterCbs: Map<Node3D, CollisionCallback[]> = new Map();
  private _stayCbs: Map<Node3D, CollisionCallback[]> = new Map();
  private _exitCbs: Map<Node3D, CollisionCallback[]> = new Map();

  /** 上一帧活跃的碰撞对 key 集合 */
  private _activePairs: Set<string> = new Set();

  /** 向后兼容接口：等价于 addBody({ shape, layer: 1, mask: 0xFFFFFFFF, isTrigger: false })。 */
  addCollider(node: Node3D, collider: SphereCollider): void {
    this.addBody(node, { shape: collider });
  }

  /** 新推荐接口：支持 layer/mask 过滤和 trigger 模式。也接受裸碰撞体（BoxCollider/SphereCollider）直接传入。 */
  addBody(node: Node3D, options: BodyOptions | SphereCollider | { center: Vec3; halfExtents?: Vec3 }): void {
    ensureId(node);
    let shape: BodyEntry['shape'];
    let layer = 1;
    let mask = 0xFFFFFFFF;
    let isTrigger = false;
    if ('shape' in options) {
      const opts = options as BodyOptions;
      shape = opts.shape;
      layer = opts.layer ?? 1;
      mask = opts.mask ?? 0xFFFFFFFF;
      isTrigger = opts.isTrigger ?? false;
    } else {
      shape = options as SphereCollider | { center: Vec3; halfExtents?: Vec3 };
    }
    this._bodies.set(node, { shape, layer, mask, isTrigger });
  }

  removeCollider(node: Node3D): void {
    this._bodies.delete(node);
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

  getCollider(node: Node3D): BodyEntry['shape'] | undefined {
    return this._bodies.get(node)?.shape;
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

  /** O(n²) 遍历所有碰撞对，触发事件。step() 在相交测试前先做 layer/mask 过滤。 */
  step(): void {
    const nodes = Array.from(this._bodies.keys());
    const newPairs = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const entryA = this._bodies.get(nodeA)!;
        const entryB = this._bodies.get(nodeB)!;

        // layer/mask 双向过滤：(A.layer & B.mask) !== 0 AND (B.layer & A.mask) !== 0
        if ((entryA.layer & entryB.mask) === 0 || (entryB.layer & entryA.mask) === 0) {
          continue;
        }

        const colA = entryA.shape;
        const colB = entryB.shape;

        // 碰撞事件系统只处理球体-球体对
        if (!(colA instanceof SphereCollider) || !(colB instanceof SphereCollider)) continue;

        // world-space 位置 = 节点位置 + 碰撞体局部中心偏移
        const posA = add(nodeA.position, colA.center);
        const posB = add(nodeB.position, colB.center);

        const dist = length(sub(posB, posA));
        const overlap = (colA.radius + colB.radius) - dist;

        if (overlap >= 0) {
          const key = pairKey(nodeA, nodeB);
          newPairs.add(key);

          // 触发器模式：separation 强制为零向量
          let separationAtoB: Vec3;
          if (entryA.isTrigger || entryB.isTrigger) {
            separationAtoB = vec3(0, 0, 0);
          } else {
            const dir = sub(posB, posA);
            separationAtoB = dist > 0
              ? scale(normalize(dir), overlap)
              : vec3(overlap, 0, 0); // 同心球退化情况
          }

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
          const colA = this._bodies.get(nodeA)!.shape;
          const colB = this._bodies.get(nodeB)!.shape;
          if (colA instanceof SphereCollider && colB instanceof SphereCollider) {
            this._fireEvent(nodeA, nodeB, colA, colB, vec3(0, 0, 0), 'exit');
          }
        }
      }
    }

    this._activePairs = newPairs;
  }

  /** 查询与给定球体重叠的所有节点。layerMask 可选，过滤返回层。 */
  query(center: Vec3, radius: number, layerMask?: number): Node3D[] {
    const results: Node3D[] = [];
    for (const [node, entry] of this._bodies) {
      // 如果指定了 layerMask，过滤不在该层的节点
      if (layerMask !== undefined && (entry.layer & layerMask) === 0) {
        continue;
      }
      const worldPos = add(node.position, entry.shape.center);
      const dist = length(sub(worldPos, center));
      if (dist <= radius + (entry.shape.radius ?? 0)) {
        results.push(node);
      }
    }
    return results;
  }

  get size(): number {
    return this._bodies.size;
  }

  /**
   * 添加静态碰撞体（地面/墙/障碍），自动创建内部 Node3D。
   * 返回创建的 Node3D，便于后续 raycast/碰撞回调引用。
   */
  addStaticBody(
    collider: SphereCollider | { center: Vec3; halfExtents: Vec3 },
    options?: { layer?: number; mask?: number; isTrigger?: boolean; name?: string },
  ): Node3D {
    const node = new Node3D(options?.name ?? 'static-body');
    this.addBody(node, {
      shape: collider,
      layer: options?.layer ?? 1,
      mask: options?.mask ?? 0xFFFFFFFF,
      isTrigger: options?.isTrigger ?? false,
    });
    return node;
  }

  /**
   * 光线投射，返回按距离排序的命中列表。
   * 支持 SphereCollider（解析法）和 BoxCollider（slab 法）。
   */
  raycast(
    origin: Vec3,
    direction: Vec3,
    maxDistance = Infinity,
    layerMask = 0xFFFFFFFF,
  ): CollisionRaycastHit[] {
    const hits: CollisionRaycastHit[] = [];

    for (const [node, entry] of this._bodies) {
      if ((entry.layer & layerMask) === 0) continue;
      const shape = entry.shape;

      if (shape instanceof SphereCollider) {
        // 解析法：求解 |origin + t*dir - center|² = r²
        const center = add(node.position, shape.center);
        const oc = sub(origin, center);
        const a = dot(direction, direction);
        const b = 2 * dot(oc, direction);
        const c = dot(oc, oc) - shape.radius * shape.radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const sqrtD = Math.sqrt(disc);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);
        const t = t1 >= 0 ? t1 : t2;
        if (t < 0 || t > maxDistance) continue;
        hits.push({ node, distance: t, point: add(origin, scale(direction, t)) });
      } else {
        // Slab 法：ray-AABB 交叉（duck type BoxCollider）
        const box = shape as { center: Vec3; halfExtents: Vec3 };
        let tEnter = -Infinity;
        let tExit = Infinity;
        let miss = false;
        for (let i = 0; i < 3; i++) {
          const mn = node.position[i] + box.center[i] - box.halfExtents[i];
          const mx = node.position[i] + box.center[i] + box.halfExtents[i];
          const d = direction[i];
          if (Math.abs(d) < 1e-10) {
            if (origin[i] < mn || origin[i] > mx) { miss = true; break; }
          } else {
            const t1 = (mn - origin[i]) / d;
            const t2 = (mx - origin[i]) / d;
            const tLo = Math.min(t1, t2);
            const tHi = Math.max(t1, t2);
            if (tLo > tEnter) tEnter = tLo;
            if (tHi < tExit) tExit = tHi;
          }
        }
        if (miss || tEnter > tExit || tExit < 0) continue;
        const t = tEnter >= 0 ? tEnter : tExit;
        if (t > maxDistance) continue;
        hits.push({ node, distance: t, point: add(origin, scale(direction, t)) });
      }
    }

    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }

  /**
   * 地面检测辅助：查找在 y 坐标以下、距离 maxDistance 内最近的地面表面 Y 值。
   * 只检查 Y 轴，忽略 X/Z 位置（适用于角色控制器地面接近度检测）。
   * @returns 最高的地面 Y 坐标，如果没有则返回 null
   */
  findGround(y: number, maxDistance: number, layerMask = 0xFFFFFFFF): number | null {
    let highestY: number | null = null;
    for (const [node, entry] of this._bodies) {
      if ((entry.layer & layerMask) === 0) continue;
      const shape = entry.shape;
      if (!shape) continue;
      let topY: number;
      if (shape instanceof SphereCollider) {
        topY = node.position[1] + shape.center[1] + shape.radius;
      } else {
        const box = shape as { center: Vec3; halfExtents?: Vec3 };
        topY = node.position[1] + (box.center?.[1] ?? 0) + (box.halfExtents?.[1] ?? 0);
      }
      if (topY <= y && y - topY <= maxDistance) {
        if (highestY === null || topY > highestY) {
          highestY = topY;
        }
      }
    }
    return highestY;
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
