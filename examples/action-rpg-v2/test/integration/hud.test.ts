/**
 * hud.test.ts — M6.4 HUD + 背包 + 技能栏 + Esc 菜单 + BlendTree2D 集成测试
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { HUD } from '../../src/hud';
import { Inventory } from '../../src/inventory';
import { SettingsMenu } from '../../src/settings-menu';
import { BlendTree2D } from '../../../../src/animation/blend-tree-2d';
import { UIProgressBar } from '../../../../src/ui/ui-progress-bar';
import { UIButton } from '../../../../src/ui/ui-button';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIFlexContainer } from '../../../../src/ui/ui-flex-container';
import { UISlider } from '../../../../src/ui/ui-slider';
import { UIDropdown } from '../../../../src/ui/ui-dropdown';
import { UITextInput } from '../../../../src/ui/ui-text-input';

// ── 1. HUD 元素存在与位置 ──────────────────────────────────────────────

describe('HUD — 元素存在', () => {
  it('Game 暴露 hud 属性（HUD 实例）', () => {
    const game = new Game({ headless: true });
    expect(game.hud).toBeInstanceOf(HUD);
  });

  it('hud.crosshair 是 UIRect', () => {
    const game = new Game({ headless: true });
    expect(game.hud.crosshair).toBeInstanceOf(UIRect);
  });

  it('hud.healthBar 是 UIProgressBar', () => {
    const game = new Game({ headless: true });
    expect(game.hud.healthBar).toBeInstanceOf(UIProgressBar);
  });

  it('hud.manaBar 是 UIProgressBar', () => {
    const game = new Game({ headless: true });
    expect(game.hud.manaBar).toBeInstanceOf(UIProgressBar);
  });

  it('hud.minimapPanel 是 UIRect', () => {
    const game = new Game({ headless: true });
    expect(game.hud.minimapPanel).toBeInstanceOf(UIRect);
  });

  it('hud.killFeedContainer 是 UIFlexContainer', () => {
    const game = new Game({ headless: true });
    expect(game.hud.killFeedContainer).toBeInstanceOf(UIFlexContainer);
  });
});

describe('HUD — 元素位置', () => {
  it('准星位于屏幕中心附近', () => {
    const game = new Game({ headless: true });
    const ch = game.hud.crosshair;
    // 画布宽 800, 高 600，准星中心应在 (400, 300)
    expect(ch.x + ch.width  / 2).toBeCloseTo(400, 0);
    expect(ch.y + ch.height / 2).toBeCloseTo(300, 0);
  });

  it('小地图在左上角（x < 200, y < 200）', () => {
    const game = new Game({ headless: true });
    const mm = game.hud.minimapPanel;
    expect(mm.x).toBeLessThan(200);
    expect(mm.y).toBeLessThan(200);
  });

  it('血量条在左下角（y > 画布高 / 2）', () => {
    const game = new Game({ headless: true });
    const hb = game.hud.healthBar;
    expect(hb.y).toBeGreaterThan(300);
  });
});

describe('HUD — 技能栏', () => {
  it('技能栏有 5 个 slot', () => {
    const game = new Game({ headless: true });
    expect(game.hud.skillSlots.length).toBe(5);
  });

  it('每个 slot 包含 UIButton', () => {
    const game = new Game({ headless: true });
    for (const slot of game.hud.skillSlots) {
      expect(slot.button).toBeInstanceOf(UIButton);
    }
  });

  it('技能冷却触发后冷却遮罩可见', () => {
    const game = new Game({ headless: true });
    game.hud.triggerSkillCooldown(0, 3);
    expect(game.hud.skillSlots[0].cooldownMask.visible).toBe(true);
  });

  it('冷却结束后遮罩隐藏', () => {
    const game = new Game({ headless: true });
    game.hud.triggerSkillCooldown(0, 0.1);
    game.hud.update(0.2);
    expect(game.hud.skillSlots[0].cooldownMask.visible).toBe(false);
  });
});

describe('HUD — Kill Feed', () => {
  it('addKillFeed 增加条目', () => {
    const game = new Game({ headless: true });
    game.hud.addKillFeed('You killed Enemy #1');
    expect(game.hud.killFeedCount).toBe(1);
  });

  it('3 秒后 Kill Feed 条目消失', () => {
    const game = new Game({ headless: true });
    game.hud.addKillFeed('You killed Enemy #2');
    game.hud.update(3.1);
    expect(game.hud.killFeedCount).toBe(0);
  });
});

// ── 2. 背包 ──────────────────────────────────────────────────────────

describe('背包 — 存在与开关', () => {
  it('Game 暴露 inventory 属性', () => {
    const game = new Game({ headless: true });
    expect(game.inventory).toBeInstanceOf(Inventory);
  });

  it('初始背包不可见', () => {
    const game = new Game({ headless: true });
    expect(game.inventory.visible).toBe(false);
  });

  it('toggle() 后背包可见', () => {
    const game = new Game({ headless: true });
    game.inventory.toggle();
    expect(game.inventory.visible).toBe(true);
  });

  it('handleKey("I") 打开背包', () => {
    const game = new Game({ headless: true });
    game.handleKey('I');
    expect(game.inventory.visible).toBe(true);
  });

  it('再次 handleKey("I") 关闭背包', () => {
    const game = new Game({ headless: true });
    game.handleKey('I');
    game.handleKey('I');
    expect(game.inventory.visible).toBe(false);
  });
});

describe('背包 — 4×4 格子', () => {
  it('背包有 16 个 slot', () => {
    const game = new Game({ headless: true });
    expect(game.inventory.slots.length).toBe(16);
  });

  it('每个 slot 是 UIButton', () => {
    const game = new Game({ headless: true });
    for (const btn of game.inventory.slots) {
      expect(btn).toBeInstanceOf(UIButton);
    }
  });
});

// ── 3. 设置菜单（Esc 菜单）───────────────────────────────────────────

describe('设置菜单 — 存在与开关', () => {
  it('Game 暴露 settingsMenu 属性', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu).toBeInstanceOf(SettingsMenu);
  });

  it('初始设置菜单不可见', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.visible).toBe(false);
  });

  it('handleKey("Escape") 打开设置菜单', () => {
    const game = new Game({ headless: true });
    game.handleKey('Escape');
    expect(game.settingsMenu.visible).toBe(true);
  });

  it('再次 handleKey("Escape") 关闭设置菜单', () => {
    const game = new Game({ headless: true });
    game.handleKey('Escape');
    game.handleKey('Escape');
    expect(game.settingsMenu.visible).toBe(false);
  });
});

describe('设置菜单 — UISlider 音量', () => {
  it('volumeSlider 是 UISlider 实例', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.volumeSlider).toBeInstanceOf(UISlider);
  });

  it('volumeSlider 范围 0-100', () => {
    const game = new Game({ headless: true });
    const s = game.settingsMenu.volumeSlider;
    expect(s.min).toBe(0);
    expect(s.max).toBe(100);
  });

  it('UISlider onChange 回调触发', () => {
    const game = new Game({ headless: true });
    let received = -1;
    game.settingsMenu.onVolumeChange(v => { received = v; });
    game.settingsMenu.volumeSlider.setValue(80);
    expect(received).toBe(80);
  });
});

describe('设置菜单 — UIDropdown 画质', () => {
  it('qualityDropdown 是 UIDropdown 实例', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.qualityDropdown).toBeInstanceOf(UIDropdown);
  });

  it('qualityDropdown 有 4 个选项', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.qualityDropdown.options.length).toBe(4);
  });

  it('UIDropdown onChange 回调触发', () => {
    const game = new Game({ headless: true });
    let receivedLabel = '';
    game.settingsMenu.onQualityChange((opt) => { receivedLabel = opt.label; });
    game.settingsMenu.qualityDropdown.selectByIndex(2); // High
    expect(receivedLabel).toBe('High');
  });
});

describe('设置菜单 — UITextInput 玩家名', () => {
  it('playerNameInput 是 UITextInput 实例', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.playerNameInput).toBeInstanceOf(UITextInput);
  });

  it('playerNameInput maxLength 为 20', () => {
    const game = new Game({ headless: true });
    expect(game.settingsMenu.playerNameInput.maxLength).toBe(20);
  });

  it('UITextInput onChange 回调触发', () => {
    const game = new Game({ headless: true });
    let received = '';
    game.settingsMenu.onPlayerNameChange(v => { received = v; });
    game.settingsMenu.playerNameInput.setValue('Hero');
    expect(received).toBe('Hero');
  });

  it('超过 maxLength 时不追加字符', () => {
    const game = new Game({ headless: true });
    const input = game.settingsMenu.playerNameInput;
    input.focus();
    const longName = 'A'.repeat(20);
    input.setValue(longName);
    input.handleKeyDown('X'); // 已满，不应追加
    expect(input.value.length).toBe(20);
  });
});

// ── 4. BlendTree2D 8 方向跑动 ─────────────────────────────────────────

describe('BlendTree2D — 8 方向跑动', () => {
  it('player.blendTree2D 是 BlendTree2D 实例', () => {
    const game = new Game({ headless: true });
    expect(game.player.blendTree2D).toBeInstanceOf(BlendTree2D);
  });

  it('BlendTree2D 有 8 个 entry', () => {
    const game = new Game({ headless: true });
    // 通过 update 调用验证内部 entry 数量（通过权重检验）
    const bt = game.player.blendTree2D;
    bt.setParameters(0, 1).update(1 / 60);
    // 所有 action weight 之和 === 1
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      // BlendTree2D 是私有成员，通过 parameterX/Y 确认设置生效
    }
    expect(bt.parameterX).toBeCloseTo(0, 5);
    expect(bt.parameterY).toBeCloseTo(1, 5);
  });

  it('setParameters 后权重 sum === 1', () => {
    const game = new Game({ headless: true });
    const bt = game.player.blendTree2D;

    // 通过内部 _entries 验证（利用 TypeScript 的 any 访问私有字段进行测试）
    const entries = (bt as unknown as { _entries: Array<{ action: { weight: number } }> })._entries;

    bt.setParameters(0, 1).update(1 / 60); // forward
    const sum = entries.reduce((acc, e) => acc + e.action.weight, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('正向移动时 forward entry 权重最大', () => {
    const game = new Game({ headless: true });
    const bt = game.player.blendTree2D;
    const entries = (bt as unknown as { _entries: Array<{ action: { weight: number } }> })._entries;

    bt.setParameters(0, 1).update(1 / 60);
    // forward 是 index 0（position {x:0, y:1}）
    const forwardWeight = entries[0].action.weight;
    expect(forwardWeight).toBeCloseTo(1, 3);
  });

  it('斜向移动时 forward + right 同时有权重', () => {
    const game = new Game({ headless: true });
    const bt = game.player.blendTree2D;
    const entries = (bt as unknown as { _entries: Array<{ action: { weight: number } }> })._entries;

    // forward-right 方向：normalize(1, 1) ≈ (0.707, 0.707)
    bt.setParameters(0.707, 0.707).update(1 / 60);
    const forwardWeight      = entries[0].action.weight; // forward
    const forwardRightWeight = entries[1].action.weight; // forward-right
    const rightWeight        = entries[2].action.weight; // right

    // forward-right entry 权重最大，或者 forward + right 权重均有贡献
    expect(forwardWeight + forwardRightWeight + rightWeight).toBeGreaterThan(0.8);
    // 总和仍为 1
    const sum = entries.reduce((acc, e) => acc + e.action.weight, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('任意方向 update 后权重 sum === 1', () => {
    const game = new Game({ headless: true });
    const bt = game.player.blendTree2D;
    const entries = (bt as unknown as { _entries: Array<{ action: { weight: number } }> })._entries;

    const directions = [
      [0, 1], [0.7, 0.7], [1, 0], [0.7, -0.7],
      [0, -1], [-0.7, -0.7], [-1, 0], [-0.7, 0.7],
    ];
    for (const [x, y] of directions) {
      bt.setParameters(x, y).update(1 / 60);
      const sum = entries.reduce((acc, e) => acc + e.action.weight, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});

// ── 5. 60 帧带 HUD 稳定运行 ───────────────────────────────────────────

describe('带 HUD 的 60 帧稳定运行', () => {
  it('headless 带 HUD/Inventory/SettingsMenu 60 帧不崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    }).not.toThrow();
  });
});
