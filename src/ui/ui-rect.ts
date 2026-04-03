/**
 * UIRect — 矩形 UI 元素。
 * 纯色或纹理填充的矩形，用于面板、按钮背景、遮罩等。
 * @see test/unit/ui/ui-rect.test.ts
 */

export const __STUB__ = true;

import { UIElement, type UIElementOptions } from './ui-element';
import type { Vec3 } from '../math/vec3';
import type { Texture } from '../renderer/texture';

export interface UIRectOptions extends UIElementOptions {
  color?: Vec3;
  texture?: Texture;
}

export class UIRect extends UIElement {
  color: Vec3;
  texture: Texture | null;

  constructor(_options?: UIRectOptions) {
    super(_options);
    throw new Error('STUB');
  }

  /**
   * 生成四边形顶点数据（2 三角形 = 6 顶点）。
   * 每顶点 4 floats: x, y, u, v。
   * 返回 Float32Array(24)。
   */
  getVertices(): Float32Array { throw new Error('STUB'); }
}
