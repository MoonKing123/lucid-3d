/**
 * Pre-written tests for Camera base class unification.
 * AI must:
 *   1. Add abstract Camera class to src/core/camera.ts (extends Node3D)
 *   2. Make PerspectiveCamera and OrthographicCamera extend Camera
 *   3. Export Camera from src/core/camera.ts
 *   4. Update WebGLRenderer.render() to accept Camera instead of PerspectiveCamera
 *
 * Camera abstract class must declare:
 *   - abstract get projectionMatrix(): Mat4
 *   - abstract get viewMatrix(): Mat4
 *   - abstract get viewProjectionMatrix(): Mat4
 *   - abstract lookAt(target: Vec3): void
 *   - position (inherited from Node3D)
 */
import { describe, it, expect } from 'vitest';
import * as cameraMod from '../../../src/core/camera';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';

const hasCamera = 'Camera' in cameraMod;
const describeImpl = hasCamera ? describe : describe.skip;

const Camera = (cameraMod as any).Camera;
const { PerspectiveCamera, OrthographicCamera } = cameraMod;

/* ───────────── Camera base class ───────────── */

describeImpl('Camera — base class contract', () => {
  it('Camera should be a function (class)', () => {
    expect(typeof Camera).toBe('function');
  });

  it('Camera should extend Node3D', () => {
    // We verify via subclass since Camera is abstract
    const pc = new PerspectiveCamera();
    expect(pc).toBeInstanceOf(Node3D);
    expect(pc).toBeInstanceOf(Camera);
  });
});

/* ───────────── PerspectiveCamera extends Camera ───────────── */

describeImpl('PerspectiveCamera — extends Camera', () => {
  it('should be instanceof Camera', () => {
    const pc = new PerspectiveCamera();
    expect(pc).toBeInstanceOf(Camera);
  });

  it('should have projectionMatrix (Float32Array of 16)', () => {
    const pc = new PerspectiveCamera();
    expect(pc.projectionMatrix).toBeInstanceOf(Float32Array);
    expect(pc.projectionMatrix.length).toBe(16);
  });

  it('should have viewMatrix (Float32Array of 16)', () => {
    const pc = new PerspectiveCamera();
    expect(pc.viewMatrix).toBeInstanceOf(Float32Array);
    expect(pc.viewMatrix.length).toBe(16);
  });

  it('should have viewProjectionMatrix (Float32Array of 16)', () => {
    const pc = new PerspectiveCamera();
    expect(pc.viewProjectionMatrix).toBeInstanceOf(Float32Array);
    expect(pc.viewProjectionMatrix.length).toBe(16);
  });

  it('should have lookAt method', () => {
    const pc = new PerspectiveCamera();
    expect(typeof pc.lookAt).toBe('function');
    expect(() => pc.lookAt(vec3(0, 0, 0))).not.toThrow();
  });
});

/* ───────────── OrthographicCamera extends Camera ───────────── */

describeImpl('OrthographicCamera — extends Camera', () => {
  it('should be instanceof Camera', () => {
    const oc = new OrthographicCamera(-1, 1, -1, 1);
    expect(oc).toBeInstanceOf(Camera);
  });

  it('should have projectionMatrix (Float32Array of 16)', () => {
    const oc = new OrthographicCamera(-1, 1, -1, 1);
    expect(oc.projectionMatrix).toBeInstanceOf(Float32Array);
    expect(oc.projectionMatrix.length).toBe(16);
  });

  it('should have viewMatrix (Float32Array of 16)', () => {
    const oc = new OrthographicCamera(-1, 1, -1, 1);
    expect(oc.viewMatrix).toBeInstanceOf(Float32Array);
    expect(oc.viewMatrix.length).toBe(16);
  });

  it('should have viewProjectionMatrix (Float32Array of 16)', () => {
    const oc = new OrthographicCamera(-1, 1, -1, 1);
    expect(oc.viewProjectionMatrix).toBeInstanceOf(Float32Array);
    expect(oc.viewProjectionMatrix.length).toBe(16);
  });

  it('should have lookAt method', () => {
    const oc = new OrthographicCamera(-1, 1, -1, 1);
    expect(typeof oc.lookAt).toBe('function');
    expect(() => oc.lookAt(vec3(0, 0, 0))).not.toThrow();
  });
});

/* ───────────── Polymorphism ───────────── */

describeImpl('Camera — polymorphism', () => {
  it('both camera types should satisfy the same Camera interface', () => {
    const cameras: InstanceType<typeof Camera>[] = [
      new PerspectiveCamera(),
      new OrthographicCamera(-1, 1, -1, 1),
    ];

    for (const cam of cameras) {
      expect(cam).toBeInstanceOf(Camera);
      expect(cam).toBeInstanceOf(Node3D);
      expect(cam.projectionMatrix).toBeInstanceOf(Float32Array);
      expect(cam.viewMatrix).toBeInstanceOf(Float32Array);
      expect(cam.viewProjectionMatrix).toBeInstanceOf(Float32Array);
      expect(typeof cam.lookAt).toBe('function');
    }
  });
});
