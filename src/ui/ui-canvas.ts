/**
 * UICanvas — 屏幕空间 2D 覆盖层容器。
 * 管理正交投影矩阵（像素坐标系，左上角 0,0）和 UI 元素树。
 * 提供 hitTest 用于点击/触摸交互。
 * 渲染器通过 renderUI(canvas) 在 3D 场景之后渲染此层。
 * @see test/unit/ui/ui-canvas.test.ts
 */

import { ortho, type Mat4 } from '../math/mat4';
import { UIElement } from './ui-element';

export class UICanvas {
  width: number;
  height: number;
  children: UIElement[];
  private _projection: Mat4;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.children = [];
    this._projection = ortho(0, width, height, 0, -1, 1);
  }

  /** 正交投影矩阵：ortho(0, width, height, 0, -1, 1)，Y 轴向下 */
  get projectionMatrix(): Mat4 {
    return this._projection;
  }

  add(child: UIElement): void {
    this.children.push(child);
  }

  remove(child: UIElement): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }

  clear(): void {
    this.children.length = 0;
  }

  /** 按名称查找元素（深度优先搜索） */
  findByName(name: string): UIElement | null {
    const search = (els: UIElement[]): UIElement | null => {
      for (const el of els) {
        if (el.name === name) return el;
        const found = search(el.children);
        if (found) return found;
      }
      return null;
    };
    return search(this.children);
  }

  /** 命中测试：返回坐标处最前方（最后添加）的 interactive+visible 元素，无命中返回 null */
  hitTest(x: number, y: number): UIElement | null {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const el = this.children[i];
      if (el.interactive && el.visible && el.containsPoint(x, y)) {
        return el;
      }
    }
    return null;
  }

  /** 更新视口尺寸 */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this._projection = ortho(0, width, height, 0, -1, 1);
  }
}
