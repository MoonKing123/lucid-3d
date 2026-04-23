import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/ui/ui-dropdown';

const isStub = '__STUB__' in mod && (mod as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('UIDropdown', () => {
  const OPTIONS = [
    { label: 'Easy', value: 'easy' },
    { label: 'Normal', value: 'normal' },
    { label: 'Hard', value: 'hard' },
  ];

  it('constructor 默认 selectedIndex=0 isOpen=false', () => {
    const d = new mod.UIDropdown({ options: OPTIONS });
    expect(d.selectedIndex).toBe(0);
    expect(d.isOpen).toBe(false);
  });

  it('constructor 接受 options + selectedIndex', () => {
    const d = new mod.UIDropdown({ options: OPTIONS, selectedIndex: 2 });
    expect(d.selectedIndex).toBe(2);
    expect(d.options).toEqual(OPTIONS);
  });

  it('constructor options 为空抛错', () => {
    expect(() => new mod.UIDropdown({ options: [] })).toThrow();
  });

  it('constructor selectedIndex 越界抛错', () => {
    expect(() => new mod.UIDropdown({ options: OPTIONS, selectedIndex: 10 })).toThrow();
    expect(() => new mod.UIDropdown({ options: OPTIONS, selectedIndex: -1 })).toThrow();
  });

  it('getSelected 返回当前选中的 option', () => {
    const d = new mod.UIDropdown({ options: OPTIONS, selectedIndex: 1 });
    expect(d.getSelected()).toEqual({ label: 'Normal', value: 'normal' });
  });

  it('open() 展开 setSelected()', () => {
    const d = new mod.UIDropdown({ options: OPTIONS });
    d.open();
    expect(d.isOpen).toBe(true);
  });

  it('close() 收起', () => {
    const d = new mod.UIDropdown({ options: OPTIONS });
    d.open();
    d.close();
    expect(d.isOpen).toBe(false);
  });

  it('toggle() 翻转展开状态', () => {
    const d = new mod.UIDropdown({ options: OPTIONS });
    d.toggle();
    expect(d.isOpen).toBe(true);
    d.toggle();
    expect(d.isOpen).toBe(false);
  });

  it('selectByIndex 改变选中并触发 onChange + 收起', () => {
    const onChange = vi.fn();
    const d = new mod.UIDropdown({ options: OPTIONS, onChange });
    d.open();
    d.selectByIndex(2);
    expect(d.selectedIndex).toBe(2);
    expect(onChange).toHaveBeenCalledWith({ label: 'Hard', value: 'hard' }, 2);
    expect(d.isOpen).toBe(false);
  });

  it('selectByIndex 越界抛错', () => {
    const d = new mod.UIDropdown({ options: OPTIONS });
    expect(() => d.selectByIndex(99)).toThrow();
  });

  it('selectByIndex 选中相同项不触发 onChange', () => {
    const onChange = vi.fn();
    const d = new mod.UIDropdown({ options: OPTIONS, selectedIndex: 1, onChange });
    d.selectByIndex(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled 时 open() 不生效', () => {
    const d = new mod.UIDropdown({ options: OPTIONS, disabled: true });
    d.open();
    expect(d.isOpen).toBe(false);
  });
});
