/**
 * NavMap — 基于 128×128 地形的导航网格。
 *
 * 地形世界坐标：X ∈ [-64, 64)，Z ∈ [-64, 64)
 * 网格坐标：[0, 128) × [0, 128)，cellSize=1
 * 偏移：gridX = worldX + 64，gridZ = worldZ + 64
 */
import { NavGrid } from '../../../src/navigation/nav-grid';
import { findPath, type PathResult } from '../../../src/navigation/pathfinder';

/** 地图网格分辨率（与 TERRAIN_SIZE 相同） */
export const NAV_CELLS = 128;
/** 每格世界单位大小 */
export const NAV_CELL_SIZE = 1;
/** 世界坐标到网格坐标的 X 偏移 */
export const NAV_OFFSET_X = 64;
/** 世界坐标到网格坐标的 Z 偏移 */
export const NAV_OFFSET_Z = 64;

/**
 * SLG 地图导航辅助类。
 * 封装 NavGrid，处理世界坐标与网格坐标的偏移转换。
 */
export class NavMap {
  readonly grid: NavGrid;

  constructor() {
    this.grid = new NavGrid(NAV_CELLS, NAV_CELLS, NAV_CELL_SIZE);
    this._buildObstacles();
  }

  /** 世界坐标 → 网格坐标 */
  worldToGrid(worldX: number, worldZ: number): [number, number] {
    return this.grid.worldToGrid(worldX + NAV_OFFSET_X, worldZ + NAV_OFFSET_Z);
  }

  /** 网格坐标 → 世界中心坐标 */
  gridToWorld(gridX: number, gridZ: number): [number, number] {
    const [wx, wz] = this.grid.gridToWorld(gridX, gridZ);
    return [wx - NAV_OFFSET_X, wz - NAV_OFFSET_Z];
  }

  /** 世界坐标是否可通行 */
  isWalkableWorld(worldX: number, worldZ: number): boolean {
    const [gx, gz] = this.worldToGrid(worldX, worldZ);
    return this.grid.isWalkable(gx, gz);
  }

  /**
   * 世界坐标 A* 寻路。
   * 默认开启对角移动（SLG 常见）+ 足够大的迭代上限。
   * @param startX 起点世界 X
   * @param startZ 起点世界 Z
   * @param endX   终点世界 X
   * @param endZ   终点世界 Z
   */
  findPathWorld(
    startX: number, startZ: number,
    endX: number, endZ: number,
  ): PathResult {
    const [sgx, sgz] = this.worldToGrid(startX, startZ);
    const [egx, egz] = this.worldToGrid(endX, endZ);
    return findPath(this.grid, sgx, sgz, egx, egz, {
      diagonal: true,
      maxIterations: 50000,
    });
  }

  /**
   * 建立障碍物区域（世界坐标左上角 + 宽高，格数）。
   * 这些区域模拟地图上的石头、森林等不可通行地形。
   */
  private _buildObstacles(): void {
    // [worldX, worldZ, gridWidth, gridHeight]
    const obstacles: Array<[number, number, number, number]> = [
      [-20, -30, 8, 8],   // 西北森林
      [10,  -20, 6, 10],  // 北部岩石群
      [-30,  10, 10,  6], // 西部山丘
      [20,   20, 8,   8], // 东部丘陵
      [-10,  40, 12,  6], // 南部森林
      [40,  -10, 6,   6], // 东北岩石
      [-56, -56, 4,   4], // 西南角（远离通用测试点 -50,-50 和 -60,-60）
      [58,   58, 4,   4], // 东南角（远离通用测试点 50,50 和 55,55）
    ];

    for (const [wx, wz, w, h] of obstacles) {
      const [gx, gz] = this.worldToGrid(wx, wz);
      // fillRect 自动跳过越界格子
      this.grid.fillRect(gx, gz, w, h, false);
    }
  }
}

/** 创建并返回 SLG 地图的导航网格实例。 */
export function buildNavMap(): NavMap {
  return new NavMap();
}
