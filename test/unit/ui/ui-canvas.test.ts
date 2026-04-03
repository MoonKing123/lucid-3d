import { describe, it, expect } from 'vitest';
import * as canvasMod from '../../../src/ui/ui-canvas';
import * as elemMod from '../../../src/ui/ui-element';
import * as rectMod from '../../../src/ui/ui-rect';
import { ortho } from '../../../src/math/mat4';

const isStub =
  ('__STUB__' in canvasMod && (canvasMod as any).__STUB__ === true) ||
  ('__STUB__' in elemMod && (elemMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { UICanvas } = canvasMod;
const { UIElement } = elemMod;
const { UIRect } = rectMod;

describeImpl('UICanvas', () => {
  it('should create with viewport dimensions', () => {
    const canvas = new UICanvas(800, 600);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(canvas.children).toHaveLength(0);
  });

  it('should produce correct orthographic projection (Y-down)', () => {
    const canvas = new UICanvas(800, 600);
    const expected = ortho(0, 800, 600, 0, -1, 1);
    const proj = canvas.projectionMatrix;
    for (let i = 0; i < 16; i++) {
      expect(proj[i]).toBeCloseTo(expected[i], 5);
    }
  });

  it('should add children and maintain order', () => {
    const canvas = new UICanvas(800, 600);
    const a = new UIElement({ name: 'a' });
    const b = new UIElement({ name: 'b' });
    canvas.add(a);
    canvas.add(b);
    expect(canvas.children).toHaveLength(2);
    expect(canvas.children[0].name).toBe('a');
    expect(canvas.children[1].name).toBe('b');
  });

  it('should remove a child', () => {
    const canvas = new UICanvas(800, 600);
    const el = new UIElement({ name: 'x' });
    canvas.add(el);
    canvas.remove(el);
    expect(canvas.children).toHaveLength(0);
  });

  it('should clear all children', () => {
    const canvas = new UICanvas(400, 300);
    canvas.add(new UIElement({ name: 'a' }));
    canvas.add(new UIElement({ name: 'b' }));
    canvas.clear();
    expect(canvas.children).toHaveLength(0);
  });

  it('should findByName — found', () => {
    const canvas = new UICanvas(800, 600);
    const el = new UIElement({ name: 'score' });
    canvas.add(el);
    expect(canvas.findByName('score')).toBe(el);
  });

  it('should findByName — not found returns null', () => {
    const canvas = new UICanvas(800, 600);
    expect(canvas.findByName('nope')).toBeNull();
  });

  it('should hitTest return topmost interactive element', () => {
    const canvas = new UICanvas(800, 600);
    const btn = new UIRect({
      name: 'btn', x: 100, y: 100, width: 200, height: 50,
      interactive: true, anchor: 'topLeft',
    });
    canvas.add(btn);
    const hit = canvas.hitTest(150, 120);
    expect(hit).toBe(btn);
  });

  it('should hitTest return null when point outside all elements', () => {
    const canvas = new UICanvas(800, 600);
    const btn = new UIRect({
      name: 'btn', x: 100, y: 100, width: 50, height: 50,
      interactive: true, anchor: 'topLeft',
    });
    canvas.add(btn);
    expect(canvas.hitTest(0, 0)).toBeNull();
  });

  it('should hitTest ignore non-interactive elements', () => {
    const canvas = new UICanvas(800, 600);
    const panel = new UIRect({
      name: 'panel', x: 0, y: 0, width: 800, height: 600,
      interactive: false, anchor: 'topLeft',
    });
    canvas.add(panel);
    expect(canvas.hitTest(400, 300)).toBeNull();
  });

  it('should hitTest ignore invisible elements', () => {
    const canvas = new UICanvas(800, 600);
    const btn = new UIRect({
      name: 'hidden', x: 0, y: 0, width: 100, height: 100,
      interactive: true, visible: false, anchor: 'topLeft',
    });
    canvas.add(btn);
    expect(canvas.hitTest(50, 50)).toBeNull();
  });

  it('should hitTest return last-added (front) when overlapping', () => {
    const canvas = new UICanvas(800, 600);
    const back = new UIRect({
      name: 'back', x: 0, y: 0, width: 200, height: 200,
      interactive: true, anchor: 'topLeft',
    });
    const front = new UIRect({
      name: 'front', x: 0, y: 0, width: 200, height: 200,
      interactive: true, anchor: 'topLeft',
    });
    canvas.add(back);
    canvas.add(front);
    expect(canvas.hitTest(100, 100)).toBe(front);
  });

  it('should resize viewport and update projection', () => {
    const canvas = new UICanvas(800, 600);
    canvas.resize(1920, 1080);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    const expected = ortho(0, 1920, 1080, 0, -1, 1);
    const proj = canvas.projectionMatrix;
    for (let i = 0; i < 16; i++) {
      expect(proj[i]).toBeCloseTo(expected[i], 5);
    }
  });
});
