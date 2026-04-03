/**
 * UIImage — 屏幕空间纹理图片 UI 元素。
 * 在像素坐标系中显示纹理（图标、头像、背景图等）。
 * 支持 tint 着色、UV 区域裁剪（atlas slicing）、宽高比保持。
 * @see test/unit/ui/ui-image.test.ts
 */

import type { Texture } from '../renderer/texture';
import { UIElement, type UIElementOptions } from './ui-element';
import { vec3, type Vec3 } from '../math/vec3';

export interface UVRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface UIImageOptions extends UIElementOptions {
  texture: Texture;
  tint?: Vec3;
  uvRect?: UVRect;
  preserveAspect?: boolean;
}

export class UIImage extends UIElement {
  texture: Texture;
  tint: Vec3;
  uvRect: UVRect;
  preserveAspect: boolean;

  constructor(options: UIImageOptions) {
    super(options);
    this.texture = options.texture;
    this.tint = options.tint ?? vec3(1, 1, 1);
    this.uvRect = options.uvRect ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
    this.preserveAspect = options.preserveAspect ?? false;
  }

  /**
   * 生成四边形顶点数据（2 三角形 = 6 顶点）。
   * 每顶点 4 floats: x, y, u, v。UV 坐标使用 uvRect 区域。
   * 返回 Float32Array(24)。
   */
  getVertices(): Float32Array {
    const b = this.getScreenBounds();
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.width;
    const y1 = b.y + b.height;
    const { u0, v0, u1, v1 } = this.uvRect;

    return new Float32Array([
      x0, y0, u0, v0,  // 左上
      x0, y1, u0, v1,  // 左下
      x1, y0, u1, v0,  // 右上
      x0, y1, u0, v1,  // 左下
      x1, y1, u1, v1,  // 右下
      x1, y0, u1, v0,  // 右上
    ]);
  }
}
