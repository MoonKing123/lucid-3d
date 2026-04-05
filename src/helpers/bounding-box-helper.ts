/**
 * BoundingBoxHelper — AABB 包围盒线框可视化辅助器。
 * 渲染目标 Node3D（Mesh）的 AABB 为 12 条线段的线框盒。
 * Stub — to be implemented by Dev.
 * @see test/unit/helpers/debug-helpers.test.ts
 */

export const __STUB__ = true;

import { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';

/**
 * BoundingBoxHelper 继承 Node3D，内部创建 Line 子节点。
 * target: 要可视化包围盒的节点（通常是 Mesh）。
 * color: 线框颜色（默认绿色 (0,1,0)）。
 *
 * update() 重新计算 target 的世界空间 AABB 并更新线段几何体。
 * AABB 盒有 8 个角点和 12 条边。
 *
 * 如果 target 不是 Mesh（没有 geometry），则渲染一个默认的单位盒。
 */
export class BoundingBoxHelper extends Node3D {
  readonly target: Node3D;

  constructor(_target: Node3D, _color?: Vec3) {
    super('bbox-helper');
    this.target = _target;
    throw new Error('Not implemented');
  }

  /** 重新计算并更新线框几何体 */
  update(): void { throw new Error('Not implemented'); }
}
