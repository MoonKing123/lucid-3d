import { UICanvas } from '../../../src/ui/ui-canvas';
import { UIText } from '../../../src/ui/ui-text';
import { UIProgressBar } from '../../../src/ui/ui-progress-bar';
import type { BitmapFontData } from '../../../src/renderer/bitmap-font';

// 占位字体 — 仅满足类型约束，测试环境不进行实际渲染
const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

export class HUD {
  readonly canvas: UICanvas;
  readonly goldText: UIText;
  readonly waveText: UIText;
  readonly livesText: UIText;
  readonly livesBar: UIProgressBar;

  private _gold: number = 0;
  private _wave: number = 0;
  private _lives: number = 0;
  private readonly _maxLives: number;

  constructor(opts: { width: number; height: number; maxLives: number }) {
    this._maxLives = opts.maxLives;
    this.canvas = new UICanvas(opts.width, opts.height);

    this.goldText = new UIText({ font: STUB_FONT, text: 'Gold: 0', x: 16, y: 16 });
    this.waveText = new UIText({ font: STUB_FONT, text: 'Wave: 0', x: 16, y: 48 });
    this.livesText = new UIText({
      font: STUB_FONT,
      text: `Lives: 0/${opts.maxLives}`,
      x: 16,
      y: 80,
    });
    this.livesBar = new UIProgressBar({ x: 16, y: 112, width: 200, height: 16, value: 0 });

    this.canvas.add(this.goldText);
    this.canvas.add(this.waveText);
    this.canvas.add(this.livesText);
    this.canvas.add(this.livesBar);
  }

  setGold(value: number): void {
    this._gold = value;
    this.goldText.text = `Gold: ${value}`;
  }

  setWave(value: number): void {
    this._wave = value;
    this.waveText.text = `Wave: ${value}`;
  }

  setLives(value: number): void {
    this._lives = value;
    this.livesText.text = `Lives: ${value}/${this._maxLives}`;
    this.livesBar.value = value;
  }

  get gold(): number { return this._gold; }
  get wave(): number { return this._wave; }
  get lives(): number { return this._lives; }
}
