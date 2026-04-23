/**
 * hud.test.ts — M5.4 HUD + 背包 + 技能栏 + Esc 菜单集成测试。
 * 验证所有 UI 组件正确响应 EventEmitter 事件。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionWorld } from '../../../../src/physics/collision';
import { Player } from '../../src/player';
import { HUD } from '../../src/hud';
import type { BitmapFontData, BitmapCharData } from '../../../../src/renderer/bitmap-font';

// ── 测试辅助 ─────────────────────────────────────────────────────────

function createMockFont(): BitmapFontData {
  const chars = new Map<number, BitmapCharData>();
  for (let i = 32; i <= 126; i++) {
    chars.set(i, { id: i, x: 0, y: 0, width: 8, height: 12, xoffset: 1, yoffset: 2, xadvance: 10 });
  }
  // 常用中文字符
  for (let i = 0x4e00; i <= 0x4e10; i++) {
    chars.set(i, { id: i, x: 0, y: 0, width: 14, height: 14, xoffset: 0, yoffset: 0, xadvance: 16 });
  }
  return { lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars };
}

class MockInput {
  isKeyDown(_key: string): boolean { return false; }
}

function createHUD(width = 800, height = 600): HUD {
  return new HUD({ width, height, font: createMockFont() });
}

function createPlayer(): Player {
  const world = new CollisionWorld();
  return new Player(world);
}

// ── 1. HUD 初始化 ─────────────────────────────────────────────────────

describe('HUD 初始化', () => {
  it('可正常创建 HUD', () => {
    expect(() => createHUD()).not.toThrow();
  });

  it('UICanvas 尺寸正确', () => {
    const hud = createHUD(800, 600);
    expect(hud.canvas.width).toBe(800);
    expect(hud.canvas.height).toBe(600);
  });

  it('血量条初始值为 1（满血）', () => {
    const hud = createHUD();
    expect(hud.healthBar.value).toBe(1);
  });

  it('蓝量条初始值为 1（满蓝）', () => {
    const hud = createHUD();
    expect(hud.manaBar.value).toBe(1);
  });

  it('初始不处于暂停状态', () => {
    const hud = createHUD();
    expect(hud.isPaused).toBe(false);
  });

  it('背包初始关闭', () => {
    const hud = createHUD();
    expect(hud.inventoryOpen).toBe(false);
  });

  it('初始不处于死亡状态', () => {
    const hud = createHUD();
    expect(hud.isDead).toBe(false);
  });

  it('击杀计数初始为 0', () => {
    const hud = createHUD();
    expect(hud.killCount).toBe(0);
  });

  it('技能栏有 4 个格子', () => {
    const hud = createHUD();
    expect(hud.skillSlots.length).toBe(4);
    expect(hud.skillCooldownMasks.length).toBe(4);
  });

  it('初始选中技能为 0', () => {
    const hud = createHUD();
    expect(hud.selectedSkill).toBe(0);
  });

  it('背包有 4×4=16 个格子', () => {
    const hud = createHUD();
    expect(hud.inventorySlots.length).toBe(16);
  });
});

// ── 2. 血量条响应事件 ─────────────────────────────────────────────────

describe('血量条 — 响应 EventEmitter', () => {
  let player: Player;
  let hud: HUD;

  beforeEach(() => {
    player = createPlayer();
    hud = createHUD();
    hud.connectPlayer(player);
  });

  it('Player.takeDamage(10) 后血量条 value = 0.9', () => {
    player.takeDamage(10);
    expect(hud.healthBar.value).toBeCloseTo(0.9);
  });

  it('Player.takeDamage(50) 后血量条 value = 0.5', () => {
    player.takeDamage(50);
    expect(hud.healthBar.value).toBeCloseTo(0.5);
  });

  it('Player.takeDamage(100) 后血量条 value = 0', () => {
    player.takeDamage(100);
    expect(hud.healthBar.value).toBe(0);
  });

  it('Player.respawn() 后血量条恢复满值', () => {
    player.takeDamage(60);
    expect(hud.healthBar.value).toBeCloseTo(0.4);
    player.respawn();
    expect(hud.healthBar.value).toBe(1);
  });

  it('未连接玩家时血量条不更新', () => {
    const standalone = createHUD();
    const p2 = createPlayer();
    p2.takeDamage(30);
    expect(standalone.healthBar.value).toBe(1); // 未连接
  });
});

// ── 3. 蓝量条响应事件 ─────────────────────────────────────────────────

describe('蓝量条 — 响应 EventEmitter', () => {
  let player: Player;
  let hud: HUD;

  beforeEach(() => {
    player = createPlayer();
    hud = createHUD();
    hud.connectPlayer(player);
  });

  it('Player.emit mana-changed 后蓝量条更新', () => {
    player.emit('mana-changed', 50, 100);
    expect(hud.manaBar.value).toBeCloseTo(0.5);
  });

  it('蓝量条反映 player.mana 实时变化', () => {
    player.mana = 80;
    player.emit('mana-changed', 80, 100);
    expect(hud.manaBar.value).toBeCloseTo(0.8);
  });
});

// ── 4. 蓝量自动回复 ──────────────────────────────────────────────────

describe('蓝量自动回复（每秒 +5）', () => {
  it('player.mana 低于满值时 update(1s) 后 mana 增加 5', () => {
    const player = createPlayer();
    player.mana = 50;
    const input = new MockInput();
    player.update(1.0, input, 0);
    expect(player.mana).toBeCloseTo(55, 4);
  });

  it('蓝量回复通过 EventEmitter 更新 HUD', () => {
    const player = createPlayer();
    const hud = createHUD();
    hud.connectPlayer(player);

    player.mana = 50;
    const input = new MockInput();
    player.update(1.0, input, 0);
    // mana = 55 → bar = 55/100 = 0.55
    expect(hud.manaBar.value).toBeCloseTo(0.55, 3);
  });

  it('蓝量满时不超过 maxMana', () => {
    const player = createPlayer();
    const input = new MockInput();
    player.update(10.0, input, 0); // 长时间更新
    expect(player.mana).toBeLessThanOrEqual(100);
  });
});

// ── 5. 技能栏 ──────────────────────────────────────────────────────────

describe('技能栏', () => {
  let hud: HUD;

  beforeEach(() => {
    hud = createHUD();
  });

  it('selectSkill(2) 切换选中技能', () => {
    hud.selectSkill(2);
    expect(hud.selectedSkill).toBe(2);
  });

  it('triggerSkill 后冷却遮罩不透明度 > 0', () => {
    hud.triggerSkill(0);
    expect(hud.skillCooldownMasks[0].opacity).toBeGreaterThan(0);
  });

  it('update(cooldownDuration) 后冷却遮罩透明', () => {
    hud.triggerSkill(0);
    expect(hud.getSkillCooldown(0)).toBeGreaterThan(0);
    hud.update(10); // 超过最大冷却时间
    expect(hud.skillCooldownMasks[0].opacity).toBe(0);
    expect(hud.getSkillCooldown(0)).toBe(0);
  });

  it('冷却期间冷却遮罩不透明度随时间减小', () => {
    hud.triggerSkill(1); // 弓，3s 冷却
    const op0 = hud.skillCooldownMasks[1].opacity;
    hud.update(1); // 过 1 秒
    const op1 = hud.skillCooldownMasks[1].opacity;
    expect(op1).toBeLessThan(op0);
    expect(op1).toBeGreaterThan(0);
  });

  it('冷却期间再次触发技能无效', () => {
    hud.triggerSkill(0);
    const cd0 = hud.getSkillCooldown(0);
    hud.triggerSkill(0); // 再次触发，不重置
    expect(hud.getSkillCooldown(0)).toBeLessThanOrEqual(cd0);
  });

  it('selectSkill 超出范围不崩溃', () => {
    expect(() => hud.selectSkill(-1)).not.toThrow();
    expect(() => hud.selectSkill(4)).not.toThrow();
  });
});

// ── 6. 击杀计数 ────────────────────────────────────────────────────────

describe('击杀计数器', () => {
  it('addKill 后 killCount 增加', () => {
    const hud = createHUD();
    hud.addKill('哥布林');
    expect(hud.killCount).toBe(1);
  });

  it('多次 addKill 累计计数', () => {
    const hud = createHUD();
    hud.addKill('哥布林');
    hud.addKill('骷髅');
    hud.addKill('龙');
    expect(hud.killCount).toBe(3);
  });

  it('killCounterText 文本更新', () => {
    const hud = createHUD();
    hud.addKill('哥布林');
    expect(hud.killCounterText.text).toContain('1');
  });
});

// ── 7. Kill Feed ───────────────────────────────────────────────────────

describe('Kill Feed（右上滚动显示）', () => {
  it('addKill 后 recentKills 更新', () => {
    const hud = createHUD();
    hud.addKill('哥布林');
    expect(hud.recentKills.length).toBe(1);
  });

  it('最多保留 3 条记录', () => {
    const hud = createHUD();
    for (let i = 0; i < 5; i++) hud.addKill(`敌人 ${i}`);
    expect(hud.recentKills.length).toBe(3);
  });

  it('最新击杀在最前面', () => {
    const hud = createHUD();
    hud.addKill('第一');
    hud.addKill('第二');
    hud.addKill('第三');
    expect(hud.recentKills[0]).toContain('第三');
  });

  it('kill feed 使用 UIFlexContainer（vertical）', () => {
    const hud = createHUD();
    expect(hud.killFeed.direction).toBe('vertical');
  });

  it('kill feed slot 文本同步更新', () => {
    const hud = createHUD();
    hud.addKill('哥布林');
    // 第一个 slot 应显示最新击杀
    expect(hud.killFeed.children[0]).toBeDefined();
  });
});

// ── 8. Esc 菜单 ────────────────────────────────────────────────────────

describe('Esc 菜单', () => {
  let hud: HUD;

  beforeEach(() => {
    hud = createHUD();
  });

  it('初始 Esc 菜单不可见', () => {
    expect(hud.escMenu.visible).toBe(false);
  });

  it('toggleEscMenu() 打开菜单', () => {
    hud.toggleEscMenu();
    expect(hud.isPaused).toBe(true);
    expect(hud.escMenu.visible).toBe(true);
  });

  it('两次 toggleEscMenu() 关闭菜单', () => {
    hud.toggleEscMenu();
    hud.toggleEscMenu();
    expect(hud.isPaused).toBe(false);
    expect(hud.escMenu.visible).toBe(false);
  });

  it('resumeButton.onClick 关闭菜单', () => {
    hud.toggleEscMenu();
    hud.resumeButton.handlePointerDown(0, 0);
    hud.resumeButton.handlePointerUp(0, 0);
    expect(hud.isPaused).toBe(false);
    expect(hud.escMenu.visible).toBe(false);
  });
});

// ── 9. UIDropdown 画质 ────────────────────────────────────────────────

describe('UIDropdown — 画质选择', () => {
  it('初始选项为 medium（index=1）', () => {
    const hud = createHUD();
    expect(hud.qualityDropdown.getSelected().value).toBe('medium');
  });

  it('selectByIndex(0) 触发 onQualityChange("low")', () => {
    let received = '';
    const hud = new HUD({
      width: 800, height: 600,
      font: createMockFont(),
      onQualityChange: (q) => { received = q; },
    });
    hud.qualityDropdown.selectByIndex(0);
    expect(received).toBe('low');
  });

  it('selectByIndex(2) 触发 onQualityChange("high")', () => {
    let received = '';
    const hud = new HUD({
      width: 800, height: 600,
      font: createMockFont(),
      onQualityChange: (q) => { received = q; },
    });
    hud.qualityDropdown.selectByIndex(2);
    expect(received).toBe('high');
  });

  it('UIDropdown 有 3 个选项', () => {
    const hud = createHUD();
    expect(hud.qualityDropdown.options.length).toBe(3);
  });
});

// ── 10. UISlider 音量 ─────────────────────────────────────────────────

describe('UISlider — 音量调节', () => {
  it('初始音量为 75', () => {
    const hud = createHUD();
    expect(hud.volumeSlider.value).toBe(75);
  });

  it('setValue(50) 触发 onVolumeChange(50)', () => {
    let received = -1;
    const hud = new HUD({
      width: 800, height: 600,
      font: createMockFont(),
      onVolumeChange: (v) => { received = v; },
    });
    hud.volumeSlider.setValue(50);
    expect(received).toBe(50);
  });

  it('音量范围 0-100', () => {
    const hud = createHUD();
    expect(hud.volumeSlider.min).toBe(0);
    expect(hud.volumeSlider.max).toBe(100);
  });

  it('setValue(0) 最小值', () => {
    const hud = createHUD();
    hud.volumeSlider.setValue(0);
    expect(hud.volumeSlider.value).toBe(0);
  });

  it('setValue(100) 最大值', () => {
    const hud = createHUD();
    hud.volumeSlider.setValue(100);
    expect(hud.volumeSlider.value).toBe(100);
  });
});

// ── 11. UITextInput 玩家名 ────────────────────────────────────────────

describe('UITextInput — 玩家名修改', () => {
  it('初始玩家名为 Player', () => {
    const hud = createHUD();
    expect(hud.playerName).toBe('Player');
  });

  it('UITextInput 提交后更新玩家名', () => {
    const hud = createHUD();
    hud.playerNameInput.focus();
    hud.playerNameInput.onSubmit?.('测试玩家');
    expect(hud.playerName).toBe('测试玩家');
  });

  it('玩家名更新后 playerNameText 文本同步', () => {
    const hud = createHUD();
    hud.playerNameInput.onSubmit?.('英雄');
    expect(hud.playerNameText.text).toBe('英雄');
  });

  it('UITextInput handleKeyDown Enter 触发 onSubmit', () => {
    const hud = createHUD();
    hud.playerNameInput.setValue(''); // 清空初始值
    hud.playerNameInput.focus();
    'NewName'.split('').forEach(c => hud.playerNameInput.handleKeyDown(c));
    hud.playerNameInput.handleKeyDown('Enter');
    expect(hud.playerName).toBe('NewName');
  });

  it('输入框最大长度限制 20 字符', () => {
    const hud = createHUD();
    expect(hud.playerNameInput.maxLength).toBe(20);
  });
});

// ── 12. 背包 ───────────────────────────────────────────────────────────

describe('背包（I 键开关）', () => {
  let hud: HUD;

  beforeEach(() => {
    hud = createHUD();
  });

  it('背包初始关闭，格子不可见', () => {
    expect(hud.inventoryOpen).toBe(false);
    expect(hud.inventoryPanel.visible).toBe(false);
    expect(hud.inventorySlots[0].visible).toBe(false);
  });

  it('toggleInventory() 打开背包', () => {
    hud.toggleInventory();
    expect(hud.inventoryOpen).toBe(true);
    expect(hud.inventoryPanel.visible).toBe(true);
  });

  it('打开后格子变为可见', () => {
    hud.toggleInventory();
    expect(hud.inventorySlots.every(s => s.visible)).toBe(true);
  });

  it('再次 toggleInventory() 关闭背包', () => {
    hud.toggleInventory();
    hud.toggleInventory();
    expect(hud.inventoryOpen).toBe(false);
    expect(hud.inventoryPanel.visible).toBe(false);
  });

  it('关闭背包时 tooltip 隐藏', () => {
    hud.toggleInventory();
    hud.inventoryTooltip.visible = true;
    hud.toggleInventory();
    expect(hud.inventoryTooltip.visible).toBe(false);
  });

  it('点击背包格子触发 tooltip', () => {
    hud.toggleInventory();
    hud.inventorySlots[0].onPointerDown?.({ x: 0, y: 0 });
    expect(hud.inventoryTooltip.visible).toBe(true);
    expect(hud.inventoryTooltip.text).toContain('物品 1');
  });
});

// ── 13. 死亡菜单 ──────────────────────────────────────────────────────

describe('死亡菜单', () => {
  let player: Player;
  let hud: HUD;

  beforeEach(() => {
    player = createPlayer();
    hud = createHUD();
    hud.connectPlayer(player);
  });

  it('初始死亡遮罩不可见', () => {
    expect(hud.deathOverlay.visible).toBe(false);
    expect(hud.isDead).toBe(false);
  });

  it('player.health=0 时死亡遮罩出现', () => {
    player.takeDamage(100);
    expect(hud.isDead).toBe(true);
    expect(hud.deathOverlay.visible).toBe(true);
  });

  it('重生按钮点击后死亡状态解除', () => {
    let respawnCalled = false;
    hud.onRespawn = () => { respawnCalled = true; };

    player.takeDamage(100);
    expect(hud.isDead).toBe(true);

    hud.respawnButton.handlePointerDown(0, 0);
    hud.respawnButton.handlePointerUp(0, 0);

    expect(hud.isDead).toBe(false);
    expect(hud.deathOverlay.visible).toBe(false);
    expect(respawnCalled).toBe(true);
  });

  it('player.respawn() 后死亡状态解除', () => {
    player.takeDamage(100);
    expect(hud.isDead).toBe(true);
    player.respawn();
    expect(hud.isDead).toBe(false);
  });

  it('血量恢复到满血后 healthBar 为 1', () => {
    player.takeDamage(100);
    player.respawn();
    expect(hud.healthBar.value).toBe(1);
  });
});

// ── 14. HUD update 冷却计时 ──────────────────────────────────────────

describe('HUD update — 冷却计时', () => {
  it('update(dt) 减少冷却时间', () => {
    const hud = createHUD();
    hud.triggerSkill(0);
    const cd0 = hud.getSkillCooldown(0);
    hud.update(0.5);
    expect(hud.getSkillCooldown(0)).toBeCloseTo(cd0 - 0.5, 3);
  });

  it('冷却结束后遮罩不透明度归零', () => {
    const hud = createHUD();
    hud.triggerSkill(2); // treat，8s 冷却
    hud.update(100);
    expect(hud.skillCooldownMasks[2].opacity).toBe(0);
    expect(hud.getSkillCooldown(2)).toBe(0);
  });
});
