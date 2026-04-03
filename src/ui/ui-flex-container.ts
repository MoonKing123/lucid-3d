/**
 * UIFlexContainer — 自动布局容器 UI 元素。
 * 将子元素按水平或垂直方向自动排列，支持间距和内边距。
 * 简化游戏菜单按钮行、HUD 面板、物品栏等常见布局场景。
 * @see test/unit/ui/ui-flex-container.test.ts
 */

export const __STUB__ = true;

import { UIElement, type UIElementOptions } from './ui-element';

export interface UIFlexContainerOptions extends UIElementOptions {
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  padding?: number;
}

export class UIFlexContainer extends UIElement {
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: number;

  constructor(_options?: UIFlexContainerOptions) {
    super();
    throw new Error('STUB');
  }

  layout(): void { throw new Error('STUB'); }
  override add(_child: UIElement): void { throw new Error('STUB'); }
  override remove(_child: UIElement): void { throw new Error('STUB'); }
}
