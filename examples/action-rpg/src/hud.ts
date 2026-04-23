import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIProgressBar } from '../../../src/ui/ui-progress-bar';
import { UIText } from '../../../src/ui/ui-text';
import { UIButton } from '../../../src/ui/ui-button';
import { UISlider } from '../../../src/ui/ui-slider';
import { UIDropdown } from '../../../src/ui/ui-dropdown';
import { UITextInput } from '../../../src/ui/ui-text-input';
import { UIFlexContainer } from '../../../src/ui/ui-flex-container';
import { UIRect } from '../../../src/ui/ui-rect';
import { vec3 } from '../../../src/math/vec3';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';
import type { Player } from './player';

export interface HUDOptions {
  width: number;
  height: number;
  font: BitmapFontData;
  onResume?: () => void;
  onQuit?: () => void;
  onQualityChange?: (quality: string) => void;
  onVolumeChange?: (volume: number) => void;
  onRespawn?: () => void;
}

const SKILL_NAMES = ['剑', '弓', '治疗', 'Dash'];
const SKILL_COOLDOWNS = [1.5, 3.0, 8.0, 5.0];
const KILL_FEED_SIZE = 3;

export class HUD {
  readonly canvas: UICanvas;

  // ── 顶部状态栏 ──
  readonly healthBar: UIProgressBar;
  readonly manaBar: UIProgressBar;
  readonly playerNameText: UIText;

  // ── 技能栏 ──
  readonly skillSlots: UIRect[];
  readonly skillCooldownMasks: UIRect[];
  private _selectedSkill: number = 0;
  private _skillCooldowns: number[];
  private _skillMaxCooldowns: number[];

  // ── 击杀计数 ──
  readonly killCounterText: UIText;
  private _killCount: number = 0;

  // ── Kill feed ──
  readonly killFeed: UIFlexContainer;
  private readonly _killFeedSlots: UIText[];
  private readonly _recentKills: string[] = [];

  // ── Esc 菜单 ──
  readonly escMenu: UIRect;
  readonly qualityDropdown: UIDropdown;
  readonly volumeSlider: UISlider;
  readonly playerNameInput: UITextInput;
  readonly resumeButton: UIButton;
  readonly quitButton: UIButton;
  private _paused: boolean = false;

  // ── 背包 ──
  readonly inventoryPanel: UIRect;
  readonly inventorySlots: UIRect[];
  readonly inventoryTooltip: UIText;
  private _inventoryOpen: boolean = false;

  // ── 死亡遮罩 ──
  readonly deathOverlay: UIRect;
  readonly respawnButton: UIButton;
  readonly deathQuitButton: UIButton;
  private _isDead: boolean = false;

  // ── 玩家名 ──
  private _playerName: string = 'Player';

  // ── 回调 ──
  onVolumeChange: ((volume: number) => void) | null;
  onQualityChange: ((quality: string) => void) | null;
  onQuit: (() => void) | null;
  onRespawn: (() => void) | null;

  constructor(opts: HUDOptions) {
    const { width, height, font } = opts;
    this.onVolumeChange  = opts.onVolumeChange  ?? null;
    this.onQualityChange = opts.onQualityChange ?? null;
    this.onQuit          = opts.onQuit          ?? null;
    this.onRespawn       = opts.onRespawn       ?? null;

    this.canvas = new UICanvas(width, height);

    // ── 血量条（左上） ──
    this.healthBar = new UIProgressBar({
      x: 10, y: 10, width: 200, height: 20,
      fillColor: vec3(0.9, 0.1, 0.1),
      backgroundColor: vec3(0.3, 0.0, 0.0),
      value: 1,
    });

    // ── 蓝量条（血量条右侧） ──
    this.manaBar = new UIProgressBar({
      x: 220, y: 10, width: 200, height: 20,
      fillColor: vec3(0.1, 0.3, 0.9),
      backgroundColor: vec3(0.0, 0.0, 0.3),
      value: 1,
    });

    // ── 玩家名（顶部中间） ──
    this.playerNameText = new UIText({
      font, text: 'Player',
      x: width / 2, y: 10,
      width: 200, height: 20,
      anchor: 'topCenter',
      fontSize: 16,
      color: vec3(1, 1, 1),
    });

    this.canvas.add(this.healthBar);
    this.canvas.add(this.manaBar);
    this.canvas.add(this.playerNameText);

    // ── 击杀计数（左下） ──
    this.killCounterText = new UIText({
      font, text: '击杀: 0',
      x: 10, y: height - 80,
      width: 120, height: 20,
      fontSize: 14,
      color: vec3(1, 1, 0.5),
    });
    this.canvas.add(this.killCounterText);

    // ── Kill feed（右上，vertical flex） ──
    this.killFeed = new UIFlexContainer({
      direction: 'vertical',
      gap: 4,
      x: width - 220, y: 40,
      width: 210, height: 80,
    });
    this._killFeedSlots = [];
    for (let i = 0; i < KILL_FEED_SIZE; i++) {
      const slot = new UIText({
        font, text: '',
        x: 0, y: 0,
        width: 210, height: 20,
        fontSize: 13,
        color: vec3(1, 0.8, 0.5),
      });
      this._killFeedSlots.push(slot);
      this.killFeed.add(slot);
    }
    this.canvas.add(this.killFeed);

    // ── 技能栏（底部中央） ──
    this.skillSlots = [];
    this.skillCooldownMasks = [];
    this._skillCooldowns    = [0, 0, 0, 0];
    this._skillMaxCooldowns = [...SKILL_COOLDOWNS];

    const slotSize = 50;
    const slotGap  = 8;
    const skillBarX = (width - (slotSize * 4 + slotGap * 3)) / 2;
    const skillBarY = height - 70;

    for (let i = 0; i < 4; i++) {
      const sx = skillBarX + i * (slotSize + slotGap);
      const slot = new UIRect({
        x: sx, y: skillBarY,
        width: slotSize, height: slotSize,
        color: i === 0 ? vec3(0.5, 0.5, 0.8) : vec3(0.25, 0.25, 0.35),
      });

      const mask = new UIRect({
        x: sx, y: skillBarY,
        width: slotSize, height: slotSize,
        color: vec3(0, 0, 0),
        opacity: 0,
        visible: true,
      });

      // 技能名标签
      const label = new UIText({
        font, text: SKILL_NAMES[i],
        x: sx + 4, y: skillBarY + 4,
        width: slotSize, height: 20,
        fontSize: 12,
        color: vec3(1, 1, 1),
      });

      this.skillSlots.push(slot);
      this.skillCooldownMasks.push(mask);

      this.canvas.add(slot);
      this.canvas.add(label);
      this.canvas.add(mask);
    }

    // ── Esc 菜单（居中，默认隐藏） ──
    const menuW = 320, menuH = 300;
    this.escMenu = new UIRect({
      x: (width - menuW) / 2, y: (height - menuH) / 2,
      width: menuW, height: menuH,
      color: vec3(0.1, 0.1, 0.15),
      visible: false,
      opacity: 0.92,
    });

    const menuX = (width - menuW) / 2 + 20;
    let menuCurY = (height - menuH) / 2 + 20;

    this.qualityDropdown = new UIDropdown({
      x: menuX, y: menuCurY,
      width: 280, height: 32,
      options: [
        { label: '低', value: 'low' },
        { label: '中', value: 'medium' },
        { label: '高', value: 'high' },
      ],
      selectedIndex: 1,
      onChange: (opt) => {
        this.onQualityChange?.(opt.value);
      },
    });
    menuCurY += 50;

    this.volumeSlider = new UISlider({
      x: menuX, y: menuCurY,
      width: 280, height: 20,
      min: 0, max: 100, value: 75,
      onChange: (v) => {
        this.onVolumeChange?.(v);
      },
    });
    menuCurY += 44;

    this.playerNameInput = new UITextInput({
      x: menuX, y: menuCurY,
      width: 280, height: 32,
      value: 'Player',
      placeholder: '输入玩家名',
      maxLength: 20,
      onSubmit: (v) => {
        this._playerName = v;
        this.playerNameText.text = v;
      },
    });
    menuCurY += 52;

    this.resumeButton = new UIButton({
      x: menuX, y: menuCurY,
      width: 120, height: 36,
      label: '继续',
      onClick: () => {
        this._paused = false;
        this.escMenu.visible = false;
      },
    });

    this.quitButton = new UIButton({
      x: menuX + 140, y: menuCurY,
      width: 120, height: 36,
      label: '退出',
      onClick: () => {
        this.onQuit?.();
      },
    });

    this.canvas.add(this.escMenu);
    this.canvas.add(this.qualityDropdown);
    this.canvas.add(this.volumeSlider);
    this.canvas.add(this.playerNameInput);
    this.canvas.add(this.resumeButton);
    this.canvas.add(this.quitButton);

    // ── 背包（居中，默认隐藏） ──
    const invW = 240, invH = 240;
    const cellSize = 50, cellGap = 4;
    this.inventoryPanel = new UIRect({
      x: (width - invW) / 2, y: (height - invH) / 2,
      width: invW, height: invH,
      color: vec3(0.12, 0.12, 0.18),
      visible: false,
      opacity: 0.9,
    });

    this.inventorySlots = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const sx = (width - invW) / 2 + 10 + col * (cellSize + cellGap);
        const sy = (height - invH) / 2 + 10 + row * (cellSize + cellGap);
        const cell = new UIRect({
          x: sx, y: sy,
          width: cellSize, height: cellSize,
          color: vec3(0.2, 0.2, 0.28),
          visible: false,
          interactive: true,
        });
        cell.onPointerDown = () => {
          this.inventoryTooltip.visible = true;
          this.inventoryTooltip.text = `物品 ${row * 4 + col + 1}`;
        };
        this.inventorySlots.push(cell);
        this.canvas.add(cell);
      }
    }

    this.inventoryTooltip = new UIText({
      font, text: '',
      x: (width - invW) / 2 + 10, y: (height - invH) / 2 + invH + 8,
      width: 200, height: 20,
      fontSize: 13,
      color: vec3(1, 1, 0.8),
      visible: false,
    });
    this.canvas.add(this.inventoryPanel);
    this.canvas.add(this.inventoryTooltip);

    // ── 死亡遮罩（全屏半透明，默认隐藏） ──
    this.deathOverlay = new UIRect({
      x: 0, y: 0,
      width: width, height: height,
      color: vec3(0, 0, 0),
      opacity: 0.7,
      visible: false,
    });

    this.respawnButton = new UIButton({
      x: (width - 120) / 2 - 70, y: height / 2 + 20,
      width: 120, height: 40,
      label: '重生',
      onClick: () => {
        this._isDead = false;
        this.deathOverlay.visible = false;
        this.onRespawn?.();
      },
    });

    this.deathQuitButton = new UIButton({
      x: (width - 120) / 2 + 70, y: height / 2 + 20,
      width: 120, height: 40,
      label: '退出',
      onClick: () => {
        this.onQuit?.();
      },
    });

    this.canvas.add(this.deathOverlay);
    this.canvas.add(this.respawnButton);
    this.canvas.add(this.deathQuitButton);
  }

  // ── 连接 Player EventEmitter ──

  connectPlayer(player: Player): void {
    player.on('health-changed', (health, maxHealth) => {
      this.healthBar.setValue(health / maxHealth);
    });

    player.on('mana-changed', (mana, maxMana) => {
      this.manaBar.setValue(mana / maxMana);
    });

    player.on('died', () => {
      this._isDead = true;
      this.deathOverlay.visible = true;
      this.respawnButton.visible = true;
      this.deathQuitButton.visible = true;
    });

    player.on('respawned', () => {
      this._isDead = false;
      this.deathOverlay.visible = false;
    });
  }

  // ── 技能栏 ──

  selectSkill(index: number): void {
    if (index < 0 || index >= 4) return;
    this.skillSlots[this._selectedSkill].color = vec3(0.25, 0.25, 0.35);
    this._selectedSkill = index;
    this.skillSlots[index].color = vec3(0.5, 0.5, 0.8);
  }

  triggerSkill(index: number): void {
    if (index < 0 || index >= 4) return;
    if (this._skillCooldowns[index] > 0) return;
    this._skillCooldowns[index]    = this._skillMaxCooldowns[index];
    this.skillCooldownMasks[index].opacity = 0.6;
  }

  // ── 击杀 ──

  addKill(enemyName: string): void {
    this._killCount++;
    this.killCounterText.text = `击杀: ${this._killCount}`;

    this._recentKills.unshift(`${enemyName} 已击败`);
    if (this._recentKills.length > KILL_FEED_SIZE) {
      this._recentKills.length = KILL_FEED_SIZE;
    }

    for (let i = 0; i < KILL_FEED_SIZE; i++) {
      this._killFeedSlots[i].text = this._recentKills[i] ?? '';
    }
    this.killFeed.layout();
  }

  // ── Esc 菜单 ──

  toggleEscMenu(): void {
    this._paused = !this._paused;
    this.escMenu.visible     = this._paused;
    this.qualityDropdown.visible = this._paused;
    this.volumeSlider.visible    = this._paused;
    this.playerNameInput.visible = this._paused;
    this.resumeButton.visible    = this._paused;
    this.quitButton.visible      = this._paused;
  }

  // ── 背包 ──

  toggleInventory(): void {
    this._inventoryOpen = !this._inventoryOpen;
    this.inventoryPanel.visible = this._inventoryOpen;
    for (const slot of this.inventorySlots) {
      slot.visible = this._inventoryOpen;
    }
    if (!this._inventoryOpen) {
      this.inventoryTooltip.visible = false;
    }
  }

  // ── 每帧更新（冷却计时） ──

  update(dt: number): void {
    for (let i = 0; i < 4; i++) {
      if (this._skillCooldowns[i] > 0) {
        this._skillCooldowns[i] -= dt;
        if (this._skillCooldowns[i] <= 0) {
          this._skillCooldowns[i] = 0;
          this.skillCooldownMasks[i].opacity = 0;
        } else {
          this.skillCooldownMasks[i].opacity =
            0.6 * (this._skillCooldowns[i] / this._skillMaxCooldowns[i]);
        }
      }
    }
  }

  // ── 只读访问器 ──

  get isPaused(): boolean { return this._paused; }
  get inventoryOpen(): boolean { return this._inventoryOpen; }
  get isDead(): boolean { return this._isDead; }
  get killCount(): number { return this._killCount; }
  get selectedSkill(): number { return this._selectedSkill; }
  get playerName(): string { return this._playerName; }
  get recentKills(): readonly string[] { return this._recentKills; }

  getSkillCooldown(index: number): number {
    return this._skillCooldowns[index] ?? 0;
  }
}
