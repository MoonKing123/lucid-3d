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

  /**
   * 克隆 Mesh。
   * recursive=false: geometry 和 material 共享引用（浅克隆）
   * recursive=true: geometry 和 material 也做 clone（深克隆）
   */
  override clone(recursive = false): Mesh {
    const geo = recursive ? this._geometry.clone() : this._geometry;
    const mat = recursive ? this.material.clone()  : this.material;
    const m = new Mesh(geo, mat, this.name);
    m.position = this.position.slice() as import('../math/vec3').Vec3;
    m.rotation = this.rotation.slice() as import('../math/vec3').Vec3;
    m.scale    = this.scale.slice()    as import('../math/vec3').Vec3;
    m.visible  = this.visible;
    m.frustumCulled = this.frustumCulled;
    if (recursive) {
      for (const child of this.children) {
        m.addChild(child.clone(true));
      }
    }
    return m;
  }
}
