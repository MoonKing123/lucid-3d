/**
 * UIDropdown — 下拉选择 UI 元素。
 * 用于难度 / 角色 / 分辨率 / 语言等离散选项选择。
 * 核心能力：options 数组 + selectedIndex + open/close 展开状态 + 选中触发 onChange 回调。
 * @see test/unit/ui/ui-dropdown.test.ts
 */

import { vec3, type Vec3 } from '../math/vec3';
import type { BitmapFontData } from '../renderer/bitmap-font';
import { UIElement, type UIElementOptions } from './ui-element';

export interface UIDropdownOption {
  label: string;
  value: string;
}

export interface UIDropdownOptions extends UIElementOptions {
  options: UIDropdownOption[];
  selectedIndex?: number;
  fontSize?: number;
  textColor?: Vec3;
  backgroundColor?: Vec3;
  hoverColor?: Vec3;
  font?: BitmapFontData;
  onChange?: (option: UIDropdownOption, index: number) => void;
  disabled?: boolean;
  maxVisibleItems?: number;
}

export class UIDropdown extends UIElement {
  options: UIDropdownOption[];
  selectedIndex: number;
  fontSize: number;
  textColor: Vec3;
  backgroundColor: Vec3;
  hoverColor: Vec3;
  font: BitmapFontData | null;
  onChange: ((option: UIDropdownOption, index: number) => void) | null;
  disabled: boolean;
  isOpen: boolean;
  maxVisibleItems: number;

  constructor(options: UIDropdownOptions) {
    super({ interactive: true, ...options });

    if (!options.options || options.options.length === 0) {
      throw new Error('UIDropdown requires at least one option');
    }

    const selectedIndex = options.selectedIndex ?? 0;
    if (selectedIndex < 0 || selectedIndex >= options.options.length) {
      throw new Error(`UIDropdown selectedIndex ${selectedIndex} out of range [0, ${options.options.length - 1}]`);
    }

    this.options = options.options;
    this.selectedIndex = selectedIndex;
    this.fontSize = options.fontSize ?? 16;
    this.textColor = options.textColor ?? vec3(1, 1, 1);
    this.backgroundColor = options.backgroundColor ?? vec3(0.2, 0.2, 0.2);
    this.hoverColor = options.hoverColor ?? vec3(0.3, 0.3, 0.3);
    this.font = options.font ?? null;
    this.onChange = options.onChange ?? null;
    this.disabled = options.disabled ?? false;
    this.isOpen = false;
    this.maxVisibleItems = options.maxVisibleItems ?? this.options.length;
  }

  open(): void {
    if (this.disabled) return;
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  selectByIndex(index: number): void {
    if (index < 0 || index >= this.options.length) {
      throw new Error(`UIDropdown selectByIndex ${index} out of range [0, ${this.options.length - 1}]`);
    }
    const changed = index !== this.selectedIndex;
    this.selectedIndex = index;
    this.isOpen = false;
    if (changed) {
      this.onChange?.(this.options[index], index);
    }
  }

  getSelected(): UIDropdownOption {
    return this.options[this.selectedIndex];
  }

  getVertices(): Float32Array {
    const b = this.getScreenBounds();
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.width;
    const y1 = b.y + b.height;

    return new Float32Array([
      x0, y0, 0, 0,
      x0, y1, 0, 1,
      x1, y0, 1, 0,
      x0, y1, 0, 1,
      x1, y1, 1, 1,
      x1, y0, 1, 0,
    ]);
  }
}
