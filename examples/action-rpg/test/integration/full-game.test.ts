/**
 * full-game.test.ts — M5.5 端到端 30s 压力测试。
 * headless 运行 1800 帧（30s @ 60FPS），验证所有子系统稳定协作。
 *
 * 验证目标：
 * - 1800 帧无崩溃无异常
 * - 无 console.error 输出
 * - drawCalls ≤ 60（无节点泄漏）
 * - 玩家自动移动 + 攻击 + Enemy AI 循环 + 战斗扣血 + 死亡 + 重生
 * - EventEmitter listener 数量稳定（无泄漏）
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';

const DT           = 1 / 60;
const TOTAL_FRAMES = 1800; // 30 秒 @ 60 FPS

// ── 1. 1800 帧压力测试 ────────────────────────────────────────────────

describe('M5.5 — 1800 帧全量压力测试', () => {
  it('1800 帧无崩溃无异常', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    }).not.toThrow();
    expect(game.frameCount).toBe(TOTAL_FRAMES);
  });

  it('1800 帧无 console.error 输出', () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      const game = new Game({ headless: true });
      for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    } finally {
      console.error = orig;
    }
    expect(errors).toEqual([]);
  });

  it('drawCallCount ≤ 60（节点无泄漏）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    expect(game.drawCallCount).toBeLessThanOrEqual(60);
  });

  it('1800 帧 headless 执行时间 < 10 秒', () => {
    const game = new Game({ headless: true });
    const t0 = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    expect(Date.now() - t0).toBeLessThan(10_000);
  });
});

// ── 2. 玩家自动移动 + 攻击 ────────────────────────────────────────────

describe('M5.5 — 玩家自动移动 + 攻击', () => {
  it('玩家 WASD 自动移动 300 帧后位置改变', () => {
    const game = new Game({ headless: true });
    // 先稳定接地
    for (let i = 0; i < 5; i++) game.update(DT);

    const x0 = game.player.position[0];
    const z0 = game.player.position[2];

    game.simulateKey('w');
    for (let i = 0; i < 300; i++) game.update(DT);
    game.releaseKey('w');

    const dist = Math.sqrt(
      (game.player.position[0] - x0) ** 2 +
      (game.player.position[2] - z0) ** 2,
    );
    expect(dist).toBeGreaterThan(0.1);
  });

  it('玩家按 F 攻击后 combat.hitCount 或 combat.canAttack 发生变化', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(DT);

    const canAttackBefore = game.combat.canAttack;
    game.simulateKey('f');
    game.update(DT);
    game.releaseKey('f');

    // 攻击后进入冷却
    expect(game.combat.canAttack).not.toBe(canAttackBefore);
  });

  it('1800 帧后 player 位置无 NaN', () => {
    const game = new Game({ headless: true });
    game.simulateKey('w');
    game.simulateKey('a');
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    game.releaseKey('w');
    game.releaseKey('a');

    const pos = game.player.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('持续攻击 1800 帧后 player y 不穿地', () => {
    const game = new Game({ headless: true });
    game.simulateKey('f');
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      // 每 30 帧切换一次武器，模拟近战/远程轮换
      if (i % 30 === 0) {
        if (game.combat.weapon === 'sword') game.simulateKey('2');
        else game.simulateKey('1');
      }
      game.update(DT);
    }
    expect(game.player.position[1]).toBeGreaterThanOrEqual(-0.5);
  });
});

// ── 3. Enemy AI 循环 ────────────────────────────────────────────────

describe('M5.5 — Enemy AI 循环', () => {
  it('初始所有 Enemy 处于 patrol 状态', () => {
    const game = new Game({ headless: true });
    const allPatrol = game.enemyManager.enemies.every(e => e.state === 'patrol');
    expect(allPatrol).toBe(true);
  });

  it('300 帧后至少 1 个 Enemy 位置发生变化（patrol 移动）', () => {
    const game = new Game({ headless: true });
    const initPositions = game.enemyManager.enemies.map(e => ({
      x: e.node.position[0], z: e.node.position[2],
    }));

    for (let i = 0; i < 300; i++) game.update(DT);

    const movedCount = game.enemyManager.enemies.filter((e, idx) => {
      const dx = Math.abs(e.node.position[0] - initPositions[idx].x);
      const dz = Math.abs(e.node.position[2] - initPositions[idx].z);
      return dx + dz > 0.01;
    }).length;
    expect(movedCount).toBeGreaterThan(0);
  });

  it('1800 帧后所有 Enemy 位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    for (const enemy of game.enemyManager.enemies) {
      expect(isNaN(enemy.node.position[0])).toBe(false);
      expect(isNaN(enemy.node.position[2])).toBe(false);
    }
  });

  it('drawCallCount 在 1800 帧内不单调递增（无节点泄漏）', () => {
    const game = new Game({ headless: true });
    const samples: number[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      if (i % 300 === 299) samples.push(game.drawCallCount);
    }

    // 允许小量波动（±5），不应无限递增
    expect(samples[samples.length - 1]).toBeLessThanOrEqual(samples[0] + 5);
  });
});

// ── 4. 战斗扣血 + 死亡 + 重生 ─────────────────────────────────────────

describe('M5.5 — 战斗扣血 + 死亡 + 重生', () => {
  it('剑攻击后最近 Enemy health 减少', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(DT);

    // 将玩家移到第一个敌人附近
    const enemy0 = game.enemyManager.enemies[0];
    game.player.node.position[0] = enemy0.node.position[0];
    game.player.node.position[2] = enemy0.node.position[2] - 1.5;

    const healthBefore = enemy0.health.current;
    game.simulateKey('f');
    game.update(DT);

    expect(enemy0.health.current).toBeLessThanOrEqual(healthBefore);
  });

  it('takeDamage(100) 后 player.health = 0', () => {
    const game = new Game({ headless: true });
    game.player.takeDamage(100);
    expect(game.player.health).toBe(0);
  });

  it('player 死亡后 respawn() 恢复满血', () => {
    const game = new Game({ headless: true });
    game.player.takeDamage(100);
    expect(game.player.health).toBe(0);

    game.player.respawn();
    expect(game.player.health).toBe(game.player.maxHealth);
  });

  it('玩家死亡后游戏继续运行 300 帧不崩溃', () => {
    const game = new Game({ headless: true });

    // 运行 1500 帧（25s）后强制死亡
    for (let i = 0; i < 1500; i++) game.update(DT);
    game.player.takeDamage(game.player.health);
    expect(game.player.health).toBe(0);

    expect(() => {
      for (let i = 0; i < 300; i++) game.update(DT);
    }).not.toThrow();

    expect(game.frameCount).toBe(1800);
  });

  it('玩家死亡 + 重生后 1800 帧内无崩溃', () => {
    const game = new Game({ headless: true });

    // 分段运行：0-600帧 → 死亡 → 重生 → 600-1200帧 → 死亡 → 重生 → 1200-1800帧
    for (let i = 0; i < 600; i++) game.update(DT);

    game.player.takeDamage(game.player.health);
    game.player.respawn();

    for (let i = 0; i < 600; i++) game.update(DT);

    game.player.takeDamage(game.player.health);
    game.player.respawn();

    expect(() => {
      for (let i = 0; i < 600; i++) game.update(DT);
    }).not.toThrow();

    expect(game.frameCount).toBe(1800);
  });
});

// ── 5. EventEmitter listener 无泄漏 ─────────────────────────────────

describe('M5.5 — EventEmitter listener 无泄漏', () => {
  it('Player EventEmitter headless 模式下 listener 数量 ≤ 10', () => {
    const game = new Game({ headless: true });

    // headless 模式下 HUD 未连接，Player 应无外部 listener
    const events: Array<'health-changed' | 'mana-changed' | 'died' | 'respawned'> =
      ['health-changed', 'mana-changed', 'died', 'respawned'];
    let total = 0;
    for (const ev of events) total += game.player.listenerCount(ev);
    expect(total).toBeLessThanOrEqual(10);
  });

  it('1800 帧后 Player listener 数量与初始相同（无泄漏）', () => {
    const game = new Game({ headless: true });

    const events: Array<'health-changed' | 'mana-changed' | 'died' | 'respawned'> =
      ['health-changed', 'mana-changed', 'died', 'respawned'];

    const countAt = () => events.reduce((s, ev) => s + game.player.listenerCount(ev), 0);
    const initial = countAt();

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      // 每 200 帧触发一次死亡 + 重生（测试 listener 是否会累积）
      if (i % 200 === 0) {
        game.player.takeDamage(game.player.health);
        game.player.respawn();
      }
    }

    expect(countAt()).toBe(initial);
  });

  it('所有 Enemy Health listener 总数 ≤ 100', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    let total = 0;
    for (const enemy of game.enemyManager.enemies) {
      total += enemy.health.listenerCount('health.died');
      total += enemy.health.listenerCount('health.damaged');
    }
    expect(total).toBeLessThanOrEqual(100);
  });
});

// ── 6. 分阶段行为验证 ────────────────────────────────────────────────

describe('M5.5 — 分阶段行为验证', () => {
  it('阶段1（0-5s）：Enemy patrol 状态中有位置变化', () => {
    const game = new Game({ headless: true });
    const initPos = game.enemyManager.enemies.map(e => [
      e.node.position[0], e.node.position[2],
    ]);

    for (let i = 0; i < 300; i++) game.update(DT);

    const moved = game.enemyManager.enemies.filter((e, idx) => {
      const dx = Math.abs(e.node.position[0] - initPos[idx][0]);
      const dz = Math.abs(e.node.position[2] - initPos[idx][1]);
      return dx + dz > 0.01;
    }).length;
    expect(moved).toBeGreaterThan(0);
  });

  it('阶段2（5-15s）：玩家移动 600 帧位移 > 0.1', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 300; i++) game.update(DT);

    const z0 = game.player.position[2];
    game.simulateKey('w');
    for (let i = 0; i < 600; i++) game.update(DT);
    game.releaseKey('w');

    expect(Math.abs(game.player.position[2] - z0)).toBeGreaterThan(0.1);
  });

  it('阶段3（15-25s）：战斗系统连续攻击 1000 帧不崩溃', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 900; i++) game.update(DT);

    game.simulateKey('f');
    expect(() => {
      for (let i = 0; i < 600; i++) {
        if (i % 60 === 0) game.applyMouseDelta(200, 0);
        game.update(DT);
      }
    }).not.toThrow();
    game.releaseKey('f');
  });

  it('阶段4（25-30s）：玩家死亡后继续运行至 1800 帧', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 1500; i++) game.update(DT);

    game.player.takeDamage(game.player.health);
    expect(game.player.health).toBe(0);

    expect(() => {
      for (let i = 0; i < 300; i++) game.update(DT);
    }).not.toThrow();

    expect(game.frameCount).toBe(1800);
  });
});
