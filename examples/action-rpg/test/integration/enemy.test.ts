/**
 * enemy.test.ts — M5.2 Enemy NPC + NavMeshAgent + AI 状态机集成测试。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Node3D } from '../../../../src/core/node3d';
import { NavGrid } from '../../../../src/navigation/nav-grid';
import { Enemy, type EnemyNavContext } from '../../src/enemy';
import type { Vec3 } from '../../../../src/math/vec3';

// ── 测试辅助 ─────────────────────────────────────────────────────────

const GRID_SIZE = 20;
const CELL_SIZE = 2;
const OFFSET    = 20;

function buildNav(): EnemyNavContext {
  const grid = new NavGrid(GRID_SIZE, GRID_SIZE, CELL_SIZE);
  return {
    grid,
    worldToGrid: (wx, wz) => [
      Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((wx + OFFSET) / CELL_SIZE))),
      Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((wz + OFFSET) / CELL_SIZE))),
    ],
    gridToWorld: (gx, gz) => [
      (gx + 0.5) * CELL_SIZE - OFFSET,
      (gz + 0.5) * CELL_SIZE - OFFSET,
    ],
  };
}

function buildEnemy(
  pos: Vec3 = [0, 0, 0],
  playerNode?: Node3D,
  aggroRange = 10,
): { enemy: Enemy; player: Node3D; nav: EnemyNavContext } {
  const nav    = buildNav();
  const player = playerNode ?? new Node3D('player');
  player.position[0] = 100; // 玩家默认放远处
  player.position[2] = 100;
  const enemy  = new Enemy(pos, nav, player, { aggroRange, attackRange: 2, attackInterval: 1 });
  return { enemy, player, nav };
}

// ── 1. 初始化 ─────────────────────────────────────────────────────────

describe('Enemy 初始化', () => {
  it('可正常创建 Enemy', () => {
    expect(() => buildEnemy()).not.toThrow();
  });

  it('初始状态为 patrol', () => {
    const { enemy } = buildEnemy();
    expect(enemy.state).toBe('patrol');
  });

  it('初始 health = 100', () => {
    const { enemy } = buildEnemy();
    expect(enemy.health.current).toBe(100);
  });

  it('初始 isDead = false', () => {
    const { enemy } = buildEnemy();
    expect(enemy.isDead).toBe(false);
  });

  it('node 位置与初始化坐标一致', () => {
    const { enemy } = buildEnemy([5, 0, 3]);
    expect(enemy.node.position[0]).toBe(5);
    expect(enemy.node.position[2]).toBe(3);
  });

  it('mixer 已初始化', () => {
    const { enemy } = buildEnemy();
    expect(enemy.mixer).toBeDefined();
  });
});

// ── 2. 60 帧稳定运行 ────────────────────────────────────────────────

describe('Enemy 60 帧稳定运行', () => {
  it('patrol 状态下 60 帧不崩溃', () => {
    const { enemy } = buildEnemy();
    expect(() => {
      for (let i = 0; i < 60; i++) enemy.update(1 / 60);
    }).not.toThrow();
  });

  it('60 帧后位置无 NaN', () => {
    const { enemy } = buildEnemy();
    for (let i = 0; i < 60; i++) enemy.update(1 / 60);
    expect(isNaN(enemy.node.position[0])).toBe(false);
    expect(isNaN(enemy.node.position[2])).toBe(false);
  });

  it('死亡后 update 不崩溃', () => {
    const { enemy } = buildEnemy();
    enemy.health.takeDamage(100);
    expect(() => {
      for (let i = 0; i < 60; i++) enemy.update(1 / 60);
    }).not.toThrow();
  });
});

// ── 3. AI 状态机转换 ────────────────────────────────────────────────

describe('Enemy AI 状态机', () => {
  it('玩家进入 aggroRange 时切换到 chase 状态', () => {
    const { enemy, player } = buildEnemy([0, 0, 0]);
    // 玩家移到 5m 内（aggroRange=10）
    player.position[0] = 3;
    player.position[2] = 3;

    for (let i = 0; i < 5; i++) enemy.update(1 / 60);
    expect(enemy.state).toBe('chase');
  });

  it('chase 状态下玩家进入 attackRange 切换到 attack', () => {
    const { enemy, player } = buildEnemy([0, 0, 0]);
    // 先触发 chase
    player.position[0] = 3;
    player.position[2] = 0;
    for (let i = 0; i < 5; i++) enemy.update(1 / 60);
    expect(enemy.state).toBe('chase');

    // 玩家贴近（attackRange=2）
    player.position[0] = 0.5;
    player.position[2] = 0;
    for (let i = 0; i < 5; i++) enemy.update(1 / 60);
    expect(enemy.state).toBe('attack');
  });

  it('受到伤害 health 减少', () => {
    const { enemy } = buildEnemy();
    enemy.health.takeDamage(30);
    expect(enemy.health.current).toBe(70);
  });

  it('health 归零时切换到 dead 状态', () => {
    const { enemy } = buildEnemy();
    enemy.health.takeDamage(100);
    expect(enemy.isDead).toBe(true);
    expect(enemy.state).toBe('dead');
  });

  it('死亡后 health 不继续减少', () => {
    const { enemy } = buildEnemy();
    enemy.health.takeDamage(100);
    enemy.health.takeDamage(50);
    expect(enemy.health.current).toBe(0);
  });
});

// ── 4. 攻击回调 ─────────────────────────────────────────────────────

describe('Enemy 攻击玩家回调', () => {
  it('进入 attack 状态后触发 onAttackPlayer', () => {
    let damage = 0;
    const { enemy, player } = buildEnemy([0, 0, 0], undefined, 10);
    enemy.onAttackPlayer(d => { damage += d; });

    // 将玩家放到攻击范围内
    player.position[0] = 0.5;
    player.position[2] = 0;

    // 运行足够帧进入 attack 并触发一次攻击（attackInterval=1s）
    for (let i = 0; i < 120; i++) enemy.update(1 / 60);
    expect(damage).toBeGreaterThan(0);
  });

  it('死亡后不再触发攻击', () => {
    let damage = 0;
    const { enemy, player } = buildEnemy([0, 0, 0]);
    enemy.onAttackPlayer(d => { damage += d; });

    // 敌人死亡
    enemy.health.takeDamage(100);
    const prevDamage = damage;

    player.position[0] = 0.5;
    player.position[2] = 0;
    for (let i = 0; i < 120; i++) enemy.update(1 / 60);
    expect(damage).toBe(prevDamage);
  });
});

// ── 5. 长期运行稳定性 ────────────────────────────────────────────────

describe('Enemy 300 帧稳定性', () => {
  it('patrol 状态 300 帧无 NaN', () => {
    const { enemy } = buildEnemy();
    for (let i = 0; i < 300; i++) enemy.update(1 / 60);
    expect(isNaN(enemy.node.position[0])).toBe(false);
    expect(isNaN(enemy.node.position[2])).toBe(false);
  });

  it('chase→attack 循环 300 帧不崩溃', () => {
    const { enemy, player } = buildEnemy([0, 0, 0]);
    // 玩家保持在追逐范围内
    player.position[0] = 3;
    player.position[2] = 0;
    expect(() => {
      for (let i = 0; i < 300; i++) enemy.update(1 / 60);
    }).not.toThrow();
  });
});
