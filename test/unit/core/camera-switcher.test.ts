/**
 * CameraSwitcher — pre-written tests (Architect)
 * Validates: register/unregister, switchTo, push/pop stack, active getter,
 *            has/names/stackDepth, error on unknown name.
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/camera-switcher';
import { PerspectiveCamera } from '../../../src/core/camera';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CameraSwitcher', () => {
  it('should construct empty', () => {
    const sw = new mod.CameraSwitcher();
    expect(sw.active).toBeNull();
    expect(sw.activeName).toBeNull();
    expect(sw.names).toEqual([]);
    expect(sw.stackDepth).toBe(0);
  });

  it('register() adds a camera under a name', () => {
    const sw = new mod.CameraSwitcher();
    const cam = new PerspectiveCamera();
    sw.register('main', cam);
    expect(sw.has('main')).toBe(true);
    expect(sw.names).toContain('main');
  });

  it('first register should auto-activate the camera', () => {
    const sw = new mod.CameraSwitcher();
    const cam = new PerspectiveCamera();
    sw.register('main', cam);
    expect(sw.active).toBe(cam);
    expect(sw.activeName).toBe('main');
  });

  it('switchTo() changes active camera', () => {
    const sw = new mod.CameraSwitcher();
    const c1 = new PerspectiveCamera();
    const c2 = new PerspectiveCamera();
    sw.register('main', c1);
    sw.register('cinematic', c2);
    sw.switchTo('cinematic');
    expect(sw.active).toBe(c2);
    expect(sw.activeName).toBe('cinematic');
  });

  it('switchTo() unknown name should throw', () => {
    const sw = new mod.CameraSwitcher();
    expect(() => sw.switchTo('ghost')).toThrow();
  });

  it('unregister() removes camera, clears active if it was current', () => {
    const sw = new mod.CameraSwitcher();
    const cam = new PerspectiveCamera();
    sw.register('main', cam);
    sw.unregister('main');
    expect(sw.has('main')).toBe(false);
    expect(sw.active).toBeNull();
    expect(sw.activeName).toBeNull();
  });

  it('push()/pop() stack navigation', () => {
    const sw = new mod.CameraSwitcher();
    const c1 = new PerspectiveCamera();
    const c2 = new PerspectiveCamera();
    const c3 = new PerspectiveCamera();
    sw.register('main', c1);
    sw.register('cinematic', c2);
    sw.register('debug', c3);

    sw.switchTo('main');
    expect(sw.stackDepth).toBe(0);

    sw.push('cinematic');
    expect(sw.active).toBe(c2);
    expect(sw.stackDepth).toBe(1);

    sw.push('debug');
    expect(sw.active).toBe(c3);
    expect(sw.stackDepth).toBe(2);

    const restored1 = sw.pop();
    expect(restored1).toBe('cinematic');
    expect(sw.active).toBe(c2);
    expect(sw.stackDepth).toBe(1);

    const restored2 = sw.pop();
    expect(restored2).toBe('main');
    expect(sw.active).toBe(c1);
    expect(sw.stackDepth).toBe(0);
  });

  it('pop() on empty stack returns null and active unchanged', () => {
    const sw = new mod.CameraSwitcher();
    const cam = new PerspectiveCamera();
    sw.register('main', cam);
    const result = sw.pop();
    expect(result).toBeNull();
    expect(sw.active).toBe(cam);
  });

  it('names returns registered names in insertion order', () => {
    const sw = new mod.CameraSwitcher();
    sw.register('a', new PerspectiveCamera());
    sw.register('b', new PerspectiveCamera());
    sw.register('c', new PerspectiveCamera());
    expect(sw.names).toEqual(['a', 'b', 'c']);
  });

  it('register with duplicate name should throw', () => {
    const sw = new mod.CameraSwitcher();
    sw.register('main', new PerspectiveCamera());
    expect(() => sw.register('main', new PerspectiveCamera())).toThrow();
  });
});
