/**
 * Inventory — 4×4 背包格 + hover tooltip
 * 按 I 键打开/关闭
 */

import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIRect } from '../../../src/ui/ui-rect';
import { UIButton } from '../../../src/ui/ui-button';
import { UIFlexContainer } from '../../../src/ui/ui-flex-container';
import { UIText } from '../../../src/ui/ui-text';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';
import { vec3 } from '../../../src/math/vec3';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

const GRID_COLS = 4;
const GRID_ROWS = 4;
const SLOT_SIZE = 48;
const SLOT_GAP  = 4;

export class Inventory {
  readonly canvas: UICanvas;
  readonly panel: UIRect;
  readonly grid: UIFlexContainer;
  readonly tooltip: UIRect;
  readonly tooltipText: UIText;
  readonly slots: UIButton[] = [];

  private _visible: boolean = false;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);
    this.canvas;

    const gridW = GRID_COLS * SLOT_SIZE + (GRID_COLS - 1) * SLOT_GAP + 16;
    const gridH = GRID_ROWS * SLOT_SIZE + (GRID_ROWS - 1) * SLOT_GAP + 40;
    const px = (width  - gridW) / 2;
    const py = (height - gridH) / 2;

    // 背板
    this.panel = new UIRect({
      name: 'inventoryPanel',
      x: px,
      y: py,
      width: gridW,
      height: gridH,
      color: vec3(0.15, 0.15, 0.2),
      opacity: 0.9,
      visible: false,
    });
    this.canvas.add(this.panel);

    // 4×4 格子（用 UIFlexContainer 按行排列，每行一个 horizontal flex）
    this.grid = new UIFlexContainer({
      name: 'inventoryGrid',
      x: px + 8,
      y: py + 32,
      width: gridW - 16,
      height: gridH - 40,
      direction: 'vertical',
      gap: SLOT_GAP,
      visible: false,
    });
    this.canvas.add(this.grid);

    for (let row = 0; row < GRID_ROWS; row++) {
      const rowContainer = new UIFlexContainer({
        name: `inventory-row-${row}`,
        x: 0,
        y: 0,
        width: gridW - 16,
        height: SLOT_SIZE,
        direction: 'horizontal',
        gap: SLOT_GAP,
      });
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const btn = new UIButton({
          name: `slot-${idx}`,
          x: 0,
          y: 0,
          width: SLOT_SIZE,
          height: SLOT_SIZE,
          label: '',
          normalColor: vec3(0.25, 0.25, 0.35),
          pressedColor: vec3(0.4, 0.4, 0.6),
        });
        rowContainer.add(btn);
        this.slots.push(btn);
      }
      this.grid.add(rowContainer);
    }

    // Tooltip（hover 时显示）
    this.tooltip = new UIRect({
      name: 'inventoryTooltip',
      x: 0,
      y: 0,
      width: 120,
      height: 32,
      color: vec3(0.1, 0.1, 0.15),
      opacity: 0.95,
      visible: false,
    });
    this.canvas.add(this.tooltip);

    this.tooltipText = new UIText({
      font: STUB_FONT,
      name: 'inventoryTooltipText',
      x: 4,
      y: 4,
      width: 112,
      height: 24,
      text: '',
      fontSize: 12,
      color: vec3(1, 1, 1),
      visible: false,
    });
    this.canvas.add(this.tooltipText);
  }

  get visible(): boolean { return this._visible; }

  toggle(): void {
    this._visible = !this._visible;
    this.panel.visible = this._visible;
    this.grid.visible  = this._visible;
    if (!this._visible) {
      this.tooltip.visible = false;
      this.tooltipText.visible = false;
    }
  }

  open():  void { if (!this._visible) this.toggle(); }
  close(): void { if (this._visible)  this.toggle(); }

  showTooltip(slotIndex: number, text: string, x: number, y: number): void {
    if (!this._visible) return;
    this.tooltipText.text = text;
    this.tooltip.x     = x + 10;
    this.tooltip.y     = y + 10;
    this.tooltipText.x = x + 14;
    this.tooltipText.y = y + 14;
    this.tooltip.visible     = true;
    this.tooltipText.visible = true;
  }

  hideTooltip(): void {
    this.tooltip.visible     = false;
    this.tooltipText.visible = false;
  }
}
