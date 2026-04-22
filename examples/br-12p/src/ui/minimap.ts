/**
 * Minimap — 右上角小地图，显示 12 玩家位置。
 * 玩家在中心，其他人相对位置，死亡玩家不显示。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { vec3, type Vec3 } from '../../../../src/math/vec3';

export interface MinimapPlayer {
  id: number | string;
  x: number;
  z: number;
  isLocal?: boolean;
  isDead?: boolean;
}

export interface MinimapDot {
  id: number | string;
  x: number;
  y: number;
  color: Vec3;
}

export class Minimap {
  readonly canvas: UICanvas;
  readonly background: UIRect;

  dots: MinimapDot[] = [];

  private readonly _mapX: number;
  private readonly _mapY: number;
  private readonly _size: number;
  private readonly _worldSize: number;

  constructor(opts: {
    screenWidth: number;
    screenHeight: number;
    size?: number;
    worldSize?: number;
  }) {
    const size = opts.size ?? 180;
    const worldSize = opts.worldSize ?? 100;
    const x = opts.screenWidth - size - 16;
    const y = 16;

    this._mapX = x;
    this._mapY = y;
    this._size = size;
    this._worldSize = worldSize;

    this.canvas = new UICanvas(opts.screenWidth, opts.screenHeight);

    this.background = new UIRect({
      x,
      y,
      width: size,
      height: size,
      color: vec3(0.05, 0.08, 0.05),
      opacity: 0.85,
    });

    this.canvas.add(this.background);
  }

  /** 将世界空间 XZ 坐标映射到小地图像素坐标（相对于小地图左上角） */
  worldToMap(worldX: number, worldZ: number): { x: number; y: number } {
    const half = this._worldSize / 2;
    const nx = (worldX + half) / this._worldSize;
    const nz = (worldZ + half) / this._worldSize;
    return {
      x: nx * this._size,
      y: nz * this._size,
    };
  }

  /** 更新所有玩家点位置，忽略死亡玩家 */
  update(players: MinimapPlayer[]): void {
    this.dots = players
      .filter(p => !p.isDead)
      .map(p => {
        const pos = this.worldToMap(p.x, p.z);
        const color = p.isLocal
          ? vec3(0.2, 1.0, 0.2)
          : vec3(1.0, 0.3, 0.2);
        return { id: p.id, x: pos.x, y: pos.y, color };
      });
  }
}
