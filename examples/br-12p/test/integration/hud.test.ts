/**
 * hud.test.ts — BR-12P M4.5 HUD 集成测试。
 * headless 模式：无 WebGL 渲染器，直接驱动逻辑。
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { HUDManager } from '../../src/ui/hud-manager';

// ── 1. 初始化 ──────────────────────────────────────────────────

describe('HUD — 初始化', () => {
  it('所有 HUD 组件初始化后可见', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);

    expect(hud.crosshair.canvas.children.length).toBeGreaterThan(0);
    expect(hud.healthBar.bar.visible).toBe(true);
    expect(hud.ammoDisplay.canvas.children.length).toBeGreaterThan(0);
    expect(hud.minimap.background.visible).toBe(true);
    expect(hud.killFeed.canvas).toBeDefined();
    expect(hud.deathMenu.canvas).toBeDefined();
    expect(hud.victoryMenu.canvas).toBeDefined();
  });

  it('初始弹药显示与 weapon.ammo 一致', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    expect(hud.ammoDisplay.ammo).toBe(game.weapon.ammo);
  });

  it('初始血量条为满', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    expect(hud.healthBar.bar.value).toBe(1);
  });
});

// ── 2. 开火事件 ───────────────────────────────────────────────

describe('HUD — 开火事件', () => {
  it('开火后弹药显示减少 1', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    const initialAmmo = game.weapon.ammo;
    game.simulateShoot();
    expect(hud.ammoDisplay.ammo).toBe(initialAmmo - 1);
  });

  it('开火后准星产生扩散', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    expect(hud.crosshair.spread).toBe(0);
    game.simulateShoot();
    expect(hud.crosshair.spread).toBeGreaterThan(0);
  });
});

// ── 3. 血量变化 ───────────────────────────────────────────────

describe('HUD — 血量变化', () => {
  it('玩家受伤后血量条缩短', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    expect(hud.healthBar.bar.value).toBe(1);
    game.playerHealth.takeDamage(50);
    expect(hud.healthBar.bar.value).toBeLessThan(1);
    expect(hud.healthBar.bar.value).toBeCloseTo(0.5, 2);
  });

  it('血量 > 60% 时血量条为绿色', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(30);  // 70/100
    expect(hud.healthBar.bar.fillColor[1]).toBeGreaterThan(0.5);  // G 通道高
    expect(hud.healthBar.bar.fillColor[0]).toBeLessThan(0.5);     // R 通道低
  });

  it('血量 30%-60% 时血量条为黄色', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(55);  // 45/100
    expect(hud.healthBar.bar.fillColor[0]).toBeGreaterThan(0.5);  // R 通道高
    expect(hud.healthBar.bar.fillColor[1]).toBeGreaterThan(0.5);  // G 通道高
  });

  it('血量 < 30% 时血量条为红色', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(80);  // 20/100
    expect(hud.healthBar.bar.fillColor[0]).toBeGreaterThan(0.5);  // R 通道高
    expect(hud.healthBar.bar.fillColor[2]).toBeLessThan(0.5);     // B 通道低
  });
});

// ── 4. Kill Feed ──────────────────────────────────────────────

describe('HUD — Kill Feed', () => {
  it('敌人死亡后 kill feed 新增一条', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(1);
    const hud = new HUDManager(game, 800, 600);
    expect(hud.killFeed.entries.length).toBe(0);
    game.enemies[0].health.takeDamage(1000);
    expect(hud.killFeed.entries.length).toBe(1);
  });

  it('kill feed 条目包含正确的 victimId 和 attackerId', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(1);
    const hud = new HUDManager(game, 800, 600);
    game.enemies[0].health.takeDamage(1000);
    const entry = hud.killFeed.entries[0];
    expect(entry.attackerId).toBe('player');
    expect(entry.victimId).toBeDefined();
  });

  it('3s 后 kill feed 条目淡出消失', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(1);
    const hud = new HUDManager(game, 800, 600);
    game.enemies[0].health.takeDamage(1000);
    expect(hud.killFeed.entries.length).toBe(1);
    // 快进 3.5s
    for (let i = 0; i < 210; i++) hud.update(1 / 60);
    expect(hud.killFeed.entries.length).toBe(0);
  });
});

// ── 5. 死亡菜单 ───────────────────────────────────────────────

describe('HUD — 死亡菜单', () => {
  it('玩家死亡时死亡菜单显示', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    expect(hud.deathMenu.visible).toBe(false);
    game.playerHealth.takeDamage(200);
    expect(hud.deathMenu.visible).toBe(true);
  });

  it('死亡菜单显示后倒计时开始（countdown > 0）', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(200);
    expect(hud.deathMenu.countdown).toBeGreaterThan(0);
  });

  it('死亡后 3s 倒计时结束，死亡菜单自动隐藏', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(200);
    expect(hud.deathMenu.visible).toBe(true);
    for (let i = 0; i < 210; i++) hud.update(1 / 60);
    expect(hud.deathMenu.visible).toBe(false);
  });

  it('点击 respawnBtn 立即复活（死亡菜单隐藏）', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    game.playerHealth.takeDamage(200);
    expect(hud.deathMenu.visible).toBe(true);
    hud.deathMenu.respawnBtn.onClick?.();
    expect(hud.deathMenu.visible).toBe(false);
  });
});

// ── 6. 胜利菜单 ───────────────────────────────────────────────

describe('HUD — 胜利菜单', () => {
  it('所有敌人死亡后胜利菜单显示', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(1);
    const hud = new HUDManager(game, 800, 600);
    expect(hud.victoryMenu.visible).toBe(false);
    game.enemies[0].health.takeDamage(1000);
    expect(hud.victoryMenu.visible).toBe(true);
  });

  it('生成 3 个敌人时，全部死亡后才触发胜利', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(3);
    const hud = new HUDManager(game, 800, 600);
    game.enemies[0].health.takeDamage(1000);
    expect(hud.victoryMenu.visible).toBe(false);
    game.enemies[1].health.takeDamage(1000);
    expect(hud.victoryMenu.visible).toBe(false);
    game.enemies[2].health.takeDamage(1000);
    expect(hud.victoryMenu.visible).toBe(true);
  });
});

// ── 7. 小地图 ─────────────────────────────────────────────────

describe('HUD — 小地图', () => {
  it('生成 11 个敌人后小地图更新显示 12 个点（含本地玩家）', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    const hud = new HUDManager(game, 800, 600);
    hud.updateMinimap();
    // 11 存活敌人 + 1 本地玩家
    expect(hud.minimap.dots.length).toBe(12);
  });

  it('本地玩家点颜色为绿色（G > 0.5）', () => {
    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    hud.updateMinimap();
    const playerDot = hud.minimap.dots.find(d => d.id === 'player');
    expect(playerDot).toBeDefined();
    expect(playerDot!.color[1]).toBeGreaterThan(0.5);  // G 通道高
  });

  it('敌人死亡后在小地图上消失', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(3);
    const hud = new HUDManager(game, 800, 600);
    game.enemies[0].health.takeDamage(1000);
    hud.updateMinimap();
    // 3 敌人中 1 死亡 → 2 存活 + 1 玩家 = 3 点
    expect(hud.minimap.dots.length).toBe(3);
  });

  it('update() 每帧自动调用 updateMinimap', () => {
    const game = new Game({ headless: true });
    game.spawnEnemies(11);
    const hud = new HUDManager(game, 800, 600);
    // 调用 update 而非手动 updateMinimap
    hud.update(1 / 60);
    expect(hud.minimap.dots.length).toBe(12);
  });
});
