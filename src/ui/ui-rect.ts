/**
 * UIRect — 矩形 UI 元素。
 * 纯色或纹理填充的矩形，用于面板、按钮背景、遮罩等。
 * @see test/unit/ui/ui-rect.test.ts
 */

import { UIElement, type UIElementOptions } from './ui-element';
import { vec3, type Vec3 } from '../math/vec3';
import type { Texture } from '../renderer/texture';

export interface UIRectOptions extends UIElementOptions {
  color?: Vec3;
  texture?: Texture;
}

export class UIRect extends UIElement {
  color: Vec3;
  texture: Texture | null;

  constructor(options?: UIRectOptions) {
    super({ width: 100, height: 100, ...options });
    this.color = options?.color ?? vec3(1, 1, 1);
    this.texture = options?.texture ?? null;
  }

  /**
   * 生成四边形顶点数据（2 三角形 = 6 顶点）。
   * 每顶点 4 floats: x, y, u, v。
   * 返回 Float32Array(24)。
   */
  getVertices(): Float32Array {
    const b = this.getScreenBounds();
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.width;
    const y1 = b.y + b.height;

    // 2 三角形，逆时针（webgl 前面）
    // 三角形1: 左上、左下、右上
    // 三角形2: 左下、右下、右上
    return new Float32Array([
      x0, y0, 0, 0,  // 左上
      x0, y1, 0, 1,  // 左下
      x1, y0, 1, 0,  // 右上
      x0, y1, 0, 1,  // 左下
      x1, y1, 1, 1,  // 右下
      x1, y0, 1, 0,  // 右上
    ]);
  }
}
