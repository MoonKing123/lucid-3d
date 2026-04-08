/**
 * InputSelectHandler — 鼠标事件绑定到 SelectionSystem。
 *
 * - 左键点击（<5px 移动）→ 单选
 * - Shift + 左键点击 → 追加/移除单选
 * - 左键按下 + 拖动（≥5px）→ 框选（松开时触发）
 * - 点击空地 → 清空选中
 *
 * 框选矩形使用 DOM overlay（position:fixed 的 div），不修改 src/。
 */
import { type OrbitCamera } from '../../../src/core/orbit-camera';
import { SelectionSystem, type SelectRect } from './selection';

export class InputSelectHandler {
  private _canvas: HTMLCanvasElement;
  private _selection: SelectionSystem;
  private _camera: OrbitCamera;

  private _mouseDown = false;
  private _startX = 0;
  private _startY = 0;
  private _dragging = false;

  /** 框选 DOM overlay */
  private _rectOverlay: HTMLDivElement | null = null;

  /** 是否当前按着 Shift */
  private _shiftKey = false;

  constructor(
    canvas: HTMLCanvasElement,
    selection: SelectionSystem,
    camera: OrbitCamera,
  ) {
    this._canvas = canvas;
    this._selection = selection;
    this._camera = camera;

    this._createOverlay();
    this._bind();
  }

  dispose(): void {
    // 由于只在浏览器中使用，不需要显式解绑
    this._rectOverlay?.remove();
  }

  private _createOverlay(): void {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      border: 2px solid #00ffff;
      background: rgba(0, 255, 255, 0.08);
      pointer-events: none;
      display: none;
      z-index: 100;
    `;
    document.body.appendChild(div);
    this._rectOverlay = div;
  }

  private _bind(): void {
    this._canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('keydown', (e) => { if (e.key === 'Shift') this._shiftKey = true; });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this._shiftKey = false; });
  }

  private _onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // 只处理左键
    this._mouseDown = true;
    this._dragging = false;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._shiftKey = e.shiftKey;
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this._mouseDown) return;

    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= 5) {
      this._dragging = true;
      this._updateOverlay(e.clientX, e.clientY);
    }
  };

  private _onMouseUp = (e: MouseEvent): void => {
    if (!this._mouseDown || e.button !== 0) return;
    this._mouseDown = false;

    if (this._rectOverlay) {
      this._rectOverlay.style.display = 'none';
    }

    const rect = this._canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (this._dragging) {
      // 框选
      const x0 = ((this._startX - rect.left) / w) * 2 - 1;
      const y0 = -(((this._startY - rect.top) / h) * 2 - 1);
      const x1 = ((e.clientX - rect.left) / w) * 2 - 1;
      const y1 = -(((e.clientY - rect.top) / h) * 2 - 1);

      const selectRect: SelectRect = { x0, y0, x1, y1 };
      this._selection.boxSelect(selectRect, this._camera, e.shiftKey);
    } else {
      // 单选
      const ndcX = ((e.clientX - rect.left) / w) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / h) * 2 - 1);
      this._selection.pickAt(ndcX, ndcY, this._camera, e.shiftKey);
    }

    this._dragging = false;
  };

  private _updateOverlay(curX: number, curY: number): void {
    if (!this._rectOverlay) return;
    const left   = Math.min(this._startX, curX);
    const top    = Math.min(this._startY, curY);
    const width  = Math.abs(curX - this._startX);
    const height = Math.abs(curY - this._startY);

    this._rectOverlay.style.display = 'block';
    this._rectOverlay.style.left   = `${left}px`;
    this._rectOverlay.style.top    = `${top}px`;
    this._rectOverlay.style.width  = `${width}px`;
    this._rectOverlay.style.height = `${height}px`;
  }
}
