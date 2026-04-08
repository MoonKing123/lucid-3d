/**
 * Buildings — 基地与资源点定义。
 *
 * 基地（BaseBuilding）：我方大本营，单位前来存入采集物资。
 * 资源点（ResourceNode）：金矿 / 木材采集点，有储量上限。
 *
 * 世界坐标范围：X/Z ∈ [-64, 64)（与地形一致）。
 */

export type ResourceType = 'gold' | 'wood';

export interface ResourceNode {
  id: number;
  x: number;
  z: number;
  type: ResourceType;
  /** 当前剩余储量 */
  amount: number;
  /** 最大储量 */
  maxAmount: number;
}

export interface BaseBuilding {
  x: number;
  z: number;
  /** 到达半径（单位进入此范围视为抵达基地） */
  radius: number;
}

/**
 * 创建我方基地，位于地图左下角（与障碍物无重叠区）。
 */
export function createBase(): BaseBuilding {
  return { x: -50, z: -50, radius: 5 };
}

/**
 * 创建 5 个资源点，分散在地图各区域（均在可通行区域内）。
 *
 * 位置刻意避开 nav.ts 中的障碍物：
 *   西北森林  (-20,-30, 8×8)
 *   北部岩石  (10,-20,  6×10)
 *   西部山丘  (-30,10,  10×6)
 *   东部丘陵  (20,20,   8×8)
 *   南部森林  (-10,40,  12×6)
 *   东北岩石  (40,-10,  6×6)
 */
export function createResourceNodes(): ResourceNode[] {
  return [
    { id: 0, x:  30, z: -40, type: 'gold', amount: 1000, maxAmount: 1000 },
    { id: 1, x: -40, z:  30, type: 'gold', amount: 1000, maxAmount: 1000 },
    { id: 2, x:  50, z:  30, type: 'wood', amount: 1000, maxAmount: 1000 },
    { id: 3, x:  -5, z: -55, type: 'wood', amount: 1000, maxAmount: 1000 },
    { id: 4, x:  55, z: -40, type: 'gold', amount: 1000, maxAmount: 1000 },
  ];
}
