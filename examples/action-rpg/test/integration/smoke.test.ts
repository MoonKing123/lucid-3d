/**
 * smoke.test.ts — M5.5 集成合约测试（聚合）。
 * 快速验证全部 M5 子系统：脚手架 + Enemy + 战斗 + HUD。
 * 聚合执行时间目标 < 60s。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { CollisionWorld } from '../../../../src/physics/collision';
import { Player } from '../../src/player';
import { HUD } from '../../src/hud';
import { Enemy, type EnemyNavContext } from '../../src/enemy';
import { NavGrid } from '../../../../src/navigation/nav-grid';
import { Node3D } from '../../../../src/core/node3d';
import { Health } from '../../../../src/gameplay/health';
import { CombatSystem, type CombatTarget } from '../../src/combat';
import { FollowCamera } from '../../../../src/core/follow-camera';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData, BitmapCharData } from '../../../../src/renderer/bitmap-font';

// ── 测试辅助 ─────────────────────────────────────────────────────────

function mockFont(): BitmapFontData {
  const chars = new Map<number, BitmapCharData>();
  for (let i = 32; i <= 126; i++) {
    chars.set(i, { id: i, x: 0, y: 0, width: 8, height: 12, xoffset: 1, yoffset: 2, xadvance: 10 });
  }
  return { lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars };
}

function buildNav(): EnemyNavContext {
  const size = 20, cell = 2, off = 20;
  const grid = new NavGrid(size, size, cell);
  return {
    grid,
    worldToGrid: (wx, wz) => [
      Math.max(0, Math.min(size - 1, Math.floor((wx + off) / cell))),
      Math.max(0, Math.min(size - 1, Math.floor((wz + off) / cell))),
    ],
    gridToWorld: (gx, gz) => [
      (gx + 0.5) * cell - off,
      (gz + 0.5) * cell - off,
    ],
  };
}

// ── M5.1 脚手架 ─────────────────────────────────────────────────────

describe('smoke — M5.1 脚手架', () => {
  it('headless Game 可创建', () => {
    expect(() => new Game({ headless: true })).not.toThrow();
  });

  it('player 存在且位置无 NaN', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    const pos = game.player.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });

  it('camera 为 FollowCamera 实例', () => {
    const game = new Game({ headless: true });
    expect(game.camera).toBeInstanceOf(FollowCamera);
  });

  it('60 帧无崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    }).not.toThrow();
  });
});

// ── M5.2 Enemy NPC ────────────────────────────────────────────────────

describe('smoke — M5.2 Enemy NPC', () => {
  it('Enemy 可创建，初始 patrol 状态', () => {
    const nav    = buildNav();
    const player = new Node3D('player');
    player.position[0] = 100; player.position[2] = 100;
    const enemy  = new Enemy([0, 0, 0], nav, player);
    expect(enemy.state).toBe('patrol');
    expect(enemy.isDead).toBe(false);
  });

  it('Enemy takeDamage → health 减少', () => {
    const nav    = buildNav();
    const player = new Node3D('player');
    const enemy  = new Enemy([0, 0, 0], nav, player);
    enemy.health.takeDamage(30);
    expect(enemy.health.current).toBe(70);
  });

  it('EnemyManager 有 7 个 Enemy（SPAWN_POSITIONS）', () => {
    const game = new Game({ headless: true });
    expect(game.enemyManager.enemies.length).toBe(7);
  });

  it('Enemy 60 帧 update 无 NaN', () => {
    const nav    = buildNav();
    const player = new Node3D('player');
    player.position[0] = 100;
    const enemy  = new Enemy([0, 0, 0], nav, player);
    for (let i = 0; i < 60; i++) enemy.update(1 / 60);
    expect(isNaN(enemy.node.position[0])).toBe(false);
  });
});

// ── M5.3 战斗系统 ─────────────────────────────────────────────────────

describe('smoke — M5.3 战斗系统', () => {
  function makeTarget(x = 0, z = 0): CombatTarget {
    const node   = new Node3D('t');
    node.position[0] = x; node.position[2] = z;
    const health = new Health(100);
    return { node, health, get isDead() { return health.isDead; } };
  }

  it('CombatSystem 可创建', () => {
    const player = new Node3D('player');
    expect(() => new CombatSystem(player, [])).not.toThrow();
  });

  it('近战剑攻击命中 2m 内目标', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 1.5);
    const cs     = new CombatSystem(player, [target]);
    cs.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    expect(target.health.current).toBeLessThan(100);
  });

  it('切换弓后攻击返回 true', () => {
    const player = new Node3D('player');
    const cs     = new CombatSystem(player, []);
    cs.switchWeapon('bow');
    const result = cs.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    expect(result).toBe(true);
  });

  it('Game combat 系统可访问', () => {
    const game = new Game({ headless: true });
    expect(game.combat).toBeDefined();
    expect(game.combat.weapon).toBe('sword');
  });
});

// ── M5.4 HUD ─────────────────────────────────────────────────────────

describe('smoke — M5.4 HUD', () => {
  it('HUD 可创建', () => {
    expect(() => new HUD({ width: 800, height: 600, font: mockFont() })).not.toThrow();
  });

  it('血量条初始满值', () => {
    const hud = new HUD({ width: 800, height: 600, font: mockFont() });
    expect(hud.healthBar.value).toBe(1);
  });

  it('Player takeDamage 后 HUD 血量条更新', () => {
    const world  = new CollisionWorld();
    const player = new Player(world);
    const hud    = new HUD({ width: 800, height: 600, font: mockFont() });
    hud.connectPlayer(player);
    player.takeDamage(50);
    expect(hud.healthBar.value).toBeCloseTo(0.5);
  });

  it('Esc 菜单 toggleEscMenu() 切换可见性', () => {
    const hud = new HUD({ width: 800, height: 600, font: mockFont() });
    hud.toggleEscMenu();
    expect(hud.isPaused).toBe(true);
    expect(hud.escMenu.visible).toBe(true);
  });

  it('技能栏有 4 个格子', () => {
    const hud = new HUD({ width: 800, height: 600, font: mockFont() });
    expect(hud.skillSlots.length).toBe(4);
  });
});

// ── 全链路集成 ────────────────────────────────────────────────────────

describe('smoke — M5 全链路集成', () => {
  it('Game headless 运行 300 帧：player + enemy + combat 协同无崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 300; i++) {
        if (i === 50) game.simulateKey('f');  // 开始攻击
        if (i === 55) game.releaseKey('f');
        if (i === 100) game.simulateKey('w'); // 开始移动
        if (i === 150) game.releaseKey('w');
        game.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('drawCallCount > 0 且 ≤ 60', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    expect(game.drawCallCount).toBeGreaterThan(0);
    expect(game.drawCallCount).toBeLessThanOrEqual(60);
  });
});
