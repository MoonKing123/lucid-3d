/**
 * M1 压力测试 — 30 秒 1800 帧
 * Issue #216：端到端验证，确保游戏循环稳定运行
 */
import { describe, it, expect } from 'vitest';
import { SceneManager } from '../../../../src/core/scene-manager';
import { RunnerScene } from '../../src/scenes/runner-scene';

describe('M1 压力测试 — 30 秒 1800 帧', () => {
  it('完整游戏循环 1800 帧不崩溃', () => {
    const sm = new SceneManager();
    sm.register(new RunnerScene());
    sm.loadScene('runner');

    expect(() => {
      for (let i = 0; i < 1800; i++) {
        sm.activeScene?.update?.(1 / 60);
      }
    }).not.toThrow();
  });

  it('1800 帧后玩家仍然存活或已重生', () => {
    const sm = new SceneManager();
    sm.register(new RunnerScene());
    sm.loadScene('runner');

    for (let i = 0; i < 1800; i++) {
      sm.activeScene?.update?.(1 / 60);
    }

    const runner = sm.activeScene as RunnerScene;
    expect(runner.health).toBeGreaterThan(0); // 重生过也算存活
  });

  it('1800 帧无 console.error 输出', () => {
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
      const sm = new SceneManager();
      sm.register(new RunnerScene());
      sm.loadScene('runner');
      for (let i = 0; i < 1800; i++) sm.activeScene?.update?.(1 / 60);
    } finally {
      console.error = origError;
    }
    expect(errors).toEqual([]);
  });

  it('内存使用稳定（无明显泄漏）', () => {
    const m0 = process.memoryUsage().heapUsed;
    const sm = new SceneManager();
    sm.register(new RunnerScene());
    sm.loadScene('runner');
    for (let i = 0; i < 1800; i++) sm.activeScene?.update?.(1 / 60);
    if (global.gc) global.gc();
    const m1 = process.memoryUsage().heapUsed;
    expect(m1 - m0).toBeLessThan(50 * 1024 * 1024);
  });
});
