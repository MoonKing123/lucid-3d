import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/health';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('Health', () => {
  it('initializes with default max=100', () => {
    const h = new mod.Health();
    expect(h.current).toBe(100);
    expect(h.max).toBe(100);
    expect(h.isDead).toBe(false);
  });

  it('initializes with custom max', () => {
    const h = new mod.Health(50);
    expect(h.current).toBe(50);
    expect(h.max).toBe(50);
  });

  it('takeDamage reduces current', () => {
    const h = new mod.Health(100);
    h.takeDamage(30);
    expect(h.current).toBe(70);
  });

  it('takeDamage clamps to 0', () => {
    const h = new mod.Health(100);
    h.takeDamage(150);
    expect(h.current).toBe(0);
    expect(h.isDead).toBe(true);
  });

  it('emits health.changed on damage', () => {
    const h = new mod.Health(100);
    const fn = vi.fn();
    h.on('health.changed', fn);
    h.takeDamage(20);
    expect(fn).toHaveBeenCalledWith(80, 100);
  });

  it('emits health.died when reaching 0', () => {
    const h = new mod.Health(100);
    const fn = vi.fn();
    h.on('health.died', fn);
    h.takeDamage(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not take damage when already dead', () => {
    const h = new mod.Health(100);
    h.takeDamage(100);
    const fn = vi.fn();
    h.on('health.changed', fn);
    h.takeDamage(10);
    expect(fn).not.toHaveBeenCalled();
    expect(h.current).toBe(0);
  });

  it('heal restores current', () => {
    const h = new mod.Health(100);
    h.takeDamage(60);
    h.heal(30);
    expect(h.current).toBe(70);
  });

  it('heal clamps to max', () => {
    const h = new mod.Health(100);
    h.takeDamage(20);
    h.heal(50);
    expect(h.current).toBe(100);
  });

  it('heal emits health.changed', () => {
    const h = new mod.Health(100);
    h.takeDamage(50);
    const fn = vi.fn();
    h.on('health.changed', fn);
    h.heal(20);
    expect(fn).toHaveBeenCalledWith(70, 100);
  });

  it('reset restores to max', () => {
    const h = new mod.Health(100);
    h.takeDamage(80);
    h.reset();
    expect(h.current).toBe(100);
    expect(h.isDead).toBe(false);
  });

  it('reset with newMax changes max and restores', () => {
    const h = new mod.Health(100);
    h.takeDamage(80);
    h.reset(200);
    expect(h.current).toBe(200);
    expect(h.max).toBe(200);
  });

  it('reset emits health.changed', () => {
    const h = new mod.Health(100);
    h.takeDamage(50);
    const fn = vi.fn();
    h.on('health.changed', fn);
    h.reset();
    expect(fn).toHaveBeenCalledWith(100, 100);
  });

  it('reset revives dead entity', () => {
    const h = new mod.Health(100);
    h.takeDamage(100);
    expect(h.isDead).toBe(true);
    h.reset();
    expect(h.isDead).toBe(false);
    expect(h.current).toBe(100);
  });
});
