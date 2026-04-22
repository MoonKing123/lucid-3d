/**
 * AmmoDisplay — 右下角弹药数字 + 换弹进度条。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIProgressBar } from '../../../../src/ui/ui-progress-bar';
import { UIText } from '../../../../src/ui/ui-text';
import { vec3 } from '../../../../src/math/vec3';
import type { BitmapFontData } from '../../../../src/renderer/bitmap-font';

const STUB_FONT: BitmapFontData = {
  lineHeight: 16, base: 12, scaleW: 256, scaleH: 256, chars: new Map(),
};

export class AmmoDisplay {
  readonly canvas: UICanvas;
  readonly ammoText: UIText;
  readonly reloadBar: UIProgressBar;
  readonly reloadLabel: UIText;

  private _ammo: number = 30;
  private _isReloading: boolean = false;

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    const x = width - 160;
    const y = height - 70;

    this.ammoText = new UIText({
      font: STUB_FONT,
      text: '30 / 30',
      x,
      y,
      color: vec3(1, 1, 1),
      fontSize: 24,
    });

    this.reloadBar = new UIProgressBar({
      x,
      y: y + 32,
      width: 140,
      height: 8,
      value: 0,
      fillColor: vec3(1, 0.8, 0.2),
      backgroundColor: vec3(0.2, 0.2, 0.2),
      visible: false,
    });

    this.reloadLabel = new UIText({
      font: STUB_FONT,
      text: 'Reloading...',
      x,
      y: y + 44,
      color: vec3(1, 0.8, 0.2),
      visible: false,
    });

    this.canvas.add(this.ammoText);
    this.canvas.add(this.reloadBar);
    this.canvas.add(this.reloadLabel);
  }

  setAmmo(ammo: number, maxAmmo: number): void {
    this._ammo = ammo;
    this.ammoText.text = `${ammo} / ${maxAmmo}`;
  }

  setReloading(isReloading: boolean, progress = 0): void {
    this._isReloading = isReloading;
    this.reloadBar.visible = isReloading;
    this.reloadLabel.visible = isReloading;
    if (isReloading) {
      this.reloadBar.setValue(progress);
    }
  }

  get ammo(): number { return this._ammo; }
  get isReloading(): boolean { return this._isReloading; }
}
