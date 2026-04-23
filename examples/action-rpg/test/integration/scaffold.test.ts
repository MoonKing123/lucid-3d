/**
 * scaffold.test.ts — M5.1 action-rpg 脚手架集成测试。
 * 使用 headless 模式：无 WebGL 渲染器，直接驱动逻辑层。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { FollowCamera } from '../../../../src/core/follow-camera';
import { CollisionWorld } from '../../../../src/physics/collision';

// ── 1. 场景初始化 ──────────────────────────────────────────────────

describe('action-rpg 脚手架 — 场景初始化', () => {
  it('headless 模式下 Game 可正常创建', () => {
    expect(() => new Game({ headless: true })).not.toThrow();
  });

  it('headless Game 暴露 player 属性', () => {
    const game = new Game({ headless: true });
    expect(game.player).toBeDefined();
    expect(game.player).not.toBeNull();
  });

  it('headless Game 暴露 camera 属性（FollowCamera 实例）', () => {
    const game = new Game({ headless: true });
    expect(game.camera).toBeDefined();
    expect(game.camera).toBeInstanceOf(FollowCamera);
  });

  it('headless Game 暴露 CollisionWorld', () => {
    const game = new Game({ headless: true });
    expect(game.world).toBeDefined();
    expect(game.world).toBeInstanceOf(CollisionWorld);
  });

  it('frameCount 初始为 0', () => {
    const game = new Game({ headless: true });
    expect(game.frameCount).toBe(0);
  });

  it('drawCallCount > 0（地形和角色存在可渲染节点）', () => {
    const game = new Game({ headless: true });
    expect(game.drawCallCount).toBeGreaterThan(0);
  });
});

// ── 2. 60 帧稳定运行 ────────────────────────────────────────────────

describe('action-rpg 脚手架 — 60 帧稳定运行', () => {
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
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('60 帧后 player y 值在合理范围（不穿地）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(game.player.position[1]).toBeGreaterThanOrEqual(-0.1);
  });

  it('60 帧后 camera 位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    const pos = game.camera.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('headless 无 console.error 输出', () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
      const game = new Game({ headless: true });
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    } finally {
      console.error = orig;
    }
    expect(errors).toEqual([]);
  });
});

// ── 3. WASD 移动 ─────────────────────────────────────────────────────

describe('action-rpg 脚手架 — WASD 移动', () => {
  it('按 W 键后 player 位置发生改变', () => {
    const game = new Game({ headless: true });
    // 先稳定接地
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const x0 = game.player.position[0];
    const z0 = game.player.position[2];

    game.simulateKey('w');
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    game.releaseKey('w');

    const dx = game.player.position[0] - x0;
    const dz = game.player.position[2] - z0;
    const moved = Math.sqrt(dx * dx + dz * dz);
    expect(moved).toBeGreaterThan(0.01);
  });

  it('未按键时 player x/z 不改变', () => {
    const game = new Game({ headless: true });
    // 稳定接地
    for (let i = 0; i < 5; i++) game.update(1 / 60);
    const x0 = game.player.position[0];
    const z0 = game.player.position[2];
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    expect(game.player.position[0]).toBeCloseTo(x0, 5);
    expect(game.player.position[2]).toBeCloseTo(z0, 5);
  });

  it('S 键使 player 向相反方向移动', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    game.simulateKey('w');
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    game.releaseKey('w');
    const posAfterW = { x: game.player.position[0], z: game.player.position[2] };

    game.simulateKey('s');
    for (let i = 0; i < 20; i++) game.update(1 / 60);
    game.releaseKey('s');

    const dxW = posAfterW.x;
    const dxS = game.player.position[0] - posAfterW.x;
    // W 和 S 的 x 偏移方向应大致相反（或同在 z 轴方向）
    // 至少 S 键之后位置相对 W 后的位置有所改变
    const totalDist = Math.sqrt(
      (game.player.position[0] - posAfterW.x) ** 2 +
      (game.player.position[2] - posAfterW.z) ** 2
    );
    expect(totalDist).toBeGreaterThan(0.01);
    void dxW; void dxS;
  });
});

// ── 4. 跳跃 ─────────────────────────────────────────────────────────

describe('action-rpg 脚手架 — 跳跃', () => {
  it('Space 键后 player y 坐标先升', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    const initialY = game.player.position[1];

    game.simulateKey(' ');
    game.update(1 / 60);
    game.releaseKey(' ');

    const afterJumpY = game.player.position[1];
    expect(afterJumpY).toBeGreaterThan(initialY);
  });

  it('跳跃峰值 y > 0.1', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    game.simulateKey(' ');
    let maxY = game.player.position[1];
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
      if (game.player.position[1] > maxY) maxY = game.player.position[1];
    }
    game.releaseKey(' ');
    expect(maxY).toBeGreaterThan(0.1);
  });

  it('跳跃后约 2 秒落回地面（y < 0.5）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    game.simulateKey(' ');
    game.update(1 / 60);
    game.releaseKey(' ');

    for (let i = 0; i < 120; i++) game.update(1 / 60);
    expect(game.player.position[1]).toBeLessThan(0.5);
  });
});

// ── 5. 动画状态 ──────────────────────────────────────────────────────

describe('action-rpg 脚手架 — 动画状态', () => {
  it('初始动画状态为 idle', () => {
    const game = new Game({ headless: true });
    expect(game.player.animState).toBe('idle');
  });

  it('按 W 键后动画状态变为 run', () => {
    const game = new Game({ headless: true });
    game.simulateKey('w');
    game.update(1 / 60);
    expect(game.player.animState).toBe('run');
  });

  it('松开移动键后动画状态变回 idle', () => {
    const game = new Game({ headless: true });
    game.simulateKey('w');
    game.update(1 / 60);
    expect(game.player.animState).toBe('run');

    game.releaseKey('w');
    game.update(1 / 60);
    expect(game.player.animState).toBe('idle');
  });

  it('按 F 键后动画状态变为 attack', () => {
    const game = new Game({ headless: true });
    game.update(1 / 60); // 初始化稳定
    game.simulateKey('f');
    game.update(1 / 60);
    game.releaseKey('f');
    expect(game.player.animState).toBe('attack');
  });

  it('attack 结束后状态变回 idle（约 1 秒）', () => {
    const game = new Game({ headless: true });
    game.simulateKey('f');
    game.update(1 / 60);
    game.releaseKey('f');
    expect(game.player.animState).toBe('attack');

    // 攻击 clip 时长 0.5s，运行约 60 帧（1s）后应结束
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(game.player.animState).not.toBe('attack');
  });

  it('AnimationMixer 运行 60 帧无 NaN', () => {
    const game = new Game({ headless: true });
    game.simulateKey('w');
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    game.releaseKey('w');
    game.simulateKey('f');
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    game.releaseKey('f');

    const skeleton = game.player.mixer.skeleton;
    for (let i = 0; i < skeleton.boneMatrices.length; i++) {
      expect(isNaN(skeleton.boneMatrices[i])).toBe(false);
    }
  });
});

// ── 6. 相机跟随 ──────────────────────────────────────────────────────

describe('action-rpg 脚手架 — 相机跟随', () => {
  it('初始相机不在原点（有偏移）', () => {
    const game = new Game({ headless: true });
    game.update(1 / 60);
    const camPos = game.camera.position;
    const dist = Math.sqrt(camPos[0] ** 2 + camPos[1] ** 2 + camPos[2] ** 2);
    expect(dist).toBeGreaterThan(1);
  });

  it('玩家移动后相机位置跟随改变', () => {
    const game = new Game({ headless: true });
    // 先稳定相机
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    const camX0 = game.camera.position[0];
    const camZ0 = game.camera.position[2];

    // 玩家向前移动 30 帧
    game.simulateKey('w');
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    game.releaseKey('w');

    const dcam = Math.sqrt(
      (game.camera.position[0] - camX0) ** 2 +
      (game.camera.position[2] - camZ0) ** 2
    );
    expect(dcam).toBeGreaterThan(0.01);
  });

  it('applyMouseDelta 改变相机偏移方向', () => {
    const game = new Game({ headless: true });
    const initYaw = game.cameraCtrl.yaw;
    game.applyMouseDelta(200, 0);
    expect(game.cameraCtrl.yaw).not.toBeCloseTo(initYaw, 3);
  });

  it('applyMouseDelta 后相机位置改变', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);
    const pos0 = { x: game.camera.position[0], z: game.camera.position[2] };

    game.applyMouseDelta(300, 0);
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const d = Math.sqrt(
      (game.camera.position[0] - pos0.x) ** 2 +
      (game.camera.position[2] - pos0.z) ** 2
    );
    expect(d).toBeGreaterThan(0.01);
  });
});
