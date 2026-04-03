/**
 * UIElement — 2D UI 元素基类。
 * 所有 HUD/UI 组件（UIRect, UIText, UIProgressBar）的公共基类。
 * 提供位置、尺寸、锚点、可见性、不透明度、子元素树、交互回调。
 * @see test/unit/ui/ui-canvas.test.ts (UICanvas 测试中覆盖 UIElement 行为)
 */

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

  constructor(options?: UIElementOptions) {
    this.x = options?.x ?? 0;
    this.y = options?.y ?? 0;
    this.width = options?.width ?? 0;
    this.height = options?.height ?? 0;
    this.anchor = options?.anchor ?? 'topLeft';
    this.visible = options?.visible ?? true;
    this.opacity = options?.opacity ?? 1;
    this.interactive = options?.interactive ?? false;
    this.name = options?.name ?? '';
    this.parent = null;
    this.children = [];
    this.onPointerDown = null;
    this.onPointerUp = null;
  }

  add(child: UIElement): void {
    child.parent = this;
    this.children.push(child);
  }

  remove(child: UIElement): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  /** 计算屏幕空间包围框（考虑锚点偏移） */
  getScreenBounds(): ScreenBounds {
    const w = this.width;
    const h = this.height;
    let ox = 0;
    let oy = 0;

    // 水平偏移
    if (this.anchor === 'topCenter' || this.anchor === 'center' || this.anchor === 'bottomCenter') {
      ox = -w / 2;
    } else if (this.anchor === 'topRight' || this.anchor === 'centerRight' || this.anchor === 'bottomRight') {
      ox = -w;
    }

    // 垂直偏移
    if (this.anchor === 'centerLeft' || this.anchor === 'center' || this.anchor === 'centerRight') {
      oy = -h / 2;
    } else if (this.anchor === 'bottomLeft' || this.anchor === 'bottomCenter' || this.anchor === 'bottomRight') {
      oy = -h;
    }

    return { x: this.x + ox, y: this.y + oy, width: w, height: h };
  }

  /** 判断屏幕坐标是否在此元素内 */
  containsPoint(px: number, py: number): boolean {
    const b = this.getScreenBounds();
    return px >= b.x && px < b.x + b.width && py >= b.y && py < b.y + b.height;
  }
}
