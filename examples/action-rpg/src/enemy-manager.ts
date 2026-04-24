/**
 * EnemyManager — 管理场景中 5-8 个 Enemy NPC。
 * 维护 NavGrid 导航网格，创建偏移坐标转换，统一调度 update。
 */

import { Node3D } from '../../../src/core/node3d';
import { NavGrid } from '../../../src/navigation/nav-grid';
import type { Vec3 } from '../../../src/math/vec3';
import { Enemy, type EnemyNavContext } from './enemy';

// 地形覆盖 [-50, 50] × [-50, 50]；用 50 的偏移把世界坐标映射到正整数网格
const GRID_OFFSET  = 50;
const GRID_CELLS   = 50; // 50 × 50 格，cellSize = 2 → 覆盖 100 × 100 世界单位
const CELL_SIZE    = 2;

/** 固定散布的出生点（分散在场地四角和中间区域） */
const SPAWN_POSITIONS: Vec3[] = [
  [-30,  0, -30],
  [ 30,  0, -30],
  [-30,  0,  30],
  [ 30,  0,  30],
  [ 15,  0,   0],
  [-15,  0,  15],
  [  0,  0, -20],
];

export class EnemyManager {
  private readonly _enemies: Enemy[] = [];
  private readonly _nav: EnemyNavContext;

  constructor(playerNode: Node3D) {
    // 构建导航网格
    const grid = new NavGrid(GRID_CELLS, GRID_CELLS, CELL_SIZE);

    const worldToGrid = (worldX: number, worldZ: number): [number, number] => [
      Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((worldX + GRID_OFFSET) / CELL_SIZE))),
      Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((worldZ + GRID_OFFSET) / CELL_SIZE))),
    ];

    const gridToWorld = (gx: number, gz: number): [number, number] => [
      (gx + 0.5) * CELL_SIZE - GRID_OFFSET,
      (gz + 0.5) * CELL_SIZE - GRID_OFFSET,
    ];

    this._nav = { grid, worldToGrid, gridToWorld };

    // 创建 Enemy 实例
    for (const pos of SPAWN_POSITIONS) {
      const enemy = new Enemy(pos, this._nav, playerNode);
      this._enemies.push(enemy);
    }
  }

  get enemies(): readonly Enemy[] {
    return this._enemies;
  }

  /** 获取所有 Enemy 的场景节点（供 Game 添加到 scene） */
  nodes(): Node3D[] {
    return this._enemies.map(e => e.node);
  }

  update(dt: number): void {
    for (const enemy of this._enemies) {
      enemy.update(dt);
    }
  }

  /** 已死亡的 Enemy 数量 */
  get deadCount(): number {
    return this._enemies.filter(e => e.isDead).length;
  }
}
