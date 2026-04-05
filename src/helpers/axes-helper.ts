/**
 * AxesHelper — 3D 坐标轴可视化辅助器。
 * 渲染三条彩色线段：X=红, Y=绿, Z=蓝。
 * @see test/unit/helpers/debug-helpers.test.ts
 */

import { vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Line, LineGeometry, LineMaterial } from '../renderer/line-renderer';

/**
 * AxesHelper 继承 Node3D，内部创建 3 条 Line 子节点。
 * size 参数控制轴长度（默认 1）。
 *
 * 每条轴从原点 (0,0,0) 到 (size,0,0)/(0,size,0)/(0,0,size)。
 * 颜色：X 轴红色 (1,0,0)，Y 轴绿色 (0,1,0)，Z 轴蓝色 (0,0,1)。
 */
export class AxesHelper extends Node3D {
  private _size: number;

  constructor(size = 1) {
    super('axes-helper');
    this._size = size;

    // X 轴：红色，原点 → (size, 0, 0)
    const xGeo = new LineGeometry({
      points: [vec3(0, 0, 0), vec3(size, 0, 0)],
      colors: [vec3(1, 0, 0), vec3(1, 0, 0)],
    });
    this.addChild(new Line(xGeo, new LineMaterial(), 'LINES'));

    // Y 轴：绿色，原点 → (0, size, 0)
    const yGeo = new LineGeometry({
      points: [vec3(0, 0, 0), vec3(0, size, 0)],
      colors: [vec3(0, 1, 0), vec3(0, 1, 0)],
    });
    this.addChild(new Line(yGeo, new LineMaterial(), 'LINES'));

    // Z 轴：蓝色，原点 → (0, 0, size)
    const zGeo = new LineGeometry({
      points: [vec3(0, 0, 0), vec3(0, 0, size)],
      colors: [vec3(0, 0, 1), vec3(0, 0, 1)],
    });
    this.addChild(new Line(zGeo, new LineMaterial(), 'LINES'));
  }

  /** 轴长度 */
  get size(): number {
    return this._size;
  }
}
