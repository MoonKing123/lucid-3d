/**
 * Full game flow 集成测试 — Issue #215
 *
 * 验证 SceneManager 场景切换、玩家血量/分数逻辑、死亡重生、60 帧稳定运行。
 */
import { describe, it, expect } from 'vitest';
import { SceneManager } from '../../../../src/core/scene-manager';
import { Node3D } from '../../../../src/core/node3d';
import { MenuScene } from '../../src/scenes/menu-scene';
import { RunnerScene } from '../../src/scenes/runner-scene';

describe('Full game flow', () => {
  it('SceneManager 注册 menu + runner 并能切换', () => {
    const sm = new SceneManager();
    sm.register(new MenuScene());
    sm.register(new RunnerScene());
    sm.loadScene('menu');
    expect(sm.activeScene?.name).toBe('menu');
    sm.loadScene('runner');
    expect(sm.activeScene?.name).toBe('runner');
  });

  it('玩家撞到障碍物扣血', () => {
    const runner = new RunnerScene();
    runner.init(new Node3D());
    const initialHealth = runner.health;
    // 模拟一次障碍物碰撞事件
    runner.handleObstacleHit();
    // 检查 health 减少
    expect(runner.health).toBeLessThan(initialHealth);
  });

  it('血量归零触发 onDeath，位置重置', () => {
    const runner = new RunnerScene();
    runner.init(new Node3D());
    runner.player.node.position[2] = 50;
    runner.health = 0;
    runner.update(1 / 60);
    // 检查 health 重置、位置重置
    expect(runner.health).toBeGreaterThan(0);
    expect(runner.player.node.position[2]).toBeLessThan(5);
  });

  it('收集金币加分', () => {
    const runner = new RunnerScene();
    runner.init(new Node3D());
    const score0 = runner.score;
    // 触发金币收集事件（无具体金币 handle 的测试用法）
    runner.handleCoinCollect();
    expect(runner.score).toBeGreaterThan(score0);
  });

  it('完整游戏循环 60 帧不抛异常', () => {
    const sm = new SceneManager();
    sm.register(new MenuScene());
    sm.register(new RunnerScene());
    sm.loadScene('runner');
    expect(() => {
      for (let i = 0; i < 60; i++) sm.activeScene?.update?.(1 / 60);
    }).not.toThrow();
  });
});
