/**
 * AxesHelper — 3D 坐标轴可视化辅助器。
 * 渲染三条彩色线段：X=红, Y=绿, Z=蓝。
 * Stub — to be implemented by Dev.
 * @see test/unit/helpers/debug-helpers.test.ts
 */

export const __STUB__ = true;

import { Node3D } from '../core/node3d';

/**
 * AxesHelper 继承 Node3D，内部创建 3 条 Line 子节点。
 * size 参数控制轴长度（默认 1）。
 *
 * 每条轴从原点 (0,0,0) 到 (size,0,0)/(0,size,0)/(0,0,size)。
 * 颜色：X 轴红色 (1,0,0)，Y 轴绿色 (0,1,0)，Z 轴蓝色 (0,0,1)。
 */
export class AxesHelper extends Node3D {
  constructor(_size?: number) {
    super('axes-helper');
    throw new Error('Not implemented');
  }

  /** 轴长度 */
  get size(): number { throw new Error('Not implemented'); }
}
