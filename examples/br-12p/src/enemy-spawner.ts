/**
 * enemy-spawner.ts — 在地图上生成 N 个敌人 NPC。
 * 随机分散在地图范围内，避免与玩家出生点重叠。
 */

import { type Vec3, vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';
import { CollisionWorld } from '../../../src/physics/collision';
import { Enemy } from './enemy';
import { MAP_SIZE } from './map';

/** 与玩家出生点的最小间距（m） */
const MIN_DIST_FROM_PLAYER = 10;

/**
 * 在地图上随机生成 `count` 个敌人。
 * @param count      敌人数量
 * @param world      碰撞世界（用于 LOS 检测）
 * @param playerNode 玩家节点（AI 追踪目标）
 * @param onHitPlayer 敌人击中玩家的回调（伤害量）
 */
export function spawnEnemies(
  count: number,
  world: CollisionWorld,
  playerNode: Node3D,
  onHitPlayer?: (damage: number) => void,
): Enemy[] {
  const enemies: Enemy[] = [];
  const half = MAP_SIZE / 2 - 5;  // 留边距避免生成在边界

  for (let i = 0; i < count; i++) {
    let pos: Vec3;
    // 重试直到离玩家够远
    let attempts = 0;
    do {
      pos = vec3(
        (Math.random() * 2 - 1) * half,
        0,
        (Math.random() * 2 - 1) * half,
      );
      attempts++;
      // 超过 20 次仍未找到合适位置则强制使用
    } while (attempts < 20 && _distXZ(pos, playerNode.position) < MIN_DIST_FROM_PLAYER);

    enemies.push(new Enemy(pos, world, playerNode, onHitPlayer));
  }

  return enemies;
}

function _distXZ(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}
