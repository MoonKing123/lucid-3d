/**
 * Pre-written tests for InputManager — unified keyboard/pointer/touch input.
 * AI must implement src/core/input.ts to make these pass.
 *
 * API:
 *   interface InputEventData {
 *     type: 'keydown' | 'keyup' | 'pointerdown' | 'pointerup' | 'pointermove';
 *     key?: string;  button?: number;
 *     x?: number;  y?: number;  ndcX?: number;  ndcY?: number;
 *   }
 *   type InputListener = (event: InputEventData) => void;
 *
 *   class InputManager {
 *     constructor(element: InputTarget);
 *     isKeyDown(key: string): boolean;
 *     wasKeyPressed(key: string): boolean;   // true only until update()
 *     isPointerDown(button?: number): boolean;
 *     getPointerPosition(): { x: number; y: number };
 *     getPointerNDC(): { x: number; y: number };
 *     on(type: string, listener: InputListener): void;
 *     off(type: string, listener: InputListener): void;
 *     update(): void;   // call at end of frame to reset per-frame state
 *     dispose(): void;  // removes all DOM listeners
 *   }
 *
 * Implementation notes:
 * - InputTarget is a duck-typed canvas: { width, height, addEventListener, removeEventListener }
 * - NDC: (0,0) = center, (-1,-1) = bottom-left, (1,1) = top-right
 * - Pointer NDC uses element width/height for normalization
 * - wasKeyPressed returns true from keydown until the next update() call
 * - dispose() must remove all event listeners from the element
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mod from '../../../src/core/input';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { InputManager } = mod;

/** Create a mock canvas-like element for testing. */
function createMockElement(width = 800, height = 600) {
  const listeners: Record<string, Function[]> = {};
  return {
    width,
    height,
    addEventListener(type: string, handler: Function) {
      (listeners[type] ??= []).push(handler);
    },
    removeEventListener(type: string, handler: Function) {
      const arr = listeners[type];
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      }
    },
    _fire(type: string, eventData: Record<string, any> = {}) {
      for (const handler of listeners[type] ?? []) {
        handler(eventData);
      }
    },
    _listeners: listeners,
  };
}

/* ───────────── Keyboard ───────────── */

describeImpl('InputManager — keyboard', () => {
  let el: ReturnType<typeof createMockElement>;
  let input: InstanceType<typeof InputManager>;

  beforeEach(() => {
    el = createMockElement();
    input = new InputManager(el);
  });

  it('isKeyDown should be false initially', () => {
    expect(input.isKeyDown('a')).toBe(false);
  });

  it('isKeyDown should be true after keydown event', () => {
    el._fire('keydown', { key: 'a' });
    expect(input.isKeyDown('a')).toBe(true);
  });

  it('isKeyDown should be false after keyup event', () => {
    el._fire('keydown', { key: 'a' });
    el._fire('keyup', { key: 'a' });
    expect(input.isKeyDown('a')).toBe(false);
  });

  it('should track multiple keys independently', () => {
    el._fire('keydown', { key: 'a' });
    el._fire('keydown', { key: 'b' });
    expect(input.isKeyDown('a')).toBe(true);
    expect(input.isKeyDown('b')).toBe(true);
    el._fire('keyup', { key: 'a' });
    expect(input.isKeyDown('a')).toBe(false);
    expect(input.isKeyDown('b')).toBe(true);
  });

  it('wasKeyPressed should be true on first frame, false after update()', () => {
    el._fire('keydown', { key: 'x' });
    expect(input.wasKeyPressed('x')).toBe(true);
    input.update();
    expect(input.wasKeyPressed('x')).toBe(false);
    expect(input.isKeyDown('x')).toBe(true);
  });

  it('wasKeyPressed should not trigger on repeated keydown without keyup', () => {
    el._fire('keydown', { key: 'x' });
    input.update();
    el._fire('keydown', { key: 'x' });
    expect(input.wasKeyPressed('x')).toBe(false);
  });
});

/* ───────────── Pointer ───────────── */

describeImpl('InputManager — pointer', () => {
  let el: ReturnType<typeof createMockElement>;
  let input: InstanceType<typeof InputManager>;

  beforeEach(() => {
    el = createMockElement(800, 600);
    input = new InputManager(el);
  });

  it('isPointerDown should be false initially', () => {
    expect(input.isPointerDown()).toBe(false);
  });

  it('isPointerDown should be true after pointerdown', () => {
    el._fire('pointerdown', { button: 0, offsetX: 100, offsetY: 100 });
    expect(input.isPointerDown(0)).toBe(true);
  });

  it('isPointerDown should be false after pointerup', () => {
    el._fire('pointerdown', { button: 0, offsetX: 100, offsetY: 100 });
    el._fire('pointerup', { button: 0, offsetX: 100, offsetY: 100 });
    expect(input.isPointerDown(0)).toBe(false);
  });

  it('getPointerPosition should return last known pixel coords', () => {
    el._fire('pointermove', { offsetX: 200, offsetY: 150 });
    const pos = input.getPointerPosition();
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(150);
  });

  it('getPointerNDC should normalize center of canvas to (0, 0)', () => {
    el._fire('pointermove', { offsetX: 400, offsetY: 300 });
    const ndc = input.getPointerNDC();
    expect(Math.abs(ndc.x)).toBeLessThan(0.01);
    expect(Math.abs(ndc.y)).toBeLessThan(0.01);
  });

  it('getPointerNDC should normalize top-left to (-1, 1)', () => {
    el._fire('pointermove', { offsetX: 0, offsetY: 0 });
    const ndc = input.getPointerNDC();
    expect(Math.abs(ndc.x - (-1))).toBeLessThan(0.01);
    expect(Math.abs(ndc.y - 1)).toBeLessThan(0.01);
  });

  it('getPointerNDC should normalize bottom-right to (1, -1)', () => {
    el._fire('pointermove', { offsetX: 800, offsetY: 600 });
    const ndc = input.getPointerNDC();
    expect(Math.abs(ndc.x - 1)).toBeLessThan(0.01);
    expect(Math.abs(ndc.y - (-1))).toBeLessThan(0.01);
  });

  it('pointerdown should also update position', () => {
    el._fire('pointerdown', { button: 0, offsetX: 300, offsetY: 200 });
    const pos = input.getPointerPosition();
    expect(pos.x).toBe(300);
    expect(pos.y).toBe(200);
  });
});

/* ───────────── Event listeners ───────────── */

describeImpl('InputManager — event listeners', () => {
  let el: ReturnType<typeof createMockElement>;
  let input: InstanceType<typeof InputManager>;

  beforeEach(() => {
    el = createMockElement();
    input = new InputManager(el);
  });

  it('on() should register a listener that receives events', () => {
    const spy = vi.fn();
    input.on('keydown', spy);
    el._fire('keydown', { key: 'w' });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatchObject({ type: 'keydown', key: 'w' });
  });

  it('off() should remove a listener', () => {
    const spy = vi.fn();
    input.on('keydown', spy);
    input.off('keydown', spy);
    el._fire('keydown', { key: 'w' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should dispatch pointerdown events with NDC coords', () => {
    const spy = vi.fn();
    input.on('pointerdown', spy);
    el._fire('pointerdown', { button: 0, offsetX: 400, offsetY: 300 });
    expect(spy).toHaveBeenCalledOnce();
    const data = spy.mock.calls[0][0];
    expect(data.type).toBe('pointerdown');
    expect(data.x).toBe(400);
    expect(data.y).toBe(300);
    expect(typeof data.ndcX).toBe('number');
    expect(typeof data.ndcY).toBe('number');
  });

  it('should dispatch pointermove events', () => {
    const spy = vi.fn();
    input.on('pointermove', spy);
    el._fire('pointermove', { offsetX: 100, offsetY: 50 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatchObject({ type: 'pointermove', x: 100, y: 50 });
  });
});

/* ───────────── Dispose ───────────── */

describeImpl('InputManager — dispose', () => {
  it('should remove all DOM event listeners on dispose', () => {
    const el = createMockElement();
    const input = new InputManager(el);
    input.dispose();

    for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointermove']) {
      expect(el._listeners[type]?.length ?? 0).toBe(0);
    }
  });

  it('should no longer track input after dispose', () => {
    const el = createMockElement();
    const input = new InputManager(el);
    input.dispose();

    expect(input.isKeyDown('a')).toBe(false);
    expect(input.isPointerDown()).toBe(false);
  });
});
