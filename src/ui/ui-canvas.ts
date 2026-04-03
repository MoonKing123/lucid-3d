/**
 * UICanvas — 屏幕空间 2D 覆盖层容器。
 * 管理正交投影矩阵（像素坐标系，左上角 0,0）和 UI 元素树。
 * 提供 hitTest 用于点击/触摸交互。
 * 渲染器通过 renderUI(canvas) 在 3D 场景之后渲染此层。
 * @see test/unit/ui/ui-canvas.test.ts
 */

export const __STUB__ = true;

import type { Mat4 } from '../math/mat4';
import type { UIElement } from './ui-element';

export class UICanvas {
  width: number;
  height: number;
  children: UIElement[];

  constructor(_width: number, _height: number) {
    throw new Error('STUB');
  }

  /** 正交投影矩阵：ortho(0, width, height, 0, -1, 1)，Y 轴向下 */
  get projectionMatrix(): Mat4 { throw new Error('STUB'); }

  add(_child: UIElement): void { throw new Error('STUB'); }
  remove(_child: UIElement): void { throw new Error('STUB'); }
  clear(): void { throw new Error('STUB'); }

  /** 按名称查找元素（深度优先搜索） */
  findByName(_name: string): UIElement | null { throw new Error('STUB'); }

  /** 命中测试：返回坐标处最前方的 interactive 元素，无命中返回 null */
  hitTest(_x: number, _y: number): UIElement | null { throw new Error('STUB'); }

  /** 更新视口尺寸 */
  resize(_width: number, _height: number): void { throw new Error('STUB'); }
}
