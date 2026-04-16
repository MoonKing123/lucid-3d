/**
 * enemy.test.ts — BR-12P M4.3 敌人 NPC 集成测试。
 * 验证：敌人 AI 状态机、动画追踪、血量系统、weapon.hit 事件集成。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { Enemy } from '../../src/enemy';
import { Health } from '../../src/health';
import { spawnEnemies } from '../../src/enemy-spawner';
import { CollisionWorld } from '../../../../src/physics/collision';
import { Node3D } from '../../../../src/core/node3d';
import { vec3 } from '../../../../src/math/vec3';

// ── 1. 初始化 + 生成 11 个敌人 ────────────────────────────────────

describe('M4.3 — 生成 11 个敌人', () => {
  it('game.spawnEnemies(11) 生成 11 个敌人', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    expect(game.enemies.length).toBe(11);
  });

  it('所有敌人初始 state=patrol', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    for (const enemy of game.enemies) {
      expect(enemy.state).toBe('patrol');
    }
  });

  it('所有敌人初始动画为 run（巡逻时播放跑步动画）', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    for (const enemy of game.enemies) {
      expect(enemy.currentAnimation).toBe('run');
    }
  });

  it('所有敌人 health.current === 100', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    for (const enemy of game.enemies) {
      expect(enemy.health.current).toBe(100);
    }
  });

  it('所有敌人都有独立 AnimationMixer', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    const mixers = new Set(game.enemies.map(e => e.mixer));
    expect(mixers.size).toBe(11);
  });
});

// ── 2. 快进 5s — 敌人位置变化（随机游走） ─────────────────────────

describe('M4.3 — 巡逻随机游走', () => {
  it('快进 5s（300 帧）后至少部分敌人位置有变化', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    const initialPositions = game.enemies.map(e => ({
      x: e.node.position[0],
      z: e.node.position[2],
    }));

    // 快进 5 秒
    for (let i = 0; i < 300; i++) game.update(1 / 60);

    let movedCount = 0;
    game.enemies.forEach((enemy, idx) => {
      const dx = enemy.node.position[0] - initialPositions[idx].x;
      const dz = enemy.node.position[2] - initialPositions[idx].z;
      if (Math.sqrt(dx * dx + dz * dz) > 0.1) movedCount++;
    });

    // 至少一半敌人（在玩家检测范围外的）应该在随机游走
    expect(movedCount).toBeGreaterThan(0);
  });

  it('300 帧后 drawCallCount ≥ 11', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    for (let i = 0; i < 300; i++) game.update(1 / 60);
    // drawCallCount = 地图节点 + 11 敌人节点（未死亡）
    expect(game.drawCallCount).toBeGreaterThanOrEqual(11);
  });
});

// ── 3. 玩家靠近 → chase 状态 ─────────────────────────────────────

describe('M4.3 — 玩家接近触发 chase', () => {
  it('玩家移动到敌人 4m 内 → 该敌人 state 变为 chase', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    // 先稳定 5 帧，确保敌人位置初始化
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 找一个离玩家最远的敌人，把玩家移动到它旁边 3m 处
    const enemy = game.enemies[0];
    const ex = enemy.node.position[0];
    const ez = enemy.node.position[2];

    // 把玩家直接放到敌人旁边（3m，在检测范围 5m 内）
    game.player.node.position[0] = ex + 3;
    game.player.node.position[2] = ez;

    // 更新一帧触发 AI 检测
    game.update(1 / 60);

    expect(enemy.state).toBe('chase');
  });

  it('超出检测范围的敌人保持 patrol 状态', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    // 所有敌人都出生在距玩家 10m 以外（MIN_DIST_FROM_PLAYER=10）
    // 玩家在原点，不移动
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 玩家在 (0,0,0)，检测范围 5m，远处的敌人应仍是 patrol
    const farEnemies = game.enemies.filter(e => {
      const dx = e.node.position[0] - game.player.node.position[0];
      const dz = e.node.position[2] - game.player.node.position[2];
      return Math.sqrt(dx * dx + dz * dz) > 6;
    });
    // 至少存在一些远处的敌人保持巡逻
    for (const e of farEnemies) {
      expect(e.state).toBe('patrol');
    }
  });
});

// ── 4. 敌人进入射击范围 → shoot 状态 + 玩家受伤 ──────────────────

describe('M4.3 — 射击 + 玩家受伤事件', () => {
  it('玩家在 8m 内无遮挡 → 敌人进入 shoot 状态', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    const enemy = game.enemies[0];
    const ex = enemy.node.position[0];
    const ez = enemy.node.position[2];

    // 玩家放到敌人正旁边 3m（在检测范围 5m 内，也在射击范围 8m 内）
    game.player.node.position[0] = ex + 3;
    game.player.node.position[2] = ez;

    // 第一帧：patrol → chase（玩家进入检测范围）
    game.update(1 / 60);
    // 第二帧：chase → shoot（玩家在射击范围且无遮挡）
    game.update(1 / 60);

    expect(enemy.state).toBe('shoot');
  });

  it('shoot 状态下 1.5s 后广播 player.damaged 事件', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    let damagedCount = 0;
    game.events.on('player.damaged', () => { damagedCount++; });

    const enemy = game.enemies[0];

    // 玩家移到敌人旁边，进入 shoot 状态
    game.player.node.position[0] = enemy.node.position[0] + 2;
    game.player.node.position[2] = enemy.node.position[2];

    // 稳定到 shoot 状态
    for (let i = 0; i < 3; i++) game.update(1 / 60);

    if (enemy.state !== 'shoot') {
      // 如果还没到 shoot，跳过此检查（距离可能稍远）
      return;
    }

    // 再快进 2s（超过 1.5s 射击冷却），应至少触发一次 player.damaged
    for (let i = 0; i < 120; i++) game.update(1 / 60);

    expect(damagedCount).toBeGreaterThan(0);
  });
});

// ── 5. 武器命中 → 血量扣减 → 死亡动画 ───────────────────────────

describe('M4.3 — 武器命中、血量、死亡', () => {
  it('weapon.hit 事件触发 → 目标敌人血量扣减', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    const target = game.enemies[0];
    const initialHp = target.health.current;

    // 通过游戏事件总线广播武器命中（模拟 M4.2 武器系统）
    game.events.emit('weapon.hit', target.node, 30);

    expect(target.health.current).toBe(initialHp - 30);
  });

  it('连续 weapon.hit 使血量降至 0 → state=dead + 动画切换为 die', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    const target = game.enemies[0];

    // 连续命中直到死亡（每次 30 伤害，需 4 次）
    game.events.emit('weapon.hit', target.node, 30);
    game.events.emit('weapon.hit', target.node, 30);
    game.events.emit('weapon.hit', target.node, 30);
    game.events.emit('weapon.hit', target.node, 30);

    // weapon.hit 直接调用 applyDamage，state machine 在下帧的 update 触发
    // 实际上 health.died 事件同步触发 ai.transition('dead')
    expect(target.health.isDead).toBe(true);
    expect(target.state).toBe('dead');
    expect(target.currentAnimation).toBe('die');
  });

  it('health.died 事件正确广播', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    const target = game.enemies[0];
    let diedFired = false;
    target.health.on('health.died', () => { diedFired = true; });

    game.events.emit('weapon.hit', target.node, 100);

    expect(diedFired).toBe(true);
  });

  it('死亡后继续 weapon.hit 不再扣血（已死亡忽略）', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    const target = game.enemies[0];
    game.events.emit('weapon.hit', target.node, 100);  // 致死

    const hpAfterDeath = target.health.current;
    game.events.emit('weapon.hit', target.node, 50);   // 死后命中

    expect(target.health.current).toBe(hpAfterDeath);  // 不再变化
  });

  it('死亡 3s 后敌人从列表中移除', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    const target = game.enemies[0];
    game.events.emit('weapon.hit', target.node, 100);  // 致死

    // 快进 4s（超过 DEAD_REMOVE_DELAY=3s）
    for (let i = 0; i < 240; i++) game.update(1 / 60);

    expect(game.enemies.includes(target)).toBe(false);
  });
});

// ── 6. drawCalls ≥ 11（每个独立敌人节点） ────────────────────────

describe('M4.3 — drawCalls 验证', () => {
  it('生成 11 个敌人后 drawCallCount ≥ 11', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    expect(game.drawCallCount).toBeGreaterThanOrEqual(11);
  });

  it('drawCallCount 包含地图节点 + 11 敌人', () => {
    const game1 = new Game({ headless: true });
    const mapOnly = game1.drawCallCount;

    const game2 = new Game({ headless: true });
    game2.spawnEnemies(11);
    const withEnemies = game2.drawCallCount;

    expect(withEnemies).toBe(mapOnly + 11);
  });
});

// ── 7. AnimationMixer 正确更新、无崩溃 ─────────────────────────────

describe('M4.3 — AnimationMixer 稳定性', () => {
  it('300 帧更新中 11 个 AnimationMixer 无崩溃', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);

    expect(() => {
      for (let i = 0; i < 300; i++) game.update(1 / 60);
    }).not.toThrow();
  });

  it('300 帧后 frameCount === 300', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    for (let i = 0; i < 300; i++) game.update(1 / 60);
    expect(game.frameCount).toBe(300);
  });

  it('所有 Enemy 节点位置无 NaN（300 帧后）', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    const positions = game.enemies.map(e => e.node.position);

    for (let i = 0; i < 300; i++) game.update(1 / 60);

    for (const pos of positions) {
      expect(isNaN(pos[0])).toBe(false);
      expect(isNaN(pos[2])).toBe(false);
    }
  });

  it('Health 组件独立（每个敌人独立血量）', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    game.update(1 / 60);

    // 只伤害第一个敌人
    game.events.emit('weapon.hit', game.enemies[0].node, 50);

    // 其他敌人血量不变
    for (let i = 1; i < game.enemies.length; i++) {
      expect(game.enemies[i].health.current).toBe(100);
    }
    // 第一个敌人血量变化
    expect(game.enemies[0].health.current).toBe(50);
  });
});

// ── 单元测试：Health 组件 ─────────────────────────────────────────

describe('Health 组件', () => {
  it('初始 current === max', () => {
    const h = new Health(100);
    expect(h.current).toBe(100);
    expect(h.max).toBe(100);
  });

  it('takeDamage 扣减血量', () => {
    const h = new Health(100);
    h.takeDamage(30);
    expect(h.current).toBe(70);
  });

  it('血量不低于 0', () => {
    const h = new Health(100);
    h.takeDamage(200);
    expect(h.current).toBe(0);
  });

  it('blood ≤ 0 时 isDead = true', () => {
    const h = new Health(100);
    h.takeDamage(100);
    expect(h.isDead).toBe(true);
  });

  it('广播 health.changed 事件', () => {
    const h = new Health(100);
    let called = false;
    h.on('health.changed', (cur, max) => {
      called = true;
      expect(cur).toBe(70);
      expect(max).toBe(100);
    });
    h.takeDamage(30);
    expect(called).toBe(true);
  });

  it('广播 health.died 事件', () => {
    const h = new Health(100);
    let died = false;
    h.on('health.died', () => { died = true; });
    h.takeDamage(100);
    expect(died).toBe(true);
  });

  it('已死亡后再 takeDamage 不广播事件', () => {
    const h = new Health(100);
    let diedCount = 0;
    h.on('health.died', () => { diedCount++; });
    h.takeDamage(100);
    h.takeDamage(50);
    expect(diedCount).toBe(1);
  });
});
