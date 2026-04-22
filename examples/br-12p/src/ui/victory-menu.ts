/**
 * VictoryMenu — 最后存活时显示胜利菜单。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIText } from '../../../../src/ui/ui-text';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars: new Map(),
};

export class VictoryMenu {
  readonly canvas: UICanvas;
  readonly overlay: UIRect;
  readonly titleText: UIText;
  readonly statsText: UIText;

  visible: boolean = false;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    this.overlay = new UIRect({
      x: 0, y: 0,
      width, height,
      color: vec3(0, 0.1, 0.3),
      opacity: 0.7,
      visible: false,
    });

    this.titleText = new UIText({
      font: STUB_FONT,
      text: 'VICTORY ROYALE!',
      x: width / 2 - 80,
      y: height / 2 - 60,
      color: vec3(1.0, 0.85, 0.2),
      visible: false,
    });

    this.statsText = new UIText({
      font: STUB_FONT,
      text: '',
      x: width / 2 - 80,
      y: height / 2,
      color: vec3(1, 1, 1),
      visible: false,
    });

    this.canvas.add(this.overlay);
    this.canvas.add(this.titleText);
    this.canvas.add(this.statsText);
  }

  show(survivalTime: number, kills: number): void {
    this.visible = true;
    const mins = Math.floor(survivalTime / 60);
    const secs = Math.floor(survivalTime % 60).toString().padStart(2, '0');
    this.statsText.text = `Time: ${mins}:${secs} | Kills: ${kills}`;
    this.overlay.visible = true;
    this.titleText.visible = true;
    this.statsText.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.overlay.visible = false;
    this.titleText.visible = false;
    this.statsText.visible = false;
  }
}
