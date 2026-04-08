/**
 * ResourceBar — SLG 顶部资源计数栏。
 * 显示金/木资源图标 + 数字，支持实时更新。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIText } from '../../../../src/ui/ui-text';
import { UIRect } from '../../../../src/ui/ui-rect';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

// 占位字体 — 仅满足类型约束，测试环境不进行实际渲染
const STUB_FONT: BitmapFontData = {
  lineHeight: 16,
  base: 12,
  scaleW: 256,
  scaleH: 256,
  chars: new Map(),
};

export class ResourceBar {
  readonly canvas: UICanvas;
  readonly background: UIRect;
  readonly goldText: UIText;
  readonly woodText: UIText;

  private _gold: number = 0;
  private _wood: number = 0;

  constructor(opts: { width: number; height: number }) {
    this.canvas = new UICanvas(opts.width, opts.height);

    // 顶部资源栏背景
    this.background = new UIRect({
      x: 0,
      y: 0,
      width: opts.width,
      height: 40,
      color: vec3(0.1, 0.1, 0.15),
      opacity: 0.8,
    });

    // 金资源文本（左侧）
    this.goldText = new UIText({
      font: STUB_FONT,
      text: '金: 0',
      x: 16,
      y: 12,
      color: vec3(1.0, 0.85, 0.2),
    });

    // 木资源文本（右侧）
    this.woodText = new UIText({
      font: STUB_FONT,
      text: '木: 0',
      x: 160,
      y: 12,
      color: vec3(0.4, 0.9, 0.3),
    });

    this.canvas.add(this.background);
    this.canvas.add(this.goldText);
    this.canvas.add(this.woodText);
  }

  setGold(value: number): void {
    this._gold = value;
    this.goldText.text = `金: ${value}`;
  }

  setWood(value: number): void {
    this._wood = value;
    this.woodText.text = `木: ${value}`;
  }

  get gold(): number { return this._gold; }
  get wood(): number { return this._wood; }
}
