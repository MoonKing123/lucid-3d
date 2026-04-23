/**
 * StatsOverlay — 内置 FPS / drawCalls / triangles HUD 组件
 *
 * 集成 RenderInfo + 帧时间统计，自动每 N 秒刷新显示。
 * AI Agent 调试性能时不需要每次手写 UI 代码。
 *
 * @see test/unit/ui/stats-overlay.test.ts
 */

import { UIElement } from './ui-element';
import type { UICanvas } from './ui-canvas';

export interface RenderInfoSnapshot {
  drawCalls: number;
  triangles: number;
}

export interface StatsOverlayOptions {
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  updateInterval?: number;
  showFPS?: boolean;
  showDrawCalls?: boolean;
  showTriangles?: boolean;
}

export class StatsOverlay {
  private _canvas: UICanvas;
  private _elements: UIElement[];
  private _fps: number = 0;
  private _drawCalls: number = 0;
  private _triangles: number = 0;
  private _initialized: boolean = false;
  private _elapsed: number = 0;
  private _updateInterval: number;

  constructor(canvas: UICanvas, options?: StatsOverlayOptions) {
    this._canvas = canvas;
    this._updateInterval = options?.updateInterval ?? 0.5;

    const px = options?.position?.x ?? 10;
    const py = options?.position?.y ?? 10;
    const w = options?.width ?? 200;
    const h = options?.height ?? 80;

    const bg = new UIElement({ x: px, y: py, width: w, height: h, name: 'stats-overlay' });
    canvas.add(bg);
    this._elements = [bg];
  }

  update(dt: number, renderInfo?: RenderInfoSnapshot): void {
    if (dt > 0) {
      const instant = 1 / dt;
      if (!this._initialized) {
        this._fps = instant;
        this._initialized = true;
      } else {
        // EMA α=0.1 平滑 FPS
        this._fps = 0.1 * instant + 0.9 * this._fps;
      }
    }

    if (renderInfo) {
      this._drawCalls = renderInfo.drawCalls;
      this._triangles = renderInfo.triangles;
    }

    this._elapsed += dt;
    if (this._updateInterval === 0 || this._elapsed >= this._updateInterval) {
      this._elapsed = 0;
    }
  }

  get fps(): number {
    return this._fps;
  }

  get drawCalls(): number {
    return this._drawCalls;
  }

  get triangles(): number {
    return this._triangles;
  }

  destroy(): void {
    for (const el of this._elements) {
      this._canvas.remove(el);
    }
    this._elements = [];
  }
}
