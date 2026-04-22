/**
 * DeathMenu — 本地玩家死亡时全屏显示，3s 倒计时后自动复活。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { UIText } from '../../../../src/ui/ui-text';
import { UIButton } from '../../../../src/ui/ui-button';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars: new Map(),
};

const RESPAWN_TIME = 3.0;

export class DeathMenu {
  readonly canvas: UICanvas;
  readonly overlay: UIRect;
  readonly titleText: UIText;
  readonly countdownText: UIText;
  readonly respawnBtn: UIButton;

  visible: boolean = false;
  onRespawn: (() => void) | null = null;

  private _countdown: number = 0;
  private _active: boolean = false;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    this.overlay = new UIRect({
      x: 0, y: 0,
      width, height,
      color: vec3(0.2, 0, 0),
      opacity: 0.6,
      visible: false,
    });

    this.titleText = new UIText({
      font: STUB_FONT,
      text: 'YOU DIED',
      x: width / 2 - 50,
      y: height / 2 - 60,
      color: vec3(1, 0.2, 0.2),
      visible: false,
    });

    this.countdownText = new UIText({
      font: STUB_FONT,
      text: 'Respawning in 3...',
      x: width / 2 - 80,
      y: height / 2,
      color: vec3(1, 1, 1),
      visible: false,
    });

    this.respawnBtn = new UIButton({
      x: width / 2 - 75,
      y: height / 2 + 40,
      width: 150,
      height: 40,
      label: 'Respawn Now',
      normalColor: vec3(0.4, 0.2, 0.2),
      interactive: true,
      visible: false,
    });
    this.respawnBtn.onClick = () => this._doRespawn();

    this.canvas.add(this.overlay);
    this.canvas.add(this.titleText);
    this.canvas.add(this.countdownText);
    this.canvas.add(this.respawnBtn);
  }

  show(): void {
    this.visible = true;
    this._countdown = RESPAWN_TIME;
    this._active = true;
    this.overlay.visible = true;
    this.titleText.visible = true;
    this.countdownText.visible = true;
    this.respawnBtn.visible = true;
    this.countdownText.text = `Respawning in ${Math.ceil(this._countdown)}...`;
  }

  hide(): void {
    this.visible = false;
    this._active = false;
    this.overlay.visible = false;
    this.titleText.visible = false;
    this.countdownText.visible = false;
    this.respawnBtn.visible = false;
  }

  get countdown(): number { return this._countdown; }

  update(dt: number): void {
    if (!this._active) return;
    this._countdown -= dt;
    this.countdownText.text = `Respawning in ${Math.ceil(Math.max(0, this._countdown))}...`;
    if (this._countdown <= 0) {
      this._doRespawn();
    }
  }

  private _doRespawn(): void {
    this.hide();
    this.onRespawn?.();
  }
}
