/**
 * SettingsMenu — Esc 菜单
 * UISlider 音量 + UIDropdown 画质 + UITextInput 玩家名
 */

import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIRect } from '../../../src/ui/ui-rect';
import { UISlider } from '../../../src/ui/ui-slider';
import { UIDropdown, type UIDropdownOption } from '../../../src/ui/ui-dropdown';
import { UITextInput } from '../../../src/ui/ui-text-input';
import { UIText } from '../../../src/ui/ui-text';
import { UIButton } from '../../../src/ui/ui-button';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';
import { vec3 } from '../../../src/math/vec3';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

const QUALITY_OPTIONS: UIDropdownOption[] = [
  { label: 'Low',   value: 'low'   },
  { label: 'Medium', value: 'medium' },
  { label: 'High',  value: 'high'  },
  { label: 'Ultra', value: 'ultra' },
];

export class SettingsMenu {
  readonly canvas: UICanvas;
  readonly panel: UIRect;
  readonly volumeSlider: UISlider;
  readonly qualityDropdown: UIDropdown;
  readonly playerNameInput: UITextInput;
  readonly closeButton: UIButton;

  private _visible: boolean = false;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    const panelW = 320;
    const panelH = 280;
    const px = (width  - panelW) / 2;
    const py = (height - panelH) / 2;

    // 半透明背板
    this.panel = new UIRect({
      name: 'settingsPanel',
      x: px,
      y: py,
      width: panelW,
      height: panelH,
      color: vec3(0.1, 0.1, 0.15),
      opacity: 0.92,
      visible: false,
    });
    this.canvas.add(this.panel);

    // 标题
    const title = new UIText({
      font: STUB_FONT,
      name: 'settingsTitle',
      x: px + 16,
      y: py + 12,
      width: panelW - 32,
      height: 24,
      text: '设置',
      fontSize: 18,
      color: vec3(1, 1, 1),
      visible: false,
    });
    this.canvas.add(title);

    // 音量标签
    const volLabel = new UIText({
      font: STUB_FONT,
      name: 'volumeLabel',
      x: px + 16,
      y: py + 52,
      width: 80,
      height: 20,
      text: '音量',
      fontSize: 14,
      color: vec3(0.8, 0.8, 0.8),
      visible: false,
    });
    this.canvas.add(volLabel);

    // 音量滑块（0-100）
    this.volumeSlider = new UISlider({
      name: 'volumeSlider',
      x: px + 100,
      y: py + 52,
      width: 200,
      height: 20,
      min: 0,
      max: 100,
      value: 50,
      fillColor: vec3(0.2, 0.6, 1),
      trackColor: vec3(0.3, 0.3, 0.3),
      handleColor: vec3(1, 1, 1),
      visible: false,
    });
    this.canvas.add(this.volumeSlider);

    // 画质标签
    const qualLabel = new UIText({
      font: STUB_FONT,
      name: 'qualityLabel',
      x: px + 16,
      y: py + 96,
      width: 80,
      height: 20,
      text: '画质',
      fontSize: 14,
      color: vec3(0.8, 0.8, 0.8),
      visible: false,
    });
    this.canvas.add(qualLabel);

    // 画质下拉框
    this.qualityDropdown = new UIDropdown({
      name: 'qualityDropdown',
      x: px + 100,
      y: py + 96,
      width: 200,
      height: 28,
      options: QUALITY_OPTIONS,
      selectedIndex: 1, // 默认 Medium
      visible: false,
    });
    this.canvas.add(this.qualityDropdown);

    // 玩家名标签
    const nameLabel = new UIText({
      font: STUB_FONT,
      name: 'playerNameLabel',
      x: px + 16,
      y: py + 144,
      width: 80,
      height: 20,
      text: '玩家名',
      fontSize: 14,
      color: vec3(0.8, 0.8, 0.8),
      visible: false,
    });
    this.canvas.add(nameLabel);

    // 玩家名输入框（maxLength=20）
    this.playerNameInput = new UITextInput({
      name: 'playerNameInput',
      x: px + 100,
      y: py + 144,
      width: 200,
      height: 28,
      value: 'Player',
      placeholder: '输入玩家名...',
      maxLength: 20,
      visible: false,
    });
    this.canvas.add(this.playerNameInput);

    // 关闭按钮
    this.closeButton = new UIButton({
      name: 'settingsClose',
      x: px + panelW / 2 - 50,
      y: py + panelH - 48,
      width: 100,
      height: 36,
      label: '关闭',
      normalColor: vec3(0.4, 0.2, 0.2),
      pressedColor: vec3(0.6, 0.3, 0.3),
      visible: false,
      onClick: () => this.close(),
    });
    this.canvas.add(this.closeButton);

    // 收集所有需要随面板显隐的元素（除面板本身）
    this._overlayItems = [title, volLabel, this.volumeSlider, qualLabel,
      this.qualityDropdown, nameLabel, this.playerNameInput, this.closeButton];
  }

  private readonly _overlayItems: Array<{ visible: boolean }>;

  get visible(): boolean { return this._visible; }

  toggle(): void {
    this._visible = !this._visible;
    for (const item of this._overlayItems) item.visible = this._visible;
    this.panel.visible = this._visible;
  }

  open():  void { if (!this._visible) this.toggle(); }
  close(): void { if (this._visible)  this.toggle(); }

  // 设置 onChange 联动
  onVolumeChange(cb: (v: number) => void): void {
    this.volumeSlider.onChange = cb;
  }

  onQualityChange(cb: (opt: UIDropdownOption, idx: number) => void): void {
    this.qualityDropdown.onChange = cb;
  }

  onPlayerNameChange(cb: (value: string) => void): void {
    this.playerNameInput.onChange = cb;
  }
}
