import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/ui/ui-text-input';

const isStub = '__STUB__' in mod && (mod as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('UITextInput', () => {
  it('constructor 默认 value="" placeholder="" focused=false', () => {
    const t = new mod.UITextInput();
    expect(t.value).toBe('');
    expect(t.placeholder).toBe('');
    expect(t.focused).toBe(false);
  });

  it('constructor 接受 value / placeholder / maxLength', () => {
    const t = new mod.UITextInput({ value: 'hello', placeholder: 'type...', maxLength: 20 });
    expect(t.value).toBe('hello');
    expect(t.placeholder).toBe('type...');
    expect(t.maxLength).toBe(20);
  });

  it('focus() 设置 focused=true', () => {
    const t = new mod.UITextInput();
    t.focus();
    expect(t.focused).toBe(true);
  });

  it('blur() 设置 focused=false', () => {
    const t = new mod.UITextInput({ value: 'abc' });
    t.focus();
    t.blur();
    expect(t.focused).toBe(false);
  });

  it('handleKeyDown 追加字符（focused 状态）', () => {
    const t = new mod.UITextInput();
    t.focus();
    t.handleKeyDown('a');
    t.handleKeyDown('b');
    expect(t.value).toBe('ab');
  });

  it('handleKeyDown Backspace 删除最后一个字符', () => {
    const t = new mod.UITextInput({ value: 'hello' });
    t.focus();
    t.handleKeyDown('Backspace');
    expect(t.value).toBe('hell');
  });

  it('handleKeyDown 非 focused 时不更新 value', () => {
    const t = new mod.UITextInput({ value: 'abc' });
    t.handleKeyDown('x');
    expect(t.value).toBe('abc');
  });

  it('maxLength 限制后续字符不追加', () => {
    const t = new mod.UITextInput({ maxLength: 3 });
    t.focus();
    t.handleKeyDown('a');
    t.handleKeyDown('b');
    t.handleKeyDown('c');
    t.handleKeyDown('d');
    expect(t.value).toBe('abc');
  });

  it('value 改变触发 onChange 回调', () => {
    const onChange = vi.fn();
    const t = new mod.UITextInput({ onChange });
    t.focus();
    t.handleKeyDown('x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('handleKeyDown Enter 触发 onSubmit 并保留 value', () => {
    const onSubmit = vi.fn();
    const t = new mod.UITextInput({ value: 'done', onSubmit });
    t.focus();
    t.handleKeyDown('Enter');
    expect(onSubmit).toHaveBeenCalledWith('done');
    expect(t.value).toBe('done');
  });

  it('disabled 时 focus() 不生效', () => {
    const t = new mod.UITextInput({ disabled: true });
    t.focus();
    expect(t.focused).toBe(false);
  });
});
