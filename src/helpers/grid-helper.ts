/**
 * GridHelper — 地面参考网格可视化辅助器。
 * 渲染一组平行线段构成 XZ 平面的正方网格。
 * Stub — to be implemented by Dev.
 * @see test/unit/helpers/debug-helpers.test.ts
 */

export const __STUB__ = true;

import { Node3D } from '../core/node3d';

/**
 * GridHelper 继承 Node3D，内部创建 Line 子节点。
 * size: 网格边长（默认 10），在 XZ 平面上居中。
 * divisions: 网格细分数（默认 10）。
 *
 * 生成 (divisions + 1) * 2 条线段：
 * - X 方向 divisions+1 条平行线
 * - Z 方向 divisions+1 条平行线
 * Y 坐标固定为 0。
 * 中心线（通过原点的那条）可用不同颜色标注。
 */
export class GridHelper extends Node3D {
  constructor(_size?: number, _divisions?: number) {
    super('grid-helper');
    throw new Error('Not implemented');
  }

  /** 网格边长 */
  get size(): number { throw new Error('Not implemented'); }

  /** 网格细分数 */
  get divisions(): number { throw new Error('Not implemented'); }
}
