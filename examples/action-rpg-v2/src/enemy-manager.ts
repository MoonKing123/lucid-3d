/**
 * EnemyManager (v2) — 管理 action-rpg-v2 场景中的 7 个 Enemy NPC。
 * 每个 Enemy 独立 AnimationMixer + BlendTree1D + AI StateMachine + Health。
 */

import { Node3D } from '../../../src/core/node3d';
import { NavGrid } from '../../../src/navigation/nav-grid';
import type { Vec3 } from '../../../src/math/vec3';
import { Enemy, type EnemyNavContext } from './enemy';

const GRID_OFFSET = 50;
const GRID_CELLS  = 50;
const CELL_SIZE   = 2;

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

    for (const pos of SPAWN_POSITIONS) {
      this._enemies.push(new Enemy(pos, this._nav, playerNode));
    }
  }

  get enemies(): readonly Enemy[] { return this._enemies; }

  nodes(): Node3D[] { return this._enemies.map(e => e.node); }

  update(dt: number): void {
    for (const enemy of this._enemies) enemy.update(dt);
  }

  get deadCount(): number {
    return this._enemies.filter(e => e.isDead).length;
  }
}
