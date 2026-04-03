/**
 * Mesh — a renderable scene node combining Geometry and Material.
 * Extends Node3D to participate in the scene graph hierarchy.
 */

import { Node3D } from '../core/node3d';
import { Geometry } from './geometry';
import { Material } from './material';
import { AABB } from '../math/aabb';

export class Mesh extends Node3D {
  private _geometry: Geometry;
  private _boundingBox: AABB | null = null;

  material: Material;

  /** 设为 false 的 Mesh 始终渲染（跳过视锥裁剪），如天空盒、全屏 HUD */
  frustumCulled: boolean = true;

  constructor(geometry: Geometry, material: Material, name = 'mesh') {
    super(name);
    this._geometry = geometry;
    this.material = material;
  }

  get geometry(): Geometry {
    return this._geometry;
  }

  set geometry(geo: Geometry) {
    this._geometry = geo;
    this._boundingBox = null; // 失效缓存
  }

  /** 惰性计算并缓存 local 空间 AABB，geometry 变化时自动失效 */
  get boundingBox(): AABB {
    if (!this._boundingBox) {
      this._boundingBox = AABB.fromGeometry(this._geometry);
    }
    return this._boundingBox;
  }
}
