/**
 * Crosshair — 屏幕中心准星。
 * 固定十字准星，支持后坐力扩散和命中闪烁。
 */
import { UICanvas } from '../../../../src/ui/ui-canvas';
import { UIRect } from '../../../../src/ui/ui-rect';
import { vec3 } from '../../../../src/math/vec3';

const LINE_WIDTH = 2;
const LINE_LENGTH = 8;
const BASE_GAP = 4;

export class Crosshair {
  readonly canvas: UICanvas;

  private _spread: number = 0;
  private _hitFlash: number = 0;
  private readonly _lines: UIRect[];

  constructor(width: number, height: number) {
    this.canvas = new UICanvas(width, height);

    const cx = width / 2;
    const cy = height / 2;

    this._lines = [
      // 上
      new UIRect({ x: cx - LINE_WIDTH / 2, y: cy - BASE_GAP - LINE_LENGTH, width: LINE_WIDTH, height: LINE_LENGTH, color: vec3(1, 1, 1) }),
      // 下
      new UIRect({ x: cx - LINE_WIDTH / 2, y: cy + BASE_GAP, width: LINE_WIDTH, height: LINE_LENGTH, color: vec3(1, 1, 1) }),
      // 左
      new UIRect({ x: cx - BASE_GAP - LINE_LENGTH, y: cy - LINE_WIDTH / 2, width: LINE_LENGTH, height: LINE_WIDTH, color: vec3(1, 1, 1) }),
      // 右
      new UIRect({ x: cx + BASE_GAP, y: cy - LINE_WIDTH / 2, width: LINE_LENGTH, height: LINE_WIDTH, color: vec3(1, 1, 1) }),
    ];

    for (const line of this._lines) {
      this.canvas.add(line);
    }
  }

  /** 触发命中红色闪烁 */
  hit(): void {
    this._hitFlash = 0.15;
    for (const line of this._lines) {
      line.color = vec3(1, 0, 0);
    }
  }

  /** 设置准星扩散量（0=默认，越大越散） */
  setSpread(amount: number): void {
    this._spread = Math.max(0, amount);
    this._updatePositions();
  }

  get spread(): number { return this._spread; }

  update(dt: number): void {
    if (this._spread > 0) {
      this._spread = Math.max(0, this._spread - dt * 5);
      this._updatePositions();
    }

    if (this._hitFlash > 0) {
      this._hitFlash -= dt;
      if (this._hitFlash <= 0) {
        this._hitFlash = 0;
        for (const line of this._lines) {
          line.color = vec3(1, 1, 1);
        }
      }
    }
  }

  private _updatePositions(): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const gap = BASE_GAP + this._spread * 20;

    this._lines[0].x = cx - LINE_WIDTH / 2;
    this._lines[0].y = cy - gap - LINE_LENGTH;
    this._lines[1].x = cx - LINE_WIDTH / 2;
    this._lines[1].y = cy + gap;
    this._lines[2].x = cx - gap - LINE_LENGTH;
    this._lines[2].y = cy - LINE_WIDTH / 2;
    this._lines[3].x = cx + gap;
    this._lines[3].y = cy - LINE_WIDTH / 2;
  }
}
