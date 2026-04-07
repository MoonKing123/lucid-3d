import type { Map } from './map';
import type { OrbitCamera } from '../../../src/core/orbit-camera';
import { Raycaster } from '../../../src/core/ray';

export interface PickerHit {
  gridX: number;
  gridY: number;
  world: [number, number, number];
}

export class Picker {
  constructor(public camera: OrbitCamera, public map: Map) {}

  /** 根据屏幕 NDC 坐标 (-1..1) 拾取地面 cell（y=0 平面）。 */
  pickAtNDC(ndcX: number, ndcY: number): PickerHit | null {
    const raycaster = new Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);

    const ray = raycaster.ray;
    // 与 y=0 平面求交：origin.y + t * direction.y = 0
    const dirY = ray.direction[1];
    if (Math.abs(dirY) < 1e-10) return null; // 射线平行于地面

    const t = -ray.origin[1] / dirY;
    if (t < 0) return null; // 交点在射线起点后方

    const worldX = ray.origin[0] + t * ray.direction[0];
    const worldZ = ray.origin[2] + t * ray.direction[2];

    // 世界坐标转 grid 坐标
    const grid = this.map.grid;
    const halfW = grid.width / 2;
    const halfH = grid.height / 2;
    const cs = this.map.cellSize;

    const gx = Math.floor((worldX + halfW * cs) / cs);
    const gy = Math.floor((worldZ + halfH * cs) / cs);

    if (!grid.isInBounds(gx, gy)) return null;

    const worldPos = this.map.gridToWorld(gx, gy);
    return {
      gridX: gx,
      gridY: gy,
      world: worldPos,
    };
  }
}
