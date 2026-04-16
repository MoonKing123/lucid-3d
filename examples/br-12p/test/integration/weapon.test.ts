/**
 * weapon.test.ts — BR-12P M4.2 武器系统集成测试。
 * 使用 headless 模式：无 WebGL 渲染器，直接驱动逻辑。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { LAYER_HITTABLE } from '../../src/weapon';
import { vec3 } from '../../../../src/math/vec3';
import { Node3D } from '../../../../src/core/node3d';
import { SphereCollider } from '../../../../src/physics/collision';

// ── 1. 初始化 ────────────────────────────────────────────────────────

describe('武器系统 — 初始化', () => {
  it('Game headless 模式包含 weapon', () => {
    const game = new Game({ headless: true });
    expect(game.weapon).toBeDefined();
  });

  it('初始 state 为 idle', () => {
    const game = new Game({ headless: true });
    expect(game.weapon.state).toBe('idle');
  });

  it('初始弹药数量大于 0', () => {
    const game = new Game({ headless: true });
    expect(game.weapon.ammo).toBeGreaterThan(0);
  });

  it('maxAmmo 与初始弹药数量一致', () => {
    const game = new Game({ headless: true });
    expect(game.weapon.ammo).toBe(game.weapon.maxAmmo);
  });
});

// ── 2. 状态机 — idle → firing ────────────────────────────────────────

describe('武器系统 — 状态机', () => {
  it('simulateShoot() 使 state 从 idle → firing', () => {
    const game = new Game({ headless: true });
    expect(game.weapon.state).toBe('idle');
    game.simulateShoot();
    expect(game.weapon.state).toBe('firing');
  });

  it('weapon.fired 事件触发，弹药 -1', () => {
    const game = new Game({ headless: true });
    const initialAmmo = game.weapon.ammo;
    let fired = false;
    game.weapon.on('weapon.fired', () => { fired = true; });

    game.simulateShoot();

    expect(fired).toBe(true);
    expect(game.weapon.ammo).toBe(initialAmmo - 1);
  });

  it('firing 状态冷却后回到 idle', () => {
    const game = new Game({ headless: true });
    game.simulateShoot();
    expect(game.weapon.state).toBe('firing');

    // 冷却 0.12s，运行 10 帧（≈ 0.167s > 0.12s）
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    expect(game.weapon.state).toBe('idle');
  });

  it('连续开火直到弹药 0 → 自动进入 reloading', () => {
    const game = new Game({ headless: true });
    const maxAmmo = game.weapon.ammo;

    for (let i = 0; i < maxAmmo; i++) {
      // 等待 idle 状态（上一发冷却）
      for (let j = 0; j < 30 && game.weapon.state !== 'idle'; j++) {
        game.update(1 / 60);
      }
      expect(game.weapon.state).toBe('idle');
      game.simulateShoot();
    }

    // 等最后一发冷却完成（0.12s → ~8 帧）
    for (let i = 0; i < 15; i++) game.update(1 / 60);

    expect(game.weapon.state).toBe('reloading');
    expect(game.weapon.ammo).toBe(0);
  });

  it('快进 2s → 弹药重置，回到 idle', () => {
    const game = new Game({ headless: true });
    const maxAmmo = game.weapon.ammo;

    // 打光所有子弹
    for (let i = 0; i < maxAmmo; i++) {
      for (let j = 0; j < 30 && game.weapon.state !== 'idle'; j++) {
        game.update(1 / 60);
      }
      game.simulateShoot();
    }
    for (let i = 0; i < 15; i++) game.update(1 / 60);
    expect(game.weapon.state).toBe('reloading');

    // 快进 2.5s（150 帧）确保换弹定时器触发
    for (let i = 0; i < 150; i++) game.update(1 / 60);

    expect(game.weapon.state).toBe('idle');
    expect(game.weapon.ammo).toBe(maxAmmo);
  });

  it('R 键手动换弹 → 进入 reloading 状态', () => {
    const game = new Game({ headless: true });

    // 先开一枪消耗弹药
    game.simulateShoot();
    for (let i = 0; i < 15; i++) game.update(1 / 60);
    expect(game.weapon.state).toBe('idle');
    expect(game.weapon.ammo).toBeLessThan(game.weapon.maxAmmo);

    // 按 R 键
    game.simulateKey('r');
    game.update(1 / 60);
    game.releaseKey('r');

    expect(game.weapon.state).toBe('reloading');
  });

  it('换弹期间无法开火', () => {
    const game = new Game({ headless: true });

    // 触发换弹
    game.simulateKey('r');
    game.update(1 / 60);
    game.releaseKey('r');
    expect(game.weapon.state).toBe('reloading');

    // 尝试开火
    const ammoBefore = game.weapon.ammo;
    game.simulateShoot();
    expect(game.weapon.state).toBe('reloading');
    expect(game.weapon.ammo).toBe(ammoBefore);
  });
});

// ── 3. Raycast 命中 ───────────────────────────────────────────────────

describe('武器系统 — Raycast 命中', () => {
  it('raycast 命中 hittable 目标 → weapon.hit 事件', () => {
    const game = new Game({ headless: true });

    // 稳定玩家落地（相机位置确定）
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 相机默认朝 -Z（yaw=0, pitch=0），位于 (0, ~1.7, 0)
    // 在正前方 5 单位放置大球体目标
    const targetNode = new Node3D('hittable-target');
    targetNode.position[0] = 0;
    targetNode.position[1] = game.player.position[1] + 1.7; // 与相机同高
    targetNode.position[2] = -5;

    game.world.addBody(targetNode, {
      shape: new SphereCollider(1.0),
      layer: LAYER_HITTABLE,
      mask: 0xFFFFFFFF,
    });

    let hitCount = 0;
    game.weapon.on('weapon.hit', () => { hitCount++; });

    game.simulateShoot();

    expect(hitCount).toBe(1);
  });

  it('无 hittable 目标时不触发 weapon.hit', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    // 未放置任何 LAYER_HITTABLE 目标
    let hitCount = 0;
    game.weapon.on('weapon.hit', () => { hitCount++; });

    game.simulateShoot();

    // 武器只检测 LAYER_HITTABLE，地图环境层不触发命中事件
    expect(hitCount).toBe(0);
  });

  it('weapon.hit 事件携带命中点坐标', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 5; i++) game.update(1 / 60);

    const targetNode = new Node3D('hittable-target');
    targetNode.position[0] = 0;
    targetNode.position[1] = game.player.position[1] + 1.7;
    targetNode.position[2] = -5;

    game.world.addBody(targetNode, {
      shape: new SphereCollider(1.0),
      layer: LAYER_HITTABLE,
      mask: 0xFFFFFFFF,
    });

    let hitPoint: ReturnType<typeof vec3> | null = null;
    game.weapon.on('weapon.hit', (point) => { hitPoint = point; });

    game.simulateShoot();

    expect(hitPoint).not.toBeNull();
    // 命中点应在目标附近（z ≈ -4，距球心 1 单位）
    expect(hitPoint![2]).toBeLessThan(0);
  });
});

// ── 4. 粒子特效 ───────────────────────────────────────────────────────

describe('武器系统 — 粒子特效', () => {
  it('开火后 1 帧枪口闪光粒子存在', () => {
    const game = new Game({ headless: true });

    game.simulateShoot();
    game.update(1 / 60);

    expect(game.weapon.muzzleFlash.activeCount).toBeGreaterThan(0);
  });

  it('30 帧后枪口闪光粒子仍然存活（lifetime >= 0.6s > 0.5s）', () => {
    const game = new Game({ headless: true });

    game.simulateShoot();
    for (let i = 0; i < 30; i++) game.update(1 / 60);

    // 粒子最短寿命 0.6s，30 帧 = 0.5s < 0.6s，应仍存活
    expect(game.weapon.muzzleFlash.activeCount).toBeGreaterThan(0);
  });

  it('muzzleFlash.emitter 是 ParticleEmitter 实例', () => {
    const game = new Game({ headless: true });
    expect(game.weapon.muzzleFlash.emitter).toBeDefined();
    expect(game.weapon.muzzleFlash.emitter.options).toBeDefined();
  });
});

// ── 5. 事件广播 ───────────────────────────────────────────────────────

describe('武器系统 — 事件广播', () => {
  it('R 键换弹触发 weapon.reload_start 事件', () => {
    const game = new Game({ headless: true });
    let reloadStarted = false;
    game.weapon.on('weapon.reload_start', () => { reloadStarted = true; });

    game.simulateKey('r');
    game.update(1 / 60);
    game.releaseKey('r');

    expect(reloadStarted).toBe(true);
  });

  it('换弹完成后触发 weapon.reload_end 事件', () => {
    const game = new Game({ headless: true });
    let reloadEnded = false;
    game.weapon.on('weapon.reload_end', () => { reloadEnded = true; });

    game.simulateKey('r');
    game.update(1 / 60);
    game.releaseKey('r');

    // 快进 2.5s 确保换弹完成
    for (let i = 0; i < 150; i++) game.update(1 / 60);

    expect(reloadEnded).toBe(true);
  });

  it('弹药耗尽后自动换弹触发 weapon.reload_start', () => {
    const game = new Game({ headless: true });
    const maxAmmo = game.weapon.ammo;
    let reloadStartCount = 0;
    game.weapon.on('weapon.reload_start', () => { reloadStartCount++; });

    // 打光所有子弹
    for (let i = 0; i < maxAmmo; i++) {
      for (let j = 0; j < 30 && game.weapon.state !== 'idle'; j++) {
        game.update(1 / 60);
      }
      game.simulateShoot();
    }
    for (let i = 0; i < 15; i++) game.update(1 / 60);

    expect(reloadStartCount).toBeGreaterThan(0);
    expect(game.weapon.state).toBe('reloading');
  });
});
