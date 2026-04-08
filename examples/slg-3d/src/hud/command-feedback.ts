/**
 * CommandFeedback — 命令反馈标记。
 * 右键命令（移动/采集）时，在屏幕坐标位置短暂显示一个方块标记（0.5s 淡出）。
 */
import { UIRect } from '../../../../src/ui/ui-rect';
import { vec3 } from '../../../../src/math/vec3';

/** 命令反馈持续时间（秒） */
const FEEDBACK_DURATION = 0.5;
/** 标记尺寸（像素） */
const MARKER_SIZE = 20;

export class CommandFeedback {
  readonly marker: UIRect;

  private _isActive: boolean = false;
  private _elapsed: number = 0;

  constructor(_opts?: { canvasWidth?: number; canvasHeight?: number }) {
    this.marker = new UIRect({
      x: 0,
      y: 0,
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      color: vec3(0.2, 1.0, 0.4),
      opacity: 0,
    });
    this.marker.visible = false;
  }

  /**
   * 在屏幕坐标处显示命令反馈标记。
   * @param screenX 屏幕 X 坐标（像素）
   * @param screenY 屏幕 Y 坐标（像素）
   */
  show(screenX: number, screenY: number): void {
    this.marker.x = screenX - MARKER_SIZE / 2;
    this.marker.y = screenY - MARKER_SIZE / 2;
    this.marker.opacity = 1.0;
    this.marker.visible = true;
    this._isActive = true;
    this._elapsed = 0;
  }

  /**
   * 逐帧更新，淡出效果。
   * @param dt 帧时间（秒）
   */
  update(dt: number): void {
    if (!this._isActive) return;
    this._elapsed += dt;
    if (this._elapsed >= FEEDBACK_DURATION) {
      this._isActive = false;
      this.marker.visible = false;
      this.marker.opacity = 0;
    } else {
      // 线性淡出
      this.marker.opacity = 1.0 - this._elapsed / FEEDBACK_DURATION;
    }
  }

  get isActive(): boolean { return this._isActive; }
  get elapsed(): number { return this._elapsed; }
}
