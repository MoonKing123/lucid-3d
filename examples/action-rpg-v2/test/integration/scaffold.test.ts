/**
 * scaffold.test.ts — M6.1 action-rpg-v2 脚手架集成测试。
 * headless 模式：无 WebGL 渲染器，直接驱动逻辑层。
 * 验证 AnimationStateMachine 驱动 idle/run/attack 三态切换。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { AnimationStateMachine } from '../../../../src/animation/animation-state-machine';
import { FollowCamera } from '../../../../src/core/follow-camera';
import { CollisionWorld } from '../../../../src/physics/collision';

// ── 1. 场景初始化 ──────────────────────────────────────────────────

describe('action-rpg-v2 脚手架 — 场景初始化', () => {
  it('headless 模式下 Game 可正常创建', () => {
    expect(() => new Game({ headless: true })).not.toThrow();
  });

  it('headless Game 暴露 player 属性', () => {
    const game = new Game({ headless: true });
    expect(game.player).toBeDefined();
  });

  it('headless Game 暴露 camera（FollowCamera 实例）', () => {
    const game = new Game({ headless: true });
    expect(game.camera).toBeInstanceOf(FollowCamera);
  });

  it('headless Game 暴露 CollisionWorld', () => {
    const game = new Game({ headless: true });
    expect(game.world).toBeInstanceOf(CollisionWorld);
  });

  it('player 含 AnimationStateMachine', () => {
    const game = new Game({ headless: true });
    expect(game.player.stateMachine).toBeInstanceOf(AnimationStateMachine);
  });

  it('frameCount 初始为 0', () => {
    const game = new Game({ headless: true });
    expect(game.frameCount).toBe(0);
  });

  it('drawCallCount > 0（地形和角色节点存在）', () => {
    const game = new Game({ headless: true });
    expect(game.drawCallCount).toBeGreaterThan(0);
  });
});

// ── 2. 60 帧稳定运行 ────────────────────────────────────────────────

describe('action-rpg-v2 脚手架 — 60 帧稳定运行', () => {
  it('headless 连续运行 60 帧不崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    }).not.toThrow();
    expect(game.frameCount).toBe(60);
  });

  it('60 帧后 player 位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    const pos = game.player.position;
    expect(Number.isNaN(pos[0])).toBe(false);
    expect(Number.isNaN(pos[1])).toBe(false);
    expect(Number.isNaN(pos[2])).toBe(false);
  });
});

// ── 3. AnimationStateMachine 三态切换 ──────────────────────────────

describe('action-rpg-v2 — AnimationStateMachine 三态切换', () => {
  it('初始状态为 idle', () => {
    const game = new Game({ headless: true });
    expect(game.player.stateMachine.currentState).toBe('idle');
  });

  it('玩家移动后 5 帧内 StateMachine.currentState === run', () => {
    const game = new Game({ headless: true });
    // 先稳定落地
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    game.simulateKey('w');
    let becameRun = false;
    for (let i = 0; i < 5; i++) {
      game.update(1 / 60);
      if (game.player.stateMachine.currentState === 'run') {
        becameRun = true;
        break;
      }
    }
    game.releaseKey('w');
    expect(becameRun).toBe(true);
  });

  it('玩家停下后 5 帧内 StateMachine.currentState === idle', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 先移动变为 run
    game.simulateKey('w');
    for (let i = 0; i < 5; i++) game.update(1 / 60);
    expect(game.player.stateMachine.currentState).toBe('run');

    // 松开后应在 5 帧内回到 idle
    game.releaseKey('w');
    let becameIdle = false;
    for (let i = 0; i < 5; i++) {
      game.update(1 / 60);
      if (game.player.stateMachine.currentState === 'idle') {
        becameIdle = true;
        break;
      }
    }
    expect(becameIdle).toBe(true);
  });

  it('按 attack 键后 StateMachine.currentState === attack', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    game.simulateKey('f');
    game.update(1 / 60);
    game.releaseKey('f');
    expect(game.player.stateMachine.currentState).toBe('attack');
  });

  it('attack 动画播完后回到 idle 或 run', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    game.simulateKey('f');
    game.update(1 / 60);
    game.releaseKey('f');
    expect(game.player.stateMachine.currentState).toBe('attack');

    // attack clip 0.5s，运行超 60 帧（1s）后应结束
    for (let i = 0; i < 70; i++) game.update(1 / 60);
    const state = game.player.stateMachine.currentState;
    expect(state === 'idle' || state === 'run').toBe(true);
  });

  it('从 run 状态按 attack 键进入 attack', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 进入 run
    game.simulateKey('w');
    for (let i = 0; i < 5; i++) game.update(1 / 60);
    expect(game.player.stateMachine.currentState).toBe('run');

    // 按攻击键
    game.simulateKey('f');
    game.update(1 / 60);
    game.releaseKey('f');
    game.releaseKey('w');
    expect(game.player.stateMachine.currentState).toBe('attack');
  });
});

// ── 4. WASD 移动 ─────────────────────────────────────────────────────

describe('action-rpg-v2 脚手架 — WASD 移动', () => {
  it('按 W 键后 player 位置改变', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const x0 = game.player.position[0];
    const z0 = game.player.position[2];

    game.simulateKey('w');
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    game.releaseKey('w');

    const dx = game.player.position[0] - x0;
    const dz = game.player.position[2] - z0;
    expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThan(0.01);
  });

  it('Space 键后 player y 坐标先升', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    const initialY = game.player.position[1];
    game.simulateKey(' ');
    game.update(1 / 60);
    game.releaseKey(' ');
    expect(game.player.position[1]).toBeGreaterThan(initialY);
  });
});

// ── 5. 相机跟随 ──────────────────────────────────────────────────────

describe('action-rpg-v2 脚手架 — 相机跟随', () => {
  it('初始相机不在原点（有偏移）', () => {
    const game = new Game({ headless: true });
    game.update(1 / 60);
    const pos = game.camera.position;
    const dist = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
    expect(dist).toBeGreaterThan(1);
  });

  it('玩家移动后相机位置跟随改变', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    const cx0 = game.camera.position[0];
    const cz0 = game.camera.position[2];

    game.simulateKey('w');
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    game.releaseKey('w');

    const d = Math.sqrt(
      (game.camera.position[0] - cx0) ** 2 +
      (game.camera.position[2] - cz0) ** 2,
    );
    expect(d).toBeGreaterThan(0.01);
  });

  it('applyMouseDelta 改变相机 yaw', () => {
    const game = new Game({ headless: true });
    const initYaw = game.cameraCtrl.yaw;
    game.applyMouseDelta(200, 0);
    expect(game.cameraCtrl.yaw).not.toBeCloseTo(initYaw, 3);
  });
});
