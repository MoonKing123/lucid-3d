import type { Map } from './map';
import { Tower, type TowerType } from './tower';

export class TowerManager {
  readonly map: Map;
  readonly towers: Tower[] = [];
  private occupied = new globalThis.Map<string, Tower>();

  constructor(map: Map) {
    this.map = map;
  }

  isOccupied(gx: number, gy: number): boolean {
    return this.occupied.has(`${gx},${gy}`);
  }

  /** 在 grid 坐标放置一座塔。返回 Tower 或 null（失败）。 */
  place(gx: number, gy: number, type: TowerType): Tower | null {
    if (!this.map.grid.isInBounds(gx, gy)) return null;
    if (!this.map.grid.isWalkable(gx, gy)) return null;
    if (this.isOccupied(gx, gy)) return null;

    const worldPos = this.map.gridToWorld(gx, gy);
    const tower = new Tower({ type, gridX: gx, gridY: gy, worldPosition: worldPos });
    this.towers.push(tower);
    this.occupied.set(`${gx},${gy}`, tower);
    return tower;
  }

  /** 移除指定 grid 坐标的塔。返回是否成功。 */
  remove(gx: number, gy: number): boolean {
    const key = `${gx},${gy}`;
    const tower = this.occupied.get(key);
    if (!tower) return false;
    this.occupied.delete(key);
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);
    return true;
  }
}
