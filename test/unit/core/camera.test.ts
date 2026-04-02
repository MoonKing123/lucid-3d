/**
 * Pre-written tests for Camera.
 * AI must implement src/core/camera.ts to make these pass.
 */
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera } from '../../src/core/camera';
import { vec3 } from '../../src/math/vec3';

describe('PerspectiveCamera', () => {
  it('creates camera with default parameters', () => {
    const cam = new PerspectiveCamera();
    expect(cam.fov).toBeCloseTo(Math.PI / 4); // 45°
    expect(cam.aspect).toBeCloseTo(1);
    expect(cam.near).toBeCloseTo(0.1);
    expect(cam.far).toBeCloseTo(100);
  });

  it('creates camera with custom parameters', () => {
    const cam = new PerspectiveCamera({
      fov: Math.PI / 3,
      aspect: 16 / 9,
      near: 0.5,
      far: 1000,
    });
    expect(cam.fov).toBeCloseTo(Math.PI / 3);
    expect(cam.aspect).toBeCloseTo(16 / 9);
    expect(cam.near).toBeCloseTo(0.5);
    expect(cam.far).toBeCloseTo(1000);
  });

  describe('projectionMatrix', () => {
    it('returns valid perspective projection', () => {
      const cam = new PerspectiveCamera();
      const p = cam.projectionMatrix;
      expect(p).toBeInstanceOf(Float32Array);
      expect(p.length).toBe(16);
      // Perspective divide indicator
      expect(p[11]).toBeCloseTo(-1);
      expect(p[15]).toBeCloseTo(0);
    });

    it('updates when fov changes', () => {
      const cam = new PerspectiveCamera();
      const p1 = cam.projectionMatrix[0];
      cam.fov = Math.PI / 6; // 30°
      const p2 = cam.projectionMatrix[0];
      expect(p1).not.toBeCloseTo(p2);
    });

    it('updates when aspect changes', () => {
      const cam = new PerspectiveCamera();
      const p1 = cam.projectionMatrix[0];
      cam.aspect = 2;
      const p2 = cam.projectionMatrix[0];
      expect(p1).not.toBeCloseTo(p2);
    });
  });

  describe('viewMatrix', () => {
    it('is identity when camera is at origin looking at -Z', () => {
      const cam = new PerspectiveCamera();
      // Default: position (0,0,0), looking at -Z
      const v = cam.viewMatrix;
      expect(v).toBeInstanceOf(Float32Array);
      expect(v.length).toBe(16);
    });

    it('updates when position changes', () => {
      const cam = new PerspectiveCamera();
      cam.position = vec3(0, 0, 5);
      const v = cam.viewMatrix;
      // Camera moved to z=5, so objects at origin appear at z=-5 in view space
      // Translation component: v[14] should be -5
      expect(v[14]).toBeCloseTo(-5);
    });
  });

  describe('lookAt', () => {
    it('sets camera to look at a target', () => {
      const cam = new PerspectiveCamera();
      cam.position = vec3(0, 5, 5);
      cam.lookAt(vec3(0, 0, 0));
      const v = cam.viewMatrix;
      // View matrix should be valid (not identity)
      expect(v).toBeInstanceOf(Float32Array);
      // The eye point should map to origin in view space
      // This is a sanity check
      expect(v[15]).toBeCloseTo(1);
    });
  });

  describe('viewProjectionMatrix', () => {
    it('combines view and projection', () => {
      const cam = new PerspectiveCamera();
      cam.position = vec3(0, 0, 5);
      const vp = cam.viewProjectionMatrix;
      expect(vp).toBeInstanceOf(Float32Array);
      expect(vp.length).toBe(16);
      // Should not be identity (both view and proj contribute)
      expect(vp[14]).not.toBeCloseTo(0);
    });
  });

  describe('inherits Node3D', () => {
    it('can be added as child to scene graph', () => {
      const cam = new PerspectiveCamera();
      expect(cam.name).toBeDefined();
      expect(cam.children).toBeDefined();
      expect(cam.parent).toBeNull();
    });
  });
});
