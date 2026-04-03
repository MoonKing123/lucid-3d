/**
 * UIFlexContainer — 自动布局容器 UI 元素。
 * 将子元素按水平或垂直方向自动排列，支持间距和内边距。
 * 简化游戏菜单按钮行、HUD 面板、物品栏等常见布局场景。
 * @see test/unit/ui/ui-flex-container.test.ts
 */

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

  constructor(options?: UIFlexContainerOptions) {
    super(options);
    this.direction = options?.direction ?? 'horizontal';
    this.gap = options?.gap ?? 0;
    this.padding = options?.padding ?? 0;
  }

  layout(): void {
    let cursor = this.padding;
    for (const child of this.children) {
      if (this.direction === 'horizontal') {
        child.x = this.x + cursor;
        child.y = this.y + this.padding;
        cursor += child.width + this.gap;
      } else {
        child.x = this.x + this.padding;
        child.y = this.y + cursor;
        cursor += child.height + this.gap;
      }
    }
  }

  override add(child: UIElement): void {
    super.add(child);
    this.layout();
  }

  override remove(child: UIElement): void {
    super.remove(child);
    this.layout();
  }
}
