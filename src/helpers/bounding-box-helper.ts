/**
 * BoundingBoxHelper — AABB 包围盒线框可视化辅助器。
 * 渲染目标 Node3D（Mesh）的 AABB 为 12 条线段的线框盒。
 * @see test/unit/helpers/debug-helpers.test.ts
 */

import { vec3, type Vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { AABB } from '../math/aabb';
import { Mesh } from '../renderer/mesh';
import { Line, LineGeometry, LineMaterial } from '../renderer/line-renderer';

/**
 * BoundingBoxHelper 继承 Node3D，内部创建 Line 子节点。
 * target: 要可视化包围盒的节点（通常是 Mesh）。
 * color: 线框颜色（默认绿色 (0,1,0)）。
 *
 * update() 重新计算 target 的 AABB 并更新线段几何体。
 * AABB 盒有 8 个角点和 12 条边（24 个端点）。
 */
export class BoundingBoxHelper extends Node3D {
  readonly target: Node3D;
  private _color: Vec3;
  private _line: Line;

  constructor(target: Node3D, color: Vec3 = vec3(0, 1, 0)) {
    super('bbox-helper');
    this.target = target;
    this._color = color;

    // 创建占位线段，update() 时填充实际数据
    const geo = new LineGeometry({ points: [] });
    this._line = new Line(geo, new LineMaterial({ color: this._color }), 'LINES');
    this.addChild(this._line);
  }

  /** 重新计算并更新线框几何体 */
  update(): void {
    let aabb: AABB;

    if (this.target instanceof Mesh) {
      aabb = AABB.fromGeometry(this.target.geometry);
    } else {
      // 非 Mesh 节点：回退为单位盒 (-0.5 ~ 0.5)
      aabb = new AABB(vec3(-0.5, -0.5, -0.5), vec3(0.5, 0.5, 0.5));
    }

    const { min, max } = aabb;

    // 8 个角点
    const corners: Vec3[] = [
      vec3(min[0], min[1], min[2]), // 0
      vec3(max[0], min[1], min[2]), // 1
      vec3(max[0], max[1], min[2]), // 2
      vec3(min[0], max[1], min[2]), // 3
      vec3(min[0], min[1], max[2]), // 4
      vec3(max[0], min[1], max[2]), // 5
      vec3(max[0], max[1], max[2]), // 6
      vec3(min[0], max[1], max[2]), // 7
    ];

    // 12 条边（每条边 2 个端点，共 24 个点）
    const edges: [number, number][] = [
      // 底面
      [0, 1], [1, 2], [2, 3], [3, 0],
      // 顶面
      [4, 5], [5, 6], [6, 7], [7, 4],
      // 竖边
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    const points: Vec3[] = [];
    for (const [a, b] of edges) {
      points.push(corners[a]);
      points.push(corners[b]);
    }

    this._line.geometry.setPoints(points);
  }
}
