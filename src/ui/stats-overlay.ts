/**
 * StatsOverlay — 内置 FPS / drawCalls / triangles HUD 组件
 *
 * 集成 RenderInfo + 帧时间统计，自动每 N 秒刷新显示。
 * AI Agent 调试性能时不需要每次手写 UI 代码。
 *
 * @see test/unit/ui/stats-overlay.test.ts
 *
 * STUB — Phase 44 Architect 预写
 */

export const __STUB__ = true;

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
  constructor(_canvas: UICanvas, _options?: StatsOverlayOptions) {
    throw new Error('Not implemented');
  }

  update(_dt: number, _renderInfo?: RenderInfoSnapshot): void {
    throw new Error('Not implemented');
  }

  get fps(): number {
    throw new Error('Not implemented');
  }

  get drawCalls(): number {
    throw new Error('Not implemented');
  }

  get triangles(): number {
    throw new Error('Not implemented');
  }

  destroy(): void {
    throw new Error('Not implemented');
  }
}
