import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';

describe('M2 压力测试 — 30 秒 1800 帧', () => {
  it('完整游戏循环 1800 帧不崩溃（默认场景，自动放置 4 座塔）', () => {
    const game = new Game({ headless: true });
    game.start();
    // 自动放置 4 座 arrow 塔（在 path 旁边）
    game.towerManager.place(2, 4, 'arrow');
    game.towerManager.place(2, 7, 'arrow');
    game.towerManager.place(6, 4, 'cannon');
    game.towerManager.place(6, 7, 'cannon');

    expect(() => {
      for (let i = 0; i < 1800; i++) game.update(1 / 60);
    }).not.toThrow();
  });

  it('1800 帧后 HUD 状态合理', () => {
    const game = new Game({ headless: true });
    game.start();
    game.towerManager.place(2, 4, 'arrow');
    for (let i = 0; i < 1800; i++) game.update(1 / 60);
    // 30 秒后至少 1 个波次推进
    expect(game.hud.wave).toBeGreaterThan(0);
  });

  it('1800 帧无 console.error 输出', () => {
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
      const game = new Game({ headless: true });
      game.start();
      for (let i = 0; i < 1800; i++) game.update(1 / 60);
    } finally {
      console.error = origError;
    }
    expect(errors).toEqual([]);
  });

  it('内存使用稳定（无明显泄漏）', () => {
    const m0 = process.memoryUsage().heapUsed;
    const game = new Game({ headless: true });
    game.start();
    for (let i = 0; i < 1800; i++) game.update(1 / 60);
    if (global.gc) global.gc();
    const m1 = process.memoryUsage().heapUsed;
    expect(m1 - m0).toBeLessThan(50 * 1024 * 1024);
  });
});
