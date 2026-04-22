/**
 * HealthBar — 左下角血量条 + 数字。
 * 血量 > 60% 绿色，30%-60% 黄色，< 30% 红色。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIProgressBar } from '../../../../src/ui/ui-progress-bar';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIText } from '../../../../src/ui/ui-text';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars: new Map(),
};

const BAR_WIDTH = 200;
const BAR_HEIGHT = 20;

export class HealthBar {
  readonly canvas: UICanvas;
  readonly bar: UIProgressBar;
  readonly background: UIRect;
  readonly label: UIText;

  private _current: number = 100;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    const barX = 16;
    const barY = height - 40;

    this.background = new UIRect({
      x: barX - 2,
      y: barY - 2,
      width: BAR_WIDTH + 4,
      height: BAR_HEIGHT + 4,
      color: vec3(0, 0, 0),
      opacity: 0.7,
    });

    this.bar = new UIProgressBar({
      x: barX,
      y: barY,
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      value: 1,
      fillColor: vec3(0.2, 0.8, 0.2),
      backgroundColor: vec3(0.2, 0.2, 0.2),
    });

    this.label = new UIText({
      font: STUB_FONT,
      text: '100/100',
      x: barX,
      y: barY - 20,
      color: vec3(1, 1, 1),
    });

    this.canvas.add(this.background);
    this.canvas.add(this.bar);
    this.canvas.add(this.label);
  }

  update(current: number, max: number): void {
    this._current = current;
    const ratio = max > 0 ? current / max : 0;
    this.bar.setValue(ratio);
    this.label.text = `${Math.ceil(current)}/${max}`;

    if (ratio > 0.6) {
      this.bar.fillColor = vec3(0.2, 0.8, 0.2);
    } else if (ratio > 0.3) {
      this.bar.fillColor = vec3(0.9, 0.8, 0.1);
    } else {
      this.bar.fillColor = vec3(0.9, 0.2, 0.1);
    }
  }

  get value(): number { return this._current; }
}
