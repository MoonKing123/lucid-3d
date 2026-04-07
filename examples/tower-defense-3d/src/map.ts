import { Node3D } from '../../../src/core/node3d';
import { NavGrid } from '../../../src/navigation/nav-grid';
import { findPath } from '../../../src/navigation/pathfinder';
import { Mesh } from '../../../src/renderer/mesh';
import { createPlaneGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Line, LineGeometry, LineMaterial } from '../../../src/renderer/line-renderer';
import { vec3 } from '../../../src/math/vec3';

export interface MapOptions {
  /** grid 列数，默认 12 */
  width?: number;
  /** grid 行数，默认 12 */
  height?: number;
  /** 每格世界单位，默认 1 */
  cellSize?: number;
}

export class Map {
  readonly node: Node3D;
  readonly grid: NavGrid;
  readonly cellSize: number;
  readonly start: { x: number; y: number };
  readonly end: { x: number; y: number };
  readonly path: { x: number; y: number }[];

  constructor(opts: MapOptions = {}) {
    const w = opts.width ?? 12;
    const h = opts.height ?? 12;
    this.cellSize = opts.cellSize ?? 1;
    this.grid = new NavGrid(w, h, this.cellSize);
    this.node = new Node3D('map');
    this.start = { x: 0, y: Math.floor(h / 2) };
    this.end = { x: w - 1, y: Math.floor(h / 2) };

    // 设置障碍物形成蜿蜒路径
    for (let y = 2; y < h - 2; y++) this.grid.setWalkable(4, y, false);
    for (let y = 2; y < h - 2; y++) this.grid.setWalkable(8, h - 1 - y, false);

    // A* 计算路径
    const result = findPath(this.grid, this.start.x, this.start.y, this.end.x, this.end.y);
    if (!result.found) {
      throw new Error('Map: failed to compute path from start to end');
    }
    // 将 [number, number] 元组转换为 {x, y} 对象
    this.path = result.path.map(([x, y]) => ({ x, y }));

    // 创建地面 mesh
    const groundGeo = createPlaneGeometry(w * this.cellSize, h * this.cellSize);
    const groundMat = new PhongMaterial({
      diffuse: vec3(0.3, 0.5, 0.3),
      ambient: vec3(0.1, 0.15, 0.1),
    });
    const ground = new Mesh(groundGeo, groundMat);
    this.node.addChild(ground);

    // 路径可视化：用 LineRenderer 绘制 A* 路径
    const pathPoints = this.path.map(({ x, y }) => {
      const [wx, , wz] = this.gridToWorld(x, y);
      return vec3(wx, 0.05, wz);
    });
    if (pathPoints.length > 0) {
      const lineGeo = new LineGeometry({ points: pathPoints });
      const lineMat = new LineMaterial({ color: vec3(1, 0.8, 0), lineWidth: 2 });
      const pathLine = new Line(lineGeo, lineMat, 'LINE_STRIP');
      this.node.addChild(pathLine);
    }
  }

  /** grid 坐标 → 世界 xz 坐标（中心对齐） */
  gridToWorld(gx: number, gy: number): [number, number, number] {
    const x = (gx - this.grid.width / 2 + 0.5) * this.cellSize;
    const z = (gy - this.grid.height / 2 + 0.5) * this.cellSize;
    return [x, 0, z];
  }
}
