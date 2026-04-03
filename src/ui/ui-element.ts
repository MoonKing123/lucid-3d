/**
 * UIElement — 2D UI 元素基类。
 * 所有 HUD/UI 组件（UIRect, UIText, UIProgressBar）的公共基类。
 * 提供位置、尺寸、锚点、可见性、不透明度、子元素树、交互回调。
 * @see test/unit/ui/ui-canvas.test.ts (UICanvas 测试中覆盖 UIElement 行为)
 */

export const __STUB__ = true;

import type { Vec3 } from '../math/vec3';

export type Anchor =
  | 'topLeft' | 'topCenter' | 'topRight'
  | 'centerLeft' | 'center' | 'centerRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

export interface UIElementOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  anchor?: Anchor;
  visible?: boolean;
  opacity?: number;
  interactive?: boolean;
  name?: string;
}

export interface ScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class UIElement {
  x: number;
  y: number;
  width: number;
  height: number;
  anchor: Anchor;
  visible: boolean;
  opacity: number;
  interactive: boolean;
  name: string;
  parent: UIElement | null;
  children: UIElement[];

  onPointerDown: ((e: { x: number; y: number }) => void) | null;
  onPointerUp: ((e: { x: number; y: number }) => void) | null;

  constructor(_options?: UIElementOptions) {
    throw new Error('STUB');
  }

  add(_child: UIElement): void { throw new Error('STUB'); }
  remove(_child: UIElement): void { throw new Error('STUB'); }

  /** 计算屏幕空间包围框（考虑锚点偏移） */
  getScreenBounds(): ScreenBounds { throw new Error('STUB'); }

  /** 判断屏幕坐标是否在此元素内 */
  containsPoint(_px: number, _py: number): boolean { throw new Error('STUB'); }
}
