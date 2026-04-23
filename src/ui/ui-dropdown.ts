/**
 * UIDropdown — 下拉选择 UI 元素（STUB）。
 * 用于难度 / 角色 / 分辨率 / 语言等离散选项选择。
 * 核心能力：options 数组 + selectedIndex + open/close 展开状态 + 选中触发 onChange 回调。
 * @see test/unit/ui/ui-dropdown.test.ts
 */

export const __STUB__ = true;

export interface UIDropdownOption {
  label: string;
  value: string;
}

export interface UIDropdownOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  options?: UIDropdownOption[];
  selectedIndex?: number;
  fontSize?: number;
  textColor?: unknown;
  backgroundColor?: unknown;
  hoverColor?: unknown;
  onChange?: (option: UIDropdownOption, index: number) => void;
  disabled?: boolean;
  maxVisibleItems?: number;
}

export class UIDropdown {
  constructor(_options?: UIDropdownOptions) {
    throw new Error('UIDropdown is a stub — implement in Phase 46 #<issue>');
  }
}
