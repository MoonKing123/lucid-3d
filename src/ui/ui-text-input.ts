/**
 * UITextInput — 文本输入框 UI 元素（STUB）。
 * 用于玩家名 / 聊天 / 搜索 / 作弊码等输入场景。
 * 核心能力：value 字符串 + focus 状态 + handleKeyDown + onChange + onSubmit 回调 + maxLength + placeholder。
 * @see test/unit/ui/ui-text-input.test.ts
 */

export const __STUB__ = true;

export interface UITextInputOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  fontSize?: number;
  textColor?: unknown;
  backgroundColor?: unknown;
  focusedColor?: unknown;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
}

export class UITextInput {
  constructor(_options?: UITextInputOptions) {
    throw new Error('UITextInput is a stub — implement in Phase 46 #<issue>');
  }
}
