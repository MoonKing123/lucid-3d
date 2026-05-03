/**
 * full-game.test.ts — M6.5 端到端 30s 压力测试
 * headless 运行 1800 帧（30s @ 60FPS），验证所有子系统稳定协作。
 *
 * 验证目标：
 * - 1800 帧无崩溃无异常
 * - 模拟玩家行为（WASD + 攻击 + 横移 + Esc 菜单）
 * - 至少 1 个 Enemy 死亡（近战命中）
 * - drawCallCount ≤ 60（节点无泄漏）
 * - frameCount / 60 ≈ 30s（时间累积验证）
 * - EventEmitter listener 数量稳定（无泄漏）
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';

const DT           = 1 / 60;
const TOTAL_FRAMES = 1800; // 30 秒 @ 60 FPS

// ── 1. 1800 帧压力测试 ────────────────────────────────────────────────

describe('M6.5 — 1800 帧全量压力测试', () => {
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

  it('1800 帧执行时间 < 15 秒', () => {
    const game = new Game({ headless: true });
    const t0 = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    expect(Date.now() - t0).toBeLessThan(15_000);
  });

  it('frameCount / 60 ≈ 30s（时间累积验证）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);
    // frameCount * DT ≈ 30s（等效 mixer.timeAccumulated）
    expect(game.frameCount * DT).toBeCloseTo(30, 0);
  });
});

// ── 2. 模拟玩家行为 ───────────────────────────────────────────────────

describe('M6.5 — 模拟玩家行为 1800 帧', () => {
  it('随机 WASD 移动 + 周期性 attack + 偶尔 strafe + 5s 处 Esc 菜单不崩溃', () => {
    const game = new Game({ headless: true });
    const wasdKeys = ['w', 'a', 's', 'd'];

    expect(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        // 5s 处（帧 300）打开 Esc 菜单
        if (i === 300) {
          game.handleKey('Escape');
        }
        // 10s 处（帧 600）关闭 Esc 菜单
        if (i === 600) {
          game.handleKey('Escape');
        }

        // 每 90 帧随机切换 WASD 方向
        if (i % 90 === 0) {
          for (const k of wasdKeys) game.releaseKey(k);
          const key = wasdKeys[Math.floor((i / 90) % wasdKeys.length)];
          game.simulateKey(key);
        }

        // 偶尔横移（每 150 帧切换 A/D）
        if (i % 150 === 0) {
          game.simulateKey(i % 300 === 0 ? 'a' : 'd');
        }

        // 每 40 帧触发一次近战攻击
        if (i % 40 === 0) {
          game.simulateKey('f');
        } else if (i % 40 === 1) {
          game.releaseKey('f');
        }

        game.update(DT);
      }
    }).not.toThrow();

    expect(game.frameCount).toBe(TOTAL_FRAMES);
  });

  it('1800 帧后 player 位置无 NaN', () => {
    const game = new Game({ headless: true });
    game.simulateKey('w');
    game.simulateKey('a');
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    const pos = game.player.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('Esc 菜单开关后游戏继续正常运行', () => {
    const game = new Game({ headless: true });

    // 运行 300 帧后打开 Esc 菜单
    for (let i = 0; i < 300; i++) game.update(DT);
    game.handleKey('Escape');
    expect(game.settingsMenu.visible).toBe(true);

    // 继续运行 300 帧
    expect(() => {
      for (let i = 0; i < 300; i++) game.update(DT);
    }).not.toThrow();

    // 关闭菜单，再运行 300 帧
    game.handleKey('Escape');
    expect(game.settingsMenu.visible).toBe(false);

    expect(() => {
      for (let i = 0; i < 300; i++) game.update(DT);
    }).not.toThrow();
  });
});

// ── 3. 至少 1 个 Enemy 死亡 ───────────────────────────────────────────

describe('M6.5 — Enemy 死亡验证', () => {
  it('近战命中：hitCount > 0', () => {
    const game = new Game({ headless: true });
    // 先稳定 5 帧
    for (let i = 0; i < 5; i++) game.update(DT);

    // 定位玩家到 enemy[4] 正前方 1.2m
    const target = game.enemies[4];
    game.player.node.position[0] = target.node.position[0];
    game.player.node.position[2] = target.node.position[2] - 1.2;

    // 触发近战
    game.simulateKey('f');
    game.update(DT);
    game.releaseKey('f');

    // 等待攻击完成
    for (let i = 0; i < 40; i++) game.update(DT);

    expect(game.combat.hitCount).toBeGreaterThan(0);
  });

  it('持续近战后至少 1 个 Enemy 死亡', () => {
    const game = new Game({ headless: true });
    // 先稳定 5 帧
    for (let i = 0; i < 5; i++) game.update(DT);

    // 定位玩家到 enemy[4] 正前方 1.2m（每帧跟随目标）
    const target = game.enemies[4];

    let killed = false;
    for (let i = 0; i < 300 && !killed; i++) {
      // 每帧保持玩家在目标正前方（forward = +Z 方向，enemy 在 player.z + 1.2）
      if (!target.isDead) {
        game.player.node.position[0] = target.node.position[0];
        game.player.node.position[2] = target.node.position[2] - 1.2;
      }

      // 每 35 帧触发一次近战（cooldown = 30 帧，留 5 帧余量）
      if (i % 35 === 0) {
        game.simulateKey('f');
      } else if (i % 35 === 1) {
        game.releaseKey('f');
      }

      game.update(DT);

      if (target.isDead) killed = true;
    }

    expect(killed).toBe(true);
    expect(game.enemyManager.deadCount).toBeGreaterThanOrEqual(1);
  });

  it('1800 帧后所有 Enemy 位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    for (const enemy of game.enemies) {
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

// ── 4. 射箭系统 ──────────────────────────────────────────────────────

describe('M6.5 — 射箭系统', () => {
  it('triggerBowShoot 后 combat.bowActive 变为 true', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(DT);

    game.triggerBowShoot();
    game.update(DT);

    expect(game.combat.bowActive).toBe(true);
  });

  it('射箭后 1.2s 弓箭飞行完毕 bowActive 恢复 false', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(DT);

    game.triggerBowShoot();
    // BOW_FLIGHT_T = 1.2s = 72 帧 + 余量
    for (let i = 0; i < 90; i++) game.update(DT);

    expect(game.combat.bowActive).toBe(false);
  });

  it('弓箭飞行过程中 bowActive 保持 true', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(DT);

    game.triggerBowShoot();
    game.update(DT);

    // 在飞行中途（第 36 帧）检查
    let activeDuringFlight = game.combat.bowActive;
    for (let i = 0; i < 36; i++) {
      game.update(DT);
      activeDuringFlight = activeDuringFlight && game.combat.bowActive;
    }

    expect(activeDuringFlight).toBe(true);
  });
});

// ── 5. EventEmitter listener 无泄漏 ─────────────────────────────────

describe('M6.5 — EventEmitter listener 无泄漏', () => {
  it('Enemy health listener 初始数量 ≤ 5（每个 enemy 固定绑定）', () => {
    const game = new Game({ headless: true });

    for (const enemy of game.enemies) {
      const diedCount    = enemy.health.listenerCount('health.died');
      const changedCount = enemy.health.listenerCount('health.changed');
      // 构造函数中只注册了 1 个 died 监听器
      expect(diedCount).toBeLessThanOrEqual(5);
      expect(changedCount).toBeLessThanOrEqual(5);
    }
  });

  it('1800 帧后 Enemy health listener 数量与初始相同（无泄漏）', () => {
    const game = new Game({ headless: true });

    // 记录初始 listener 数
    const initialCounts = game.enemies.map(e => ({
      died:    e.health.listenerCount('health.died'),
      changed: e.health.listenerCount('health.changed'),
    }));

    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    // 验证 listener 数量不变
    for (let idx = 0; idx < game.enemies.length; idx++) {
      const enemy = game.enemies[idx];
      expect(enemy.health.listenerCount('health.died'))
        .toBe(initialCounts[idx].died);
      expect(enemy.health.listenerCount('health.changed'))
        .toBe(initialCounts[idx].changed);
    }
  });

  it('所有 Enemy health listener 总数 ≤ 50（无泄漏上限）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < TOTAL_FRAMES; i++) game.update(DT);

    let total = 0;
    for (const enemy of game.enemies) {
      total += enemy.health.listenerCount('health.died');
      total += enemy.health.listenerCount('health.changed');
    }
    expect(total).toBeLessThanOrEqual(50);
  });
});

// ── 6. 性能指标 ────────────────────────────────────────────────────

describe('M6.5 — 性能指标', () => {
  it('drawCallCount ≤ 60（headless 节点计数预算）', () => {
    const game = new Game({ headless: true });
    expect(game.drawCallCount).toBeLessThanOrEqual(60);
  });

  it('Enemy 总数符合场景配置（不超过 10）', () => {
    const game = new Game({ headless: true });
    expect(game.enemies.length).toBeLessThanOrEqual(10);
  });

  it('HUD skillSlots 数量为 5', () => {
    const game = new Game({ headless: true });
    expect(game.hud.skillSlots.length).toBe(5);
  });

  it('背包 slot 数量为 16（4×4）', () => {
    const game = new Game({ headless: true });
    expect(game.inventory.slots.length).toBe(16);
  });
});

// ── 7. 分阶段行为验证 ────────────────────────────────────────────────

describe('M6.5 — 分阶段行为验证', () => {
  it('阶段1（0-5s）：Enemy patrol 状态有位置变化', () => {
    const game = new Game({ headless: true });
    const initPositions = game.enemies.map(e => ({
      x: e.node.position[0],
      z: e.node.position[2],
    }));

    for (let i = 0; i < 300; i++) game.update(DT);

    const movedCount = game.enemies.filter((e, idx) => {
      const dx = Math.abs(e.node.position[0] - initPositions[idx].x);
      const dz = Math.abs(e.node.position[2] - initPositions[idx].z);
      return dx + dz > 0.01;
    }).length;

    expect(movedCount).toBeGreaterThan(0);
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

  it('阶段3（15-25s）：连续攻击 600 帧不崩溃', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 900; i++) game.update(DT);

    game.simulateKey('f');
    expect(() => {
      for (let i = 0; i < 600; i++) {
        if (i % 60 === 0) game.applyMouseDelta(200, 0);
        if (i % 40 === 0) game.simulateKey('f');
        if (i % 40 === 1) game.releaseKey('f');
        game.update(DT);
      }
    }).not.toThrow();
    game.releaseKey('f');
  });

  it('阶段4（25-30s）：Esc 菜单 + 背包交替操作后继续运行至 1800 帧', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 1500; i++) game.update(DT);

    // 打开 Esc 菜单
    game.handleKey('Escape');
    expect(game.settingsMenu.visible).toBe(true);

    // 打开背包
    game.handleKey('I');
    expect(game.inventory.visible).toBe(true);

    expect(() => {
      for (let i = 0; i < 300; i++) game.update(DT);
    }).not.toThrow();

    expect(game.frameCount).toBe(1800);
  });
});
