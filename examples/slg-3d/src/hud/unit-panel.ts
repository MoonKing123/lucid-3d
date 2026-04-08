/**
 * UnitPanel — 选中单位信息面板（底部）。
 * 显示选中单位数量和阵营分布，使用 UIFlexContainer 自动布局。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIText } from '../../../../src/ui/ui-text';
import { UIFlexContainer } from '../../../../src/ui/ui-flex-container';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';
import type { UnitData } from '../units';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

export class UnitPanel {
  readonly canvas: UICanvas;
  readonly background: UIRect;
  readonly container: UIFlexContainer;
  readonly countText: UIText;
  readonly allyText: UIText;
  readonly enemyText: UIText;
  readonly neutralText: UIText;

  private _selectedCount: number = 0;

  constructor(opts: { width: number; height: number }) {
    this.canvas = new UICanvas(opts.width, opts.height);

    const panelWidth = 400;
    const panelHeight = 60;
    const panelX = (opts.width - panelWidth) / 2;
    const panelY = opts.height - panelHeight - 8;

    // 底部面板背景
    this.background = new UIRect({
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      color: vec3(0.1, 0.1, 0.15),
      opacity: 0.85,
    });

    // 使用 FlexContainer 水平排列文本
    this.container = new UIFlexContainer({
      x: panelX + 8,
      y: panelY + 8,
      width: panelWidth - 16,
      height: panelHeight - 16,
      direction: 'horizontal',
      gap: 16,
      padding: 0,
    });

    this.countText = new UIText({
      font: STUB_FONT,
      text: '选中: 0',
      width: 90,
      height: 20,
      color: vec3(1, 1, 1),
    });

    this.allyText = new UIText({
      font: STUB_FONT,
      text: '我方: 0',
      width: 80,
      height: 20,
      color: vec3(0.2, 0.5, 1.0),
    });

    this.enemyText = new UIText({
      font: STUB_FONT,
      text: '敌方: 0',
      width: 80,
      height: 20,
      color: vec3(1.0, 0.3, 0.2),
    });

    this.neutralText = new UIText({
      font: STUB_FONT,
      text: '中立: 0',
      width: 80,
      height: 20,
      color: vec3(0.8, 0.8, 0.2),
    });

    this.container.add(this.countText);
    this.container.add(this.allyText);
    this.container.add(this.enemyText);
    this.container.add(this.neutralText);

    this.canvas.add(this.background);
    this.canvas.add(this.container);
  }

  /**
   * 更新选中单位信息面板。
   * @param selectedIds 选中单位 ID 集合
   * @param units 所有单位数据
   */
  update(selectedIds: ReadonlySet<number>, units: UnitData[]): void {
    this._selectedCount = selectedIds.size;

    let ally = 0;
    let enemy = 0;
    let neutral = 0;

    for (const id of selectedIds) {
      const unit = units[id];
      if (!unit) continue;
      switch (unit.faction) {
        case 'ally':    ally++;    break;
        case 'enemy':   enemy++;   break;
        case 'neutral': neutral++; break;
      }
    }

    this.countText.text  = `选中: ${this._selectedCount}`;
    this.allyText.text   = `我方: ${ally}`;
    this.enemyText.text  = `敌方: ${enemy}`;
    this.neutralText.text = `中立: ${neutral}`;
  }

  get selectedCount(): number { return this._selectedCount; }
}
