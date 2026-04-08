/**
 * Minimap — SLG 小地图（右上角）。
 * 简单方案：UIRect 背景 + 逐帧计算单位点位置。
 * 将世界空间坐标映射到小地图像素坐标。
 */
import { UIRect } from '../../../../src/ui/ui-rect';
import { vec3, type Vec3 } from '../../../../src/math/vec3';
import type { UnitData } from '../units';

/** 单位在小地图上的点信息 */
export interface MinimapDot {
  unitId: number;
  /** 相对于小地图左上角的像素坐标 */
  x: number;
  y: number;
  /** 阵营颜色 */
  color: Vec3;
}

// 阵营颜色
const DOT_COLOR_ALLY    = vec3(0.2, 0.5, 1.0);   // 蓝色
const DOT_COLOR_ENEMY   = vec3(1.0, 0.3, 0.2);   // 红色
const DOT_COLOR_NEUTRAL = vec3(0.8, 0.8, 0.2);   // 黄色
const DOT_COLOR_SELECTED = vec3(1.0, 1.0, 0.0);  // 高亮黄

export class Minimap {
  readonly background: UIRect;

  /** 小地图在屏幕上的位置 */
  readonly x: number;
  readonly y: number;
  /** 小地图像素尺寸（正方形） */
  readonly size: number;
  /** 世界地图单位尺寸（TERRAIN_SIZE） */
  readonly worldSize: number;

  /** 所有单位在小地图上的点（update 后刷新） */
  dots: MinimapDot[] = [];

  constructor(opts: {
    x: number;
    y: number;
    size: number;
    worldSize: number;
  }) {
    this.x = opts.x;
    this.y = opts.y;
    this.size = opts.size;
    this.worldSize = opts.worldSize;

    // 小地图背景：深色半透明
    this.background = new UIRect({
      x: opts.x,
      y: opts.y,
      width: opts.size,
      height: opts.size,
      color: vec3(0.05, 0.08, 0.05),
      opacity: 0.85,
    });
  }

  /**
   * 将世界空间 XZ 坐标映射到小地图像素坐标（相对于小地图左上角）。
   * 世界坐标范围：[-worldSize/2, worldSize/2]
   */
  worldToMap(worldX: number, worldZ: number): { x: number; y: number } {
    const half = this.worldSize / 2;
    const nx = (worldX + half) / this.worldSize; // 0..1
    const nz = (worldZ + half) / this.worldSize; // 0..1
    return {
      x: nx * this.size,
      y: nz * this.size,
    };
  }

  /**
   * 逐帧更新单位点位置。
   * @param units UnitData 数组（来自 UnitManager）
   */
  update(units: UnitData[]): void {
    this.dots = units.map((unit) => {
      const pos = this.worldToMap(unit.x, unit.z);
      let color: Vec3;
      if (unit.selected) {
        color = DOT_COLOR_SELECTED;
      } else {
        switch (unit.faction) {
          case 'ally':    color = DOT_COLOR_ALLY; break;
          case 'enemy':   color = DOT_COLOR_ENEMY; break;
          case 'neutral': color = DOT_COLOR_NEUTRAL; break;
          default:        color = DOT_COLOR_NEUTRAL;
        }
      }
      return { unitId: unit.id, x: pos.x, y: pos.y, color };
    });
  }
}
