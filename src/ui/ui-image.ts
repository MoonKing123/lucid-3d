/**
 * UIImage — 屏幕空间纹理图片 UI 元素。
 * 在像素坐标系中显示纹理（图标、头像、背景图等）。
 * 支持 tint 着色、UV 区域裁剪（atlas slicing）、宽高比保持。
 * @see test/unit/ui/ui-image.test.ts
 */

export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';
import type { Texture } from '../renderer/texture';
import { UIElement, type UIElementOptions } from './ui-element';

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

  constructor(_options: UIImageOptions) {
    super();
    throw new Error('STUB');
  }

  getVertices(): Float32Array { throw new Error('STUB'); }
}
