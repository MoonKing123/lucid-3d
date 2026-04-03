import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-progress-bar';
import * as elemMod from '../../../src/ui/ui-element';
import { vec3 } from '../../../src/math/vec3';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIProgressBar } = mod;
const { UIElement } = elemMod;

describeImpl('UIProgressBar', () => {
  it('should create with default value 0', () => {
    const bar = new UIProgressBar({ width: 200, height: 20 });
    expect(bar.value).toBe(0);
  });

  it('should clamp value to [0, 1]', () => {
    const bar = new UIProgressBar({ width: 200, height: 20 });
    bar.setValue(1.5);
    expect(bar.value).toBe(1);
    bar.setValue(-0.3);
    expect(bar.value).toBe(0);
  });

  it('should update value via setValue', () => {
    const bar = new UIProgressBar({ width: 200, height: 20 });
    bar.setValue(0.6);
    expect(bar.value).toBeCloseTo(0.6);
  });

  it('should have default fillColor green and backgroundColor dark gray', () => {
    const bar = new UIProgressBar({ width: 200, height: 20 });
    // Default fill: green (0, 1, 0)
    expect(bar.fillColor[1]).toBeCloseTo(1);
    // Default background: dark (0.2, 0.2, 0.2)
    expect(bar.backgroundColor[0]).toBeCloseTo(0.2);
  });

  it('should default direction to leftToRight', () => {
    const bar = new UIProgressBar({ width: 200, height: 20 });
    expect(bar.direction).toBe('leftToRight');
  });

  it('should compute fillBounds for leftToRight', () => {
    const bar = new UIProgressBar({
      x: 10, y: 100, width: 200, height: 20, anchor: 'topLeft',
    });
    bar.setValue(0.5);
    const fill = bar.getFillBounds();
    expect(fill.x).toBe(10);
    expect(fill.y).toBe(100);
    expect(fill.width).toBeCloseTo(100); // 200 * 0.5
    expect(fill.height).toBe(20);
  });

  it('should compute fillBounds for rightToLeft', () => {
    const bar = new UIProgressBar({
      x: 10, y: 100, width: 200, height: 20,
      anchor: 'topLeft', direction: 'rightToLeft',
    });
    bar.setValue(0.5);
    const fill = bar.getFillBounds();
    expect(fill.x).toBeCloseTo(110); // 10 + 200 - 100
    expect(fill.width).toBeCloseTo(100);
  });

  it('should compute fillBounds for bottomToTop', () => {
    const bar = new UIProgressBar({
      x: 10, y: 100, width: 20, height: 200,
      anchor: 'topLeft', direction: 'bottomToTop',
    });
    bar.setValue(0.75);
    const fill = bar.getFillBounds();
    expect(fill.y).toBeCloseTo(150); // 100 + 200 - 150
    expect(fill.height).toBeCloseTo(150); // 200 * 0.75
  });

  it('should compute fillBounds for topToBottom', () => {
    const bar = new UIProgressBar({
      x: 10, y: 100, width: 20, height: 200,
      anchor: 'topLeft', direction: 'topToBottom',
    });
    bar.setValue(0.25);
    const fill = bar.getFillBounds();
    expect(fill.y).toBe(100);
    expect(fill.height).toBeCloseTo(50); // 200 * 0.25
  });

  it('should support borderColor and borderWidth', () => {
    const bar = new UIProgressBar({
      width: 100, height: 20,
      borderColor: vec3(1, 1, 0),
      borderWidth: 2,
    });
    expect(bar.borderColor![0]).toBeCloseTo(1);
    expect(bar.borderWidth).toBe(2);
  });

  it('should be instanceof UIElement', () => {
    const bar = new UIProgressBar({ width: 100, height: 20 });
    expect(bar).toBeInstanceOf(UIElement);
  });

  it('should inherit position/size/anchor from UIElement', () => {
    const bar = new UIProgressBar({
      x: 50, y: 60, width: 150, height: 25, anchor: 'center',
    });
    expect(bar.x).toBe(50);
    expect(bar.y).toBe(60);
    expect(bar.anchor).toBe('center');
  });
});
