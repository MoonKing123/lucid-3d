/**
 * GridHelper — 地面参考网格可视化辅助器。
 * 渲染一组平行线段构成 XZ 平面的正方网格。
 * @see test/unit/helpers/debug-helpers.test.ts
 */

import { vec3, type Vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Line, LineGeometry } from '../renderer/line-renderer';

/**
 * GridHelper 继承 Node3D，内部创建 Line 子节点。
 * size: 网格边长（默认 10），在 XZ 平面上居中。
 * divisions: 网格细分数（默认 10）。
 *
 * 生成 (divisions + 1) * 2 条线段：
 * - Z 方向 divisions+1 条 X 平行线
 * - X 方向 divisions+1 条 Z 平行线
 * Y 坐标固定为 0。
 */
export class GridHelper extends Node3D {
  private _size: number;
  private _divisions: number;

  constructor(size = 10, divisions = 10) {
    super('grid-helper');
    this._size = size;
    this._divisions = divisions;

    const half = size / 2;
    const step = size / divisions;
    const points: Vec3[] = [];

    // X 平行线（沿 Z 变化定位，沿 X 方向延伸）
    for (let i = 0; i <= divisions; i++) {
      const z = -half + i * step;
      points.push(vec3(-half, 0, z));
      points.push(vec3(half, 0, z));
    }

    // Z 平行线（沿 X 变化定位，沿 Z 方向延伸）
    for (let i = 0; i <= divisions; i++) {
      const x = -half + i * step;
      points.push(vec3(x, 0, -half));
      points.push(vec3(x, 0, half));
    }

    const geo = new LineGeometry({ points });
    this.addChild(new Line(geo, undefined, 'LINES'));
  }

  /** 网格边长 */
  get size(): number {
    return this._size;
  }

  /** 网格细分数 */
  get divisions(): number {
    return this._divisions;
  }
}
