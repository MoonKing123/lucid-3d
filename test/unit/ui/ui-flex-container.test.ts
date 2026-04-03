import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/ui-flex-container';
import * as elemMod from '../../../src/ui/ui-element';

const isStub =
  ('__STUB__' in mod && (mod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UIFlexContainer } = mod;
const { UIElement } = elemMod;

describeImpl('UIFlexContainer', () => {
  it('should create with default direction horizontal', () => {
    const flex = new UIFlexContainer();
    expect(flex.direction).toBe('horizontal');
  });

  it('should create with vertical direction', () => {
    const flex = new UIFlexContainer({ direction: 'vertical' });
    expect(flex.direction).toBe('vertical');
  });

  it('should default gap to 0', () => {
    const flex = new UIFlexContainer();
    expect(flex.gap).toBe(0);
  });

  it('should default padding to 0', () => {
    const flex = new UIFlexContainer();
    expect(flex.padding).toBe(0);
  });

  it('should layout children horizontally', () => {
    const flex = new UIFlexContainer({
      x: 10, y: 20, direction: 'horizontal',
    });
    const a = new UIElement({ width: 50, height: 30 });
    const b = new UIElement({ width: 60, height: 30 });
    flex.add(a);
    flex.add(b);
    // After layout: a at x=10, b at x=10+50=60
    expect(a.x).toBe(10);
    expect(a.y).toBe(20);
    expect(b.x).toBe(60);
    expect(b.y).toBe(20);
  });

  it('should layout children vertically', () => {
    const flex = new UIFlexContainer({
      x: 10, y: 20, direction: 'vertical',
    });
    const a = new UIElement({ width: 50, height: 30 });
    const b = new UIElement({ width: 50, height: 40 });
    flex.add(a);
    flex.add(b);
    // After layout: a at y=20, b at y=20+30=50
    expect(a.x).toBe(10);
    expect(a.y).toBe(20);
    expect(b.x).toBe(10);
    expect(b.y).toBe(50);
  });

  it('should respect gap between children', () => {
    const flex = new UIFlexContainer({
      x: 0, y: 0, direction: 'horizontal', gap: 10,
    });
    const a = new UIElement({ width: 40, height: 30 });
    const b = new UIElement({ width: 60, height: 30 });
    const c = new UIElement({ width: 50, height: 30 });
    flex.add(a);
    flex.add(b);
    flex.add(c);
    expect(a.x).toBe(0);
    expect(b.x).toBe(50);  // 0 + 40 + 10
    expect(c.x).toBe(120); // 50 + 60 + 10
  });

  it('should respect padding', () => {
    const flex = new UIFlexContainer({
      x: 0, y: 0, direction: 'horizontal', padding: 8,
    });
    const a = new UIElement({ width: 50, height: 30 });
    flex.add(a);
    expect(a.x).toBe(8);
    expect(a.y).toBe(8);
  });

  it('should re-layout on remove', () => {
    const flex = new UIFlexContainer({
      x: 0, y: 0, direction: 'horizontal',
    });
    const a = new UIElement({ width: 40, height: 30 });
    const b = new UIElement({ width: 60, height: 30 });
    flex.add(a);
    flex.add(b);
    expect(b.x).toBe(40);
    flex.remove(a);
    // b should be repositioned to the start
    expect(b.x).toBe(0);
  });

  it('should be instanceof UIElement', () => {
    const flex = new UIFlexContainer();
    expect(flex).toBeInstanceOf(UIElement);
  });

  it('should handle empty container layout gracefully', () => {
    const flex = new UIFlexContainer({ x: 10, y: 20 });
    // layout() on empty container should not throw
    flex.layout();
    expect(flex.children.length).toBe(0);
  });

  it('should combine padding and gap', () => {
    const flex = new UIFlexContainer({
      x: 0, y: 0, direction: 'vertical', gap: 5, padding: 10,
    });
    const a = new UIElement({ width: 50, height: 20 });
    const b = new UIElement({ width: 50, height: 30 });
    flex.add(a);
    flex.add(b);
    expect(a.x).toBe(10);  // padding
    expect(a.y).toBe(10);  // padding
    expect(b.x).toBe(10);  // padding
    expect(b.y).toBe(35);  // 10 + 20 + 5
  });

  it('should re-layout all children when layout() called explicitly', () => {
    const flex = new UIFlexContainer({
      x: 0, y: 0, direction: 'horizontal',
    });
    const a = new UIElement({ width: 50, height: 30 });
    const b = new UIElement({ width: 60, height: 30 });
    flex.add(a);
    flex.add(b);
    // Manually change gap and re-layout
    flex.gap = 20;
    flex.layout();
    expect(b.x).toBe(70); // 0 + 50 + 20
  });
});
