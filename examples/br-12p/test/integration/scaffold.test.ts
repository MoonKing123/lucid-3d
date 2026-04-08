/**
 * scaffold.test.ts — BR-12P M4.1 脚手架集成测试。
 * 使用 headless 模式：无 WebGL 渲染器，直接驱动逻辑。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { FPSCamera } from '../../src/fps-camera';
import { createMap, MAP_SIZE } from '../../src/map';
import { createLights } from '../../src/lights';
import { CollisionWorld } from '../../../../src/physics/collision';
import { vec3 } from '../../../../src/math/vec3';

// ── 1. 场景初始化 ──────────────────────────────────────────────────

describe('BR-12P 脚手架 — 场景初始化', () => {
  it('headless 模式下 Game 可正常创建', () => {
    expect(() => new Game({ headless: true })).not.toThrow();
  });

  it('headless Game 暴露 camera 属性', () => {
    const game = new Game({ headless: true });
    expect(game.camera).toBeDefined();
    expect(game.camera).not.toBeNull();
  });

  it('headless Game 暴露 player 属性', () => {
    const game = new Game({ headless: true });
    expect(game.player).toBeDefined();
    expect(game.player).not.toBeNull();
  });

  it('headless Game 暴露 fpsCamera 属性', () => {
    const game = new Game({ headless: true });
    expect(game.fpsCamera).toBeDefined();
    expect(game.fpsCamera).toBeInstanceOf(FPSCamera);
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
});

// ── 2. 60 帧稳定运行 ────────────────────────────────────────────────

describe('BR-12P 脚手架 — 60 帧稳定运行', () => {
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

  it('60 帧后 camera 位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    const pos = game.camera.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('60 帧后 player y 值在合理范围内（不穿地）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    // 玩家应停在地面上，y 值 ≥ 0（不穿地）
    expect(game.player.position[1]).toBeGreaterThanOrEqual(-0.1);
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

// ── 3. W 键前进 ─────────────────────────────────────────────────────

describe('BR-12P 脚手架 — WASD 移动', () => {
  it('按 W 键 5 帧后 player 位置向前移动（z 减小）', () => {
    const game = new Game({ headless: true });
    // 先稳定几帧确保接地
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const initialZ = game.player.position[2];

    game.simulateKey('w');
    for (let i = 0; i < 5; i++) game.update(1 / 60);
    game.releaseKey('w');

    // FPSCamera yaw=0 时 forward=(0,0,-1)，z 应减小
    expect(game.player.position[2]).toBeLessThan(initialZ - 0.01);
  });

  it('未按键时 player 位置不改变 x/z', () => {
    const game = new Game({ headless: true });
    // 稳定接地
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const x0 = game.player.position[0];
    const z0 = game.player.position[2];

    for (let i = 0; i < 10; i++) game.update(1 / 60);

    expect(game.player.position[0]).toBeCloseTo(x0, 5);
    expect(game.player.position[2]).toBeCloseTo(z0, 5);
  });
});

// ── 4. 跳跃 ─────────────────────────────────────────────────────────

describe('BR-12P 脚手架 — 跳跃', () => {
  it('模拟 Space 键：玩家 y 坐标先升后落回地面', () => {
    const game = new Game({ headless: true });
    // 稳定接地
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    const initialY = game.player.position[1];

    // 按下 Space 触发跳跃
    game.simulateKey(' ');
    game.update(1 / 60);
    game.releaseKey(' ');

    // 跳跃后应离地
    const afterJumpY = game.player.position[1];
    expect(afterJumpY).toBeGreaterThan(initialY);

    // 再运行 120 帧（≈2秒），玩家应落回地面
    for (let i = 0; i < 120; i++) game.update(1 / 60);
    expect(game.player.position[1]).toBeLessThan(0.5);
  });

  it('跳跃期间 y 轴峰值大于 0.1', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    game.simulateKey(' ');
    let maxY = game.player.position[1];
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
      if (game.player.position[1] > maxY) maxY = game.player.position[1];
    }
    game.releaseKey(' ');

    expect(maxY).toBeGreaterThan(0.1);
  });
});

// ── 5. FPSCamera 鼠标旋转 ────────────────────────────────────────────

describe('BR-12P 脚手架 — FPSCamera', () => {
  it('applyMouseDelta(100, 0) 使 yaw 旋转', () => {
    const game = new Game({ headless: true });
    const initYaw = game.fpsCamera.yaw;
    game.applyMouseDelta(100, 0);
    expect(game.fpsCamera.yaw).not.toBeCloseTo(initYaw, 3);
  });

  it('applyMouseDelta(0, 100) 使 pitch 旋转', () => {
    const game = new Game({ headless: true });
    const initPitch = game.fpsCamera.pitch;
    game.applyMouseDelta(0, 100);
    expect(game.fpsCamera.pitch).not.toBeCloseTo(initPitch, 3);
  });

  it('pitch 被 clamp 在 ±89°', () => {
    const game = new Game({ headless: true });
    game.applyMouseDelta(0, 100000);  // 极大值
    const limit = 89 * Math.PI / 180;
    expect(game.fpsCamera.pitch).toBeGreaterThanOrEqual(-limit - 0.001);
    expect(game.fpsCamera.pitch).toBeLessThanOrEqual(limit + 0.001);
  });

  it('applyMouseDelta 后 view direction 改变', () => {
    const game = new Game({ headless: true });
    const initDir = game.fpsCamera.getViewDirection();

    game.applyMouseDelta(100, 0);
    game.update(1 / 60);  // 触发 camera.update()

    const newDir = game.fpsCamera.getViewDirection();
    // x 分量（sin(yaw)）应变化
    expect(newDir[0]).not.toBeCloseTo(initDir[0], 3);
  });

  it('FPSCamera 初始 aspect 为 16/9', () => {
    const cam = new FPSCamera({ aspect: 16 / 9 });
    expect(cam.camera.aspect).toBeCloseTo(16 / 9, 3);
  });

  it('FPSCamera headHeight 默认 1.7', () => {
    const cam = new FPSCamera();
    expect(cam.headHeight).toBeCloseTo(1.7, 3);
  });
});

// ── 6. CollisionWorld raycast 验证地面 ───────────────────────────────

describe('BR-12P 脚手架 — CollisionWorld raycast', () => {
  it('从 (5,10,5) 向下射线命中地面', () => {
    const world = new CollisionWorld();
    createMap(world);  // 注册地面和墙壁

    const hits = world.raycast(
      vec3(5, 10, 5),   // 位于地面中心上方
      vec3(0, -1, 0),   // 向下
      20,
    );

    expect(hits.length).toBeGreaterThan(0);
    // 最近命中点应在 y≈0 附近
    expect(hits[0].distance).toBeCloseTo(10, 0);
  });

  it('Game world 中地面可被 raycast 命中', () => {
    const game = new Game({ headless: true });
    const hits = game.world.raycast(
      vec3(5, 10, 5),
      vec3(0, -1, 0),
      20,
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('MAP_SIZE 不小于 64 世界单位', () => {
    expect(MAP_SIZE).toBeGreaterThanOrEqual(64);
  });
});

// ── 7. 场景可渲染内容（drawCalls 代理） ──────────────────────────────

describe('BR-12P 脚手架 — 可渲染内容', () => {
  it('drawCallCount > 0（地图包含可渲染节点）', () => {
    const game = new Game({ headless: true });
    expect(game.drawCallCount).toBeGreaterThan(0);
  });

  it('地图至少有 1 个地面 + 若干墙壁（drawCallCount ≥ 2）', () => {
    const game = new Game({ headless: true });
    expect(game.drawCallCount).toBeGreaterThanOrEqual(2);
  });

  it('createLights 返回 sun 和 ambient 且强度 > 0', () => {
    const { sun, ambient } = createLights();
    expect(sun.intensity).toBeGreaterThan(0);
    expect(ambient.intensity).toBeGreaterThan(0);
    const dirLen = Math.sqrt(
      sun.direction[0] ** 2 + sun.direction[1] ** 2 + sun.direction[2] ** 2
    );
    expect(dirLen).toBeGreaterThan(0);
  });
});
