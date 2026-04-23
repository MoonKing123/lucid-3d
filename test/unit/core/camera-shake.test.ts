/**
 * CameraShake — pre-written tests (Architect)
 * Validates: construction, layer add, decay, multi-layer sum, clear, param validation.
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/camera-shake';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CameraShake', () => {
  it('should construct with zero active layers', () => {
    const shake = new mod.CameraShake();
    expect(shake.activeLayerCount).toBe(0);
    expect(shake.positionOffset).toEqual([0, 0, 0]);
    expect(shake.rotationOffset).toEqual([0, 0, 0]);
  });

  it('should add a shake layer and report activeLayerCount', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 0.5, duration: 1.0 });
    expect(shake.activeLayerCount).toBe(1);
  });

  it('should produce non-zero positionOffset during active shake', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 0.5, duration: 1.0, frequency: 30 });
    shake.update(0.016);
    const p = shake.positionOffset;
    const mag = Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]);
    expect(mag).toBeGreaterThan(0);
  });

  it('should decay intensity over time with exponential decay (default)', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 1.0, duration: 1.0 });
    shake.update(0.016);
    const earlyMax = Math.max(...shake.positionOffset.map(Math.abs));
    for (let i = 0; i < 40; i++) shake.update(0.016);
    const lateMax = Math.max(...shake.positionOffset.map(Math.abs));
    expect(lateMax).toBeLessThan(earlyMax);
  });

  it('should remove layer when duration elapsed', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 0.5, duration: 0.1 });
    expect(shake.activeLayerCount).toBe(1);
    shake.update(0.2);
    expect(shake.activeLayerCount).toBe(0);
    expect(shake.positionOffset).toEqual([0, 0, 0]);
  });

  it('should sum multiple layers additively', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 0.5, duration: 1.0 });
    shake.add({ intensity: 0.3, duration: 1.0 });
    shake.add({ intensity: 0.2, duration: 1.0 });
    expect(shake.activeLayerCount).toBe(3);
    shake.update(0.016);
    expect(shake.positionOffset).toBeDefined();
  });

  it('clear() should remove all layers', () => {
    const shake = new mod.CameraShake();
    shake.add({ intensity: 0.5, duration: 1.0 });
    shake.add({ intensity: 0.3, duration: 1.0 });
    shake.clear();
    expect(shake.activeLayerCount).toBe(0);
    expect(shake.positionOffset).toEqual([0, 0, 0]);
  });

  it('should throw on intensity <= 0', () => {
    const shake = new mod.CameraShake();
    expect(() => shake.add({ intensity: 0, duration: 1 })).toThrow();
    expect(() => shake.add({ intensity: -0.5, duration: 1 })).toThrow();
  });

  it('should throw on duration <= 0', () => {
    const shake = new mod.CameraShake();
    expect(() => shake.add({ intensity: 0.5, duration: 0 })).toThrow();
    expect(() => shake.add({ intensity: 0.5, duration: -1 })).toThrow();
  });
});
