/**
 * BulletSystem — 基于 Raycast 的子弹命中检测。
 * 从给定起点向方向发射射线，通过 CollisionWorld.raycast() 检测命中。
 */

import { type Vec3 } from '../../../src/math/vec3';
import { CollisionWorld } from '../../../src/physics/collision';
import { type Node3D } from '../../../src/core/node3d';

export interface BulletHit {
  node: Node3D;
  point: Vec3;
  distance: number;
}

export interface BulletSystemOptions {
  /** 最大命中距离（世界单位），默认 200 */
  maxDistance?: number;
  /** 命中层掩码，默认 0xFFFFFFFF */
  layerMask?: number;
}

export class BulletSystem {
  private _world: CollisionWorld;
  private _maxDistance: number;
  private _layerMask: number;

  constructor(world: CollisionWorld, options: BulletSystemOptions = {}) {
    this._world = world;
    this._maxDistance = options.maxDistance ?? 200;
    this._layerMask = options.layerMask ?? 0xFFFFFFFF;
  }

  /**
   * 从 origin 沿 direction 方向投射射线，返回命中结果（按距离排序）。
   */
  cast(origin: Vec3, direction: Vec3): BulletHit[] {
    const hits = this._world.raycast(origin, direction, this._maxDistance, this._layerMask);
    return hits.map(h => ({
      node: h.node,
      point: h.point,
      distance: h.distance,
    }));
  }
}
