/**
 * 集成测试 — Enemy NPC 系统 (M5.2 Issue #357)。
 *
 * 验证：
 * - 5+ Enemy NPC 并发 AI 循环 300 帧不崩溃
 * - 每个 Enemy 有独立的 AnimationMixer
 * - StateMachine 四状态正常运转
 * - NavAgent 路径合法（坐标有限值，不出现 NaN/Infinity）
 * - Health 组件 takeDamage → isDead → dead 状态转换
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Node3D } from '../../src/core/node3d';
import { NavGrid } from '../../src/navigation/nav-grid';
import { Enemy, type EnemyNavContext } from '../../examples/action-rpg/src/enemy';
import { EnemyManager } from '../../examples/action-rpg/src/enemy-manager';

// ── helpers ──────────────────────────────────────────────────────

const GRID_OFFSET = 50;
const GRID_CELLS  = 50;
const CELL_SIZE   = 2;

function buildNavContext(): EnemyNavContext {
  const grid = new NavGrid(GRID_CELLS, GRID_CELLS, CELL_SIZE);
  const worldToGrid = (wx: number, wz: number): [number, number] => [
    Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((wx + GRID_OFFSET) / CELL_SIZE))),
    Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((wz + GRID_OFFSET) / CELL_SIZE))),
  ];
  const gridToWorld = (gx: number, gz: number): [number, number] => [
    (gx + 0.5) * CELL_SIZE - GRID_OFFSET,
    (gz + 0.5) * CELL_SIZE - GRID_OFFSET,
  ];
  return { grid, worldToGrid, gridToWorld };
}

function makePlayer(x = 0, z = 0): Node3D {
  const p = new Node3D('player');
  p.position[0] = x;
  p.position[2] = z;
  return p;
}

const DT = 1 / 60;

// ── 基本构造 ─────────────────────────────────────────────────────

describe('Enemy — 基本构造', () => {
  it('初始状态为 patrol', () => {
    const player = makePlayer();
    const nav    = buildNavContext();
    const enemy  = new Enemy([10, 0, 10], nav, player);
    expect(enemy.state).toBe('patrol');
  });

  it('初始 Health = 100，不死亡', () => {
    const player = makePlayer();
    const nav    = buildNavContext();
    const enemy  = new Enemy([10, 0, 10], nav, player);
    expect(enemy.health.current).toBe(100);
    expect(enemy.isDead).toBe(false);
  });

  it('每个 Enemy 有独立的 AnimationMixer 实例', () => {
    const player = makePlayer();
    const nav    = buildNavContext();
    const e1 = new Enemy([-20, 0, -20], nav, player);
    const e2 = new Enemy([ 20, 0,  20], nav, player);
    expect(e1.mixer).not.toBe(e2.mixer);
  });
});

// ── StateMachine 状态转换 ─────────────────────────────────────────

describe('Enemy — StateMachine 状态转换', () => {
  it('玩家进入 aggroRange(10m) → patrol → chase', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    // enemy 在 (8, 0, 0)，距离 8 < 10 → 立即 patrol→chase
    const enemy  = new Enemy([8, 0, 0], nav, player, { aggroRange: 10 });
    enemy.update(DT);
    expect(enemy.state).toBe('chase');
  });

  it('玩家超出 loseSightRange(20m) → chase → patrol', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    // 先让 enemy 进入 chase（enemy 在 (8,0,0)，dist=8 < aggroRange=10）
    const enemy  = new Enemy([8, 0, 0], nav, player, { aggroRange: 10, loseSightRange: 20 });
    enemy.update(DT); // patrol → chase
    expect(enemy.state).toBe('chase');

    // 把玩家移到 30m 外（dist = 30-8 = 22 > loseSightRange=20）
    player.position[0] = 30;
    enemy.update(DT);
    expect(enemy.state).toBe('patrol');
  });

  it('玩家进入 attackRange(2m) → chase → attack', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    const enemy  = new Enemy([1.5, 0, 0], nav, player, {
      aggroRange: 10,
      attackRange: 2,
    });
    // 第 1 帧：patrol → chase（dist=1.5 < aggroRange=10）
    enemy.update(DT);
    expect(enemy.state).toBe('chase');
    // 第 2 帧：chase → attack（dist=1.5 < attackRange=2）
    enemy.update(DT);
    expect(enemy.state).toBe('attack');
  });

  it('Health=0 → dead 状态（无论当前处于哪个状态）', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    const enemy  = new Enemy([30, 0, 0], nav, player); // 30m 外，patrol 状态
    enemy.update(DT);
    expect(enemy.state).toBe('patrol');

    enemy.health.takeDamage(100);
    expect(enemy.isDead).toBe(true);
    expect(enemy.state).toBe('dead');
  });

  it('dead 状态下 update 不报错，状态保持 dead', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    const enemy  = new Enemy([10, 0, 10], nav, player);
    enemy.health.takeDamage(100);
    expect(() => {
      for (let i = 0; i < 30; i++) enemy.update(DT);
    }).not.toThrow();
    expect(enemy.state).toBe('dead');
  });
});

// ── NavAgent 路径合法性 ───────────────────────────────────────────

describe('Enemy — NavAgent 路径合法', () => {
  it('update 300 帧后坐标为有限值（不出现 NaN/Infinity）', () => {
    const player = makePlayer(5, 5);
    const nav    = buildNavContext();
    const enemy  = new Enemy([-20, 0, -20], nav, player);

    for (let i = 0; i < 300; i++) {
      enemy.update(DT);
    }

    expect(isFinite(enemy.node.position[0])).toBe(true);
    expect(isFinite(enemy.node.position[2])).toBe(true);
  });

  it('chase 时 Enemy 朝玩家方向移动（100 帧后 X 缩小）', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    // enemy 在 (8,0,0)，aggroRange=10 → 第 1 帧 patrol→chase；后续持续追玩家
    const enemy  = new Enemy([8, 0, 0], nav, player, { aggroRange: 10 });

    for (let i = 0; i < 100; i++) enemy.update(DT);

    // 玩家在 (0,0)，enemy 从 (8,0,0) 追过去，X 应明显减小
    expect(enemy.node.position[0]).toBeLessThan(6);
  });
});

// ── Health + 攻击回调 ─────────────────────────────────────────────

describe('Enemy — Health 与攻击回调', () => {
  it('takeDamage 减少血量并触发 health.changed 事件', () => {
    const player = makePlayer();
    const nav    = buildNavContext();
    const enemy  = new Enemy([30, 0, 0], nav, player);

    let changedFired = false;
    enemy.health.on('health.changed', () => { changedFired = true; });
    enemy.health.takeDamage(30);

    expect(enemy.health.current).toBe(70);
    expect(changedFired).toBe(true);
  });

  it('onAttackPlayer 回调在 attack 状态下触发', () => {
    const player = makePlayer(0, 0);
    const nav    = buildNavContext();
    // enemy 紧贴玩家(距离 1m < attackRange=2) → attack
    const enemy  = new Enemy([1, 0, 0], nav, player, { aggroRange: 10, attackRange: 2, attackInterval: 0.1 });

    let hitCount = 0;
    enemy.onAttackPlayer(() => { hitCount++; });

    // 运行 1s（60 帧），attack 间隔 0.1s → 至少触发 5 次
    for (let i = 0; i < 60; i++) enemy.update(DT);
    expect(hitCount).toBeGreaterThanOrEqual(5);
  });
});

// ── 5+ NPC 并发 AI 循环 300 帧 ───────────────────────────────────

describe('EnemyManager — 5+ NPC 并发 AI 循环', () => {
  it('EnemyManager 创建 7 个 Enemy NPC', () => {
    const player  = makePlayer();
    const manager = new EnemyManager(player);
    expect(manager.enemies.length).toBe(7);
  });

  it('7 个 Enemy 并发 update 300 帧不崩溃', () => {
    const player  = makePlayer(0, 0);
    const manager = new EnemyManager(player);

    expect(() => {
      for (let frame = 0; frame < 300; frame++) {
        // 第 150 帧把玩家移到场地中心附近，触发 chase/attack 状态
        if (frame === 150) {
          player.position[0] = 5;
          player.position[2] = 5;
        }
        manager.update(DT);
      }
    }).not.toThrow();
  });

  it('300 帧后所有 Enemy 坐标为有限值', () => {
    const player  = makePlayer(0, 0);
    const manager = new EnemyManager(player);

    for (let i = 0; i < 300; i++) manager.update(DT);

    for (const enemy of manager.enemies) {
      expect(isFinite(enemy.node.position[0])).toBe(true);
      expect(isFinite(enemy.node.position[2])).toBe(true);
    }
  });

  it('每个 Enemy 的 AnimationMixer 实例各不相同', () => {
    const player  = makePlayer();
    const manager = new EnemyManager(player);
    const mixers  = manager.enemies.map(e => e.mixer);
    const unique  = new Set(mixers);
    expect(unique.size).toBe(manager.enemies.length);
  });

  it('玩家进入中心后至少 1 个 Enemy 进入 chase/attack 状态', () => {
    const player  = makePlayer(0, 0);
    const manager = new EnemyManager(player);

    // 让最近的 enemy (15,0,0) 距玩家 15m，大于 aggroRange(10)
    // 把玩家移到 (14,0,0)，距离变成 1m，触发 attack
    player.position[0] = 14;
    player.position[2] = 0;

    for (let i = 0; i < 10; i++) manager.update(DT);

    const activeCount = manager.enemies.filter(
      e => e.state === 'chase' || e.state === 'attack'
    ).length;
    expect(activeCount).toBeGreaterThanOrEqual(1);
  });

  it('对 Enemy 造成足够伤害后进入 dead 状态', () => {
    const player  = makePlayer();
    const manager = new EnemyManager(player);
    const target  = manager.enemies[0];

    target.health.takeDamage(100);
    expect(target.isDead).toBe(true);
    expect(target.state).toBe('dead');
    expect(manager.deadCount).toBeGreaterThanOrEqual(1);
  });
});
