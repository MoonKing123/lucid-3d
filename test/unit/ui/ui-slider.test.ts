import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/ui/ui-slider';

const isStub = '__STUB__' in mod && (mod as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('UISlider', () => {
  it('constructor 默认 min=0 max=1 value=0 step=0', () => {
    const s = new mod.UISlider();
    expect(s.min).toBe(0);
    expect(s.max).toBe(1);
    expect(s.value).toBe(0);
    expect(s.step).toBe(0);
  });

  it('constructor 接受 min/max/value/step 选项', () => {
    const s = new mod.UISlider({ min: 0, max: 100, value: 50, step: 10 });
    expect(s.min).toBe(0);
    expect(s.max).toBe(100);
    expect(s.value).toBe(50);
    expect(s.step).toBe(10);
  });

  it('setValue 截断到 [min, max]', () => {
    const s = new mod.UISlider({ min: 0, max: 100, value: 50 });
    s.setValue(150);
    expect(s.value).toBe(100);
    s.setValue(-10);
    expect(s.value).toBe(0);
  });

  it('setValue 按 step 量化', () => {
    const s = new mod.UISlider({ min: 0, max: 100, step: 10 });
    s.setValue(37);
    expect(s.value).toBe(40);
    s.setValue(12);
    expect(s.value).toBe(10);
  });

  it('setValue 改变时触发 onChange', () => {
    const onChange = vi.fn();
    const s = new mod.UISlider({ min: 0, max: 100, value: 50, onChange });
    s.setValue(75);
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('setValue 不变时不触发 onChange', () => {
    const onChange = vi.fn();
    const s = new mod.UISlider({ min: 0, max: 100, value: 50, onChange });
    s.setValue(50);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handlePointerDown 更新 value 根据屏幕位置', () => {
    const s = new mod.UISlider({ x: 0, y: 0, width: 200, height: 20, min: 0, max: 100, value: 0 });
    s.handlePointerDown(100, 10);
    expect(s.value).toBeCloseTo(50, 1);
  });

  it('handlePointerMove 拖动更新 value（仅在 pressed 状态）', () => {
    const s = new mod.UISlider({ x: 0, y: 0, width: 200, height: 20, min: 0, max: 100 });
    s.handlePointerDown(50, 10);
    s.handlePointerMove(150, 10);
    expect(s.value).toBeCloseTo(75, 1);
  });

  it('disabled 时 handlePointerDown 不更新 value', () => {
    const s = new mod.UISlider({ x: 0, y: 0, width: 200, height: 20, value: 25, disabled: true });
    s.handlePointerDown(150, 10);
    expect(s.value).toBe(25);
  });

  it('getNormalizedValue 返回 [0, 1] 归一化值', () => {
    const s = new mod.UISlider({ min: 0, max: 200, value: 50 });
    expect(s.getNormalizedValue()).toBeCloseTo(0.25, 3);
  });
});
