/**
 * TouchGesture — pre-written tests (Architect)
 * Validates: tap, double-tap, swipe, long-press, callback management, dispose
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mod from '../../../src/core/touch-gesture';
import { InputManager } from '../../../src/core/input';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/** Minimal InputTarget mock that records and dispatches events */
function createMockElement() {
  const handlers = new Map<string, Set<Function>>();
  return {
    width: 800,
    height: 600,
    addEventListener(type: string, handler: Function) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: Function) {
      handlers.get(type)?.delete(handler);
    },
    dispatch(type: string, data: Record<string, any>) {
      const set = handlers.get(type);
      if (set) for (const fn of set) fn(data);
    },
  };
}

/** Simulate pointer down → move (optional) → up sequence */
function simulatePointer(
  el: ReturnType<typeof createMockElement>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number,
) {
  el.dispatch('pointerdown', { button: 0, offsetX: startX, offsetY: startY });
  if (startX !== endX || startY !== endY) {
    el.dispatch('pointermove', { offsetX: endX, offsetY: endY });
  }
  // Advance time by manipulating Date.now (vi.useFakeTimers handles this)
  vi.advanceTimersByTime(durationMs);
  el.dispatch('pointerup', { button: 0, offsetX: endX, offsetY: endY });
}

describeImpl('TouchGesture', () => {
  let el: ReturnType<typeof createMockElement>;
  let input: InputManager;

  beforeEach(() => {
    vi.useFakeTimers();
    el = createMockElement();
    input = new InputManager(el as any);
  });

  /* ---------- construction ---------- */

  it('should create without error', () => {
    const gesture = new mod.TouchGesture(input);
    expect(gesture).toBeDefined();
    gesture.dispose();
  });

  /* ---------- tap ---------- */

  it('should detect tap (quick down + up, small movement)', () => {
    const gesture = new mod.TouchGesture(input, { tapMaxDuration: 300, tapMaxDistance: 10 });
    const tapCb = vi.fn();
    gesture.onTap(tapCb);

    simulatePointer(el, 100, 200, 102, 201, 100);

    expect(tapCb).toHaveBeenCalledTimes(1);
    const event = tapCb.mock.calls[0][0] as mod.TapEvent;
    expect(event.x).toBeCloseTo(102);
    expect(event.y).toBeCloseTo(201);
    gesture.dispose();
  });

  it('should NOT detect tap if movement exceeds tapMaxDistance', () => {
    const gesture = new mod.TouchGesture(input, { tapMaxDistance: 10 });
    const tapCb = vi.fn();
    gesture.onTap(tapCb);

    simulatePointer(el, 100, 200, 200, 200, 100); // 100px movement

    expect(tapCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  it('should NOT detect tap if duration exceeds tapMaxDuration', () => {
    const gesture = new mod.TouchGesture(input, { tapMaxDuration: 300 });
    const tapCb = vi.fn();
    gesture.onTap(tapCb);

    simulatePointer(el, 100, 200, 101, 201, 500); // 500ms hold

    expect(tapCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  /* ---------- double tap ---------- */

  it('should detect double tap within interval', () => {
    const gesture = new mod.TouchGesture(input, { doubleTapInterval: 300 });
    const doubleTapCb = vi.fn();
    gesture.onDoubleTap(doubleTapCb);

    // First tap
    simulatePointer(el, 100, 200, 101, 201, 50);
    // Short gap
    vi.advanceTimersByTime(100);
    // Second tap
    simulatePointer(el, 100, 200, 101, 201, 50);

    expect(doubleTapCb).toHaveBeenCalledTimes(1);
    gesture.dispose();
  });

  it('should NOT detect double tap if interval too long', () => {
    const gesture = new mod.TouchGesture(input, { doubleTapInterval: 300 });
    const doubleTapCb = vi.fn();
    gesture.onDoubleTap(doubleTapCb);

    simulatePointer(el, 100, 200, 101, 201, 50);
    vi.advanceTimersByTime(500); // too long
    simulatePointer(el, 100, 200, 101, 201, 50);

    expect(doubleTapCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  /* ---------- swipe ---------- */

  it('should detect swipe right', () => {
    const gesture = new mod.TouchGesture(input, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 200,
    });
    const swipeCb = vi.fn();
    gesture.onSwipe(swipeCb);

    // 150px rightward in 200ms = 750 px/s
    simulatePointer(el, 100, 300, 250, 305, 200);

    expect(swipeCb).toHaveBeenCalledTimes(1);
    expect(swipeCb.mock.calls[0][0].direction).toBe('right');
    gesture.dispose();
  });

  it('should detect swipe left', () => {
    const gesture = new mod.TouchGesture(input, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 200,
    });
    const swipeCb = vi.fn();
    gesture.onSwipe(swipeCb);

    simulatePointer(el, 300, 300, 100, 305, 200); // 200px leftward

    expect(swipeCb).toHaveBeenCalledTimes(1);
    expect(swipeCb.mock.calls[0][0].direction).toBe('left');
    gesture.dispose();
  });

  it('should detect swipe up', () => {
    const gesture = new mod.TouchGesture(input, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 200,
    });
    const swipeCb = vi.fn();
    gesture.onSwipe(swipeCb);

    // Screen Y increases downward, so swipe up = smaller Y
    simulatePointer(el, 300, 400, 305, 200, 200); // 200px upward

    expect(swipeCb).toHaveBeenCalledTimes(1);
    expect(swipeCb.mock.calls[0][0].direction).toBe('up');
    gesture.dispose();
  });

  it('should detect swipe down', () => {
    const gesture = new mod.TouchGesture(input, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 200,
    });
    const swipeCb = vi.fn();
    gesture.onSwipe(swipeCb);

    simulatePointer(el, 300, 100, 305, 350, 200); // 250px downward

    expect(swipeCb).toHaveBeenCalledTimes(1);
    expect(swipeCb.mock.calls[0][0].direction).toBe('down');
    gesture.dispose();
  });

  it('should NOT detect swipe if distance below threshold', () => {
    const gesture = new mod.TouchGesture(input, { swipeThreshold: 50 });
    const swipeCb = vi.fn();
    gesture.onSwipe(swipeCb);

    simulatePointer(el, 100, 200, 130, 200, 200); // only 30px

    expect(swipeCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  /* ---------- long press ---------- */

  it('should detect long press', () => {
    const gesture = new mod.TouchGesture(input, {
      longPressDelay: 500,
      tapMaxDistance: 10,
    });
    const longPressCb = vi.fn();
    gesture.onLongPress(longPressCb);

    el.dispatch('pointerdown', { button: 0, offsetX: 100, offsetY: 200 });
    vi.advanceTimersByTime(600); // wait beyond long press delay

    expect(longPressCb).toHaveBeenCalledTimes(1);
    const event = longPressCb.mock.calls[0][0] as mod.LongPressEvent;
    expect(event.x).toBe(100);
    expect(event.y).toBe(200);
    gesture.dispose();
  });

  it('should NOT detect long press if released before delay', () => {
    const gesture = new mod.TouchGesture(input, { longPressDelay: 500 });
    const longPressCb = vi.fn();
    gesture.onLongPress(longPressCb);

    el.dispatch('pointerdown', { button: 0, offsetX: 100, offsetY: 200 });
    vi.advanceTimersByTime(200);
    el.dispatch('pointerup', { button: 0, offsetX: 100, offsetY: 200 });
    vi.advanceTimersByTime(500); // should not fire

    expect(longPressCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  /* ---------- callback management ---------- */

  it('should remove callback with off methods', () => {
    const gesture = new mod.TouchGesture(input);
    const tapCb = vi.fn();
    gesture.onTap(tapCb);
    gesture.offTap(tapCb);

    simulatePointer(el, 100, 200, 101, 201, 100);

    expect(tapCb).not.toHaveBeenCalled();
    gesture.dispose();
  });

  /* ---------- dispose ---------- */

  it('should not fire events after dispose', () => {
    const gesture = new mod.TouchGesture(input);
    const tapCb = vi.fn();
    gesture.onTap(tapCb);
    gesture.dispose();

    simulatePointer(el, 100, 200, 101, 201, 100);

    expect(tapCb).not.toHaveBeenCalled();
  });
});
