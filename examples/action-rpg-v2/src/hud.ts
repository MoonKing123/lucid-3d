/**
 * HUD — action-rpg-v2 完整 HUD 系统
 * 准星 + 血量条 + 蓝条 + 技能栏 + 小地图 + Kill Feed
 */

import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIRect } from '../../../src/ui/ui-rect';
import { UIProgressBar } from '../../../src/ui/ui-progress-bar';
import { UIButton } from '../../../src/ui/ui-button';
import { UIText } from '../../../src/ui/ui-text';
import { UIFlexContainer } from '../../../src/ui/ui-flex-container';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';
import { vec3 } from '../../../src/math/vec3';

// 占位字体 — 仅满足类型约束，测试环境不进行实际渲染
const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

const SKILL_COUNT = 5;
const KILL_FEED_DURATION = 3; // 秒
const MINIMAP_SIZE = 120;
const MINIMAP_RANGE = 60; // 世界坐标半径

interface KillFeedEntry {
  text: UIText;
  timer: number;
}

interface SkillSlot {
  button: UIButton;
  cooldownMask: UIRect;
  cooldownMax: number;
  cooldownRemaining: number;
}

export class HUD {
  readonly canvas: UICanvas;

  readonly crosshair: UIRect;
  readonly healthBar: UIProgressBar;
  readonly manaBar: UIProgressBar;
  readonly minimapPanel: UIRect;
  readonly killFeedContainer: UIFlexContainer;

  private readonly _skillSlots: SkillSlot[] = [];
  private readonly _killFeedEntries: KillFeedEntry[] = [];
  private readonly _minimapMarkers: UIRect[] = [];

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    // ── 准星（屏幕中心）────────────────────────────────
    this.crosshair = new UIRect({
      name: 'crosshair',
      x: width / 2 - 8,
      y: height / 2 - 8,
      width: 16,
      height: 16,
      color: vec3(1, 1, 1),
      opacity: 0.8,
    });
    this.canvas.add(this.crosshair);

    // ── 血量条 + 蓝条（左下角）──────────────────────────
    this.healthBar = new UIProgressBar({
      name: 'healthBar',
      x: 10,
      y: height - 50,
      width: 160,
      height: 16,
      value: 1,
      fillColor: vec3(0.8, 0.1, 0.1),
      backgroundColor: vec3(0.2, 0.2, 0.2),
    });
    this.canvas.add(this.healthBar);

    this.manaBar = new UIProgressBar({
      name: 'manaBar',
      x: 10,
      y: height - 28,
      width: 160,
      height: 16,
      value: 1,
      fillColor: vec3(0.1, 0.3, 0.9),
      backgroundColor: vec3(0.2, 0.2, 0.2),
    });
    this.canvas.add(this.manaBar);

    // ── 技能栏（右下角 5 个 UIButton + 冷却遮罩）──────
    for (let i = 0; i < SKILL_COUNT; i++) {
      const bx = width - (SKILL_COUNT - i) * 52 - 10;
      const by = height - 52;
      const button = new UIButton({
        name: `skill-${i + 1}`,
        x: bx,
        y: by,
        width: 44,
        height: 44,
        label: `${i + 1}`,
        normalColor: vec3(0.3, 0.3, 0.4),
        pressedColor: vec3(0.5, 0.5, 0.7),
      });
      const cooldownMask = new UIRect({
        name: `cooldown-mask-${i + 1}`,
        x: bx,
        y: by,
        width: 44,
        height: 0,
        color: vec3(0, 0, 0),
        opacity: 0.6,
        visible: false,
      });
      this.canvas.add(button);
      this.canvas.add(cooldownMask);
      this._skillSlots.push({
        button,
        cooldownMask,
        cooldownMax: 0,
        cooldownRemaining: 0,
      });
    }

    // ── 小地图（左上角）──────────────────────────────────
    this.minimapPanel = new UIRect({
      name: 'minimapPanel',
      x: 10,
      y: 10,
      width: MINIMAP_SIZE,
      height: MINIMAP_SIZE,
      color: vec3(0, 0, 0),
      opacity: 0.5,
    });
    this.canvas.add(this.minimapPanel);

    // 玩家标记（白色中心点）
    const playerDot = new UIRect({
      name: 'minimap-player',
      x: 10 + MINIMAP_SIZE / 2 - 3,
      y: 10 + MINIMAP_SIZE / 2 - 3,
      width: 6,
      height: 6,
      color: vec3(1, 1, 1),
    });
    this.canvas.add(playerDot);

    // 预创建 8 个 enemy 标记（初始隐藏）
    for (let i = 0; i < 8; i++) {
      const marker = new UIRect({
        name: `minimap-enemy-${i}`,
        x: 0,
        y: 0,
        width: 5,
        height: 5,
        color: vec3(1, 0.2, 0.2),
        visible: false,
      });
      this.canvas.add(marker);
      this._minimapMarkers.push(marker);
    }

    // ── Kill Feed（右上角，垂直排列）──────────────────────
    this.killFeedContainer = new UIFlexContainer({
      name: 'killFeedContainer',
      x: width - 220,
      y: 10,
      width: 210,
      height: 120,
      direction: 'vertical',
      gap: 4,
    });
    this.canvas.add(this.killFeedContainer);
  }

  // 触发技能冷却
  triggerSkillCooldown(index: number, cooldownSeconds: number): void {
    if (index < 0 || index >= SKILL_COUNT) return;
    const slot = this._skillSlots[index];
    slot.cooldownMax = cooldownSeconds;
    slot.cooldownRemaining = cooldownSeconds;
    slot.cooldownMask.visible = true;
  }

  // 添加 Kill Feed 条目（3 秒后自动消失）
  addKillFeed(message: string): void {
    const text = new UIText({
      font: STUB_FONT,
      name: `kill-feed-${Date.now()}`,
      x: 0,
      y: 0,
      width: 210,
      height: 20,
      text: message,
      fontSize: 12,
      color: vec3(1, 0.8, 0.2),
    });
    this.killFeedContainer.add(text);
    this._killFeedEntries.push({ text, timer: KILL_FEED_DURATION });
  }

  // 更新小地图 enemy 位置（positions 是世界坐标 {x, z} 数组）
  updateMinimapEnemies(
    playerX: number,
    playerZ: number,
    enemies: Array<{ x: number; z: number; dead?: boolean }>,
  ): void {
    const mx = 10;
    const mz = 10;
    const half = MINIMAP_SIZE / 2;

    enemies.forEach((enemy, i) => {
      if (i >= this._minimapMarkers.length) return;
      const marker = this._minimapMarkers[i];
      if (enemy.dead) {
        marker.visible = false;
        return;
      }
      const dx = (enemy.x - playerX) / MINIMAP_RANGE;
      const dz = (enemy.z - playerZ) / MINIMAP_RANGE;
      if (Math.abs(dx) > 1 || Math.abs(dz) > 1) {
        marker.visible = false;
        return;
      }
      marker.x = mx + half + dx * half - 2;
      marker.y = mz + half + dz * half - 2;
      marker.visible = true;
    });

    for (let i = enemies.length; i < this._minimapMarkers.length; i++) {
      this._minimapMarkers[i].visible = false;
    }
  }

  update(dt: number): void {
    // 更新技能冷却遮罩
    for (const slot of this._skillSlots) {
      if (slot.cooldownRemaining > 0) {
        slot.cooldownRemaining -= dt;
        if (slot.cooldownRemaining <= 0) {
          slot.cooldownRemaining = 0;
          slot.cooldownMask.visible = false;
          slot.cooldownMask.height = 0;
        } else {
          const ratio = slot.cooldownRemaining / slot.cooldownMax;
          slot.cooldownMask.height = 44 * ratio;
        }
      }
    }

    // 更新 Kill Feed 生命周期
    for (let i = this._killFeedEntries.length - 1; i >= 0; i--) {
      const entry = this._killFeedEntries[i];
      entry.timer -= dt;
      if (entry.timer <= 0) {
        this.killFeedContainer.remove(entry.text);
        this._killFeedEntries.splice(i, 1);
      }
    }
  }

  setHealth(value: number): void { this.healthBar.setValue(Math.max(0, Math.min(1, value))); }
  setMana(value: number): void   { this.manaBar.setValue(Math.max(0, Math.min(1, value))); }

  get skillSlots(): readonly SkillSlot[] { return this._skillSlots; }
  get killFeedCount(): number { return this._killFeedEntries.length; }
}
