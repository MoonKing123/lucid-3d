/**
 * EventEmitter — pre-written tests (Architect)
 * Validates: on/off/once/emit/removeAllListeners/listenerCount
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/event-emitter';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

type TestEvents = {
  hit: (damage: number) => void;
  die: () => void;
  collect: (item: string, count: number) => void;
};

describeImpl('EventEmitter', () => {
  /* ---------- on / emit basics ---------- */

  it('should call listener when event is emitted', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.on('hit', spy);
    emitter.emit('hit', 10);
    expect(spy).toHaveBeenCalledWith(10);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should pass multiple arguments to listener', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.on('collect', spy);
    emitter.emit('collect', 'coin', 5);
    expect(spy).toHaveBeenCalledWith('coin', 5);
  });

  it('should support multiple listeners on same event', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    emitter.on('die', spy1);
    emitter.on('die', spy2);
    emitter.emit('die');
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('should call listeners in registration order', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const order: number[] = [];
    emitter.on('die', () => order.push(1));
    emitter.on('die', () => order.push(2));
    emitter.on('die', () => order.push(3));
    emitter.emit('die');
    expect(order).toEqual([1, 2, 3]);
  });

  it('emit should return true when listeners exist', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    emitter.on('die', () => {});
    expect(emitter.emit('die')).toBe(true);
  });

  it('emit should return false when no listeners exist', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    expect(emitter.emit('die')).toBe(false);
  });

  /* ---------- off ---------- */

  it('should remove a specific listener with off', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.on('hit', spy);
    emitter.off('hit', spy);
    emitter.emit('hit', 5);
    expect(spy).not.toHaveBeenCalled();
  });

  it('off should only remove the specified listener', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    emitter.on('hit', spy1);
    emitter.on('hit', spy2);
    emitter.off('hit', spy1);
    emitter.emit('hit', 5);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledWith(5);
  });

  it('off should be safe when listener was never registered', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    // should not throw
    emitter.off('hit', spy);
  });

  /* ---------- once ---------- */

  it('should fire once listener only once', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.once('hit', spy);
    emitter.emit('hit', 10);
    emitter.emit('hit', 20);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(10);
  });

  it('once listener should be removable before firing', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.once('die', spy);
    emitter.off('die', spy);
    emitter.emit('die');
    expect(spy).not.toHaveBeenCalled();
  });

  /* ---------- removeAllListeners ---------- */

  it('should remove all listeners for a specific event', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    emitter.on('hit', spy1);
    emitter.on('hit', spy2);
    emitter.removeAllListeners('hit');
    emitter.emit('hit', 5);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('should remove all listeners for all events when no arg', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const hitSpy = vi.fn();
    const dieSpy = vi.fn();
    emitter.on('hit', hitSpy);
    emitter.on('die', dieSpy);
    emitter.removeAllListeners();
    emitter.emit('hit', 5);
    emitter.emit('die');
    expect(hitSpy).not.toHaveBeenCalled();
    expect(dieSpy).not.toHaveBeenCalled();
  });

  /* ---------- listenerCount ---------- */

  it('should return correct listener count', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    expect(emitter.listenerCount('hit')).toBe(0);
    const spy = vi.fn();
    emitter.on('hit', spy);
    expect(emitter.listenerCount('hit')).toBe(1);
    emitter.on('hit', vi.fn());
    expect(emitter.listenerCount('hit')).toBe(2);
    emitter.off('hit', spy);
    expect(emitter.listenerCount('hit')).toBe(1);
  });

  /* ---------- chaining ---------- */

  it('on/off/once should return this for chaining', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    const result = emitter.on('hit', spy).once('die', vi.fn()).off('hit', spy);
    expect(result).toBe(emitter);
  });

  /* ---------- edge cases ---------- */

  it('should handle zero-argument events', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy = vi.fn();
    emitter.on('die', spy);
    emitter.emit('die');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not interfere between different event types', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const hitSpy = vi.fn();
    const dieSpy = vi.fn();
    emitter.on('hit', hitSpy);
    emitter.on('die', dieSpy);
    emitter.emit('hit', 10);
    expect(hitSpy).toHaveBeenCalledTimes(1);
    expect(dieSpy).not.toHaveBeenCalled();
  });

  it('listener removing itself during emit should not skip next listener', () => {
    const emitter = new mod.EventEmitter<TestEvents>();
    const spy2 = vi.fn();
    const selfRemover = () => {
      emitter.off('die', selfRemover);
    };
    emitter.on('die', selfRemover);
    emitter.on('die', spy2);
    emitter.emit('die');
    // spy2 must still be called
    expect(spy2).toHaveBeenCalledTimes(1);
  });
});
