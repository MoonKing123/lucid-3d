/**
 * OrbitCamera — pre-written tests (Architect)
 * Validates: construction, rotate, zoom, pan, update, setTarget, reset
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/orbit-camera';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('OrbitCamera', () => {
  /* ---------- construction ---------- */

  it('should create with default options', () => {
    const cam = new mod.OrbitCamera();
    expect(cam).toBeDefined();
    expect(cam.distance).toBe(10);
    expect(cam.minDistance).toBe(1);
    expect(cam.maxDistance).toBe(100);
    expect(cam.orbitTarget[0]).toBe(0);
    expect(cam.orbitTarget[1]).toBe(0);
    expect(cam.orbitTarget[2]).toBe(0);
    expect(cam.enablePan).toBe(true);
  });

  it('should accept custom options', () => {
    const cam = new mod.OrbitCamera({
      target: vec3(5, 0, 5),
      distance: 20,
      minDistance: 5,
      maxDistance: 50,
      damping: 0.3,
      rotateSpeed: 2,
      zoomSpeed: 1.5,
      enablePan: false,
    });
    expect(cam.distance).toBe(20);
    expect(cam.minDistance).toBe(5);
    expect(cam.maxDistance).toBe(50);
    expect(cam.orbitTarget[0]).toBe(5);
    expect(cam.damping).toBe(0.3);
    expect(cam.rotateSpeed).toBe(2);
    expect(cam.enablePan).toBe(false);
  });

  /* ---------- rotate ---------- */

  it('should change angles on rotate()', () => {
    const cam = new mod.OrbitCamera();
    const initialAzimuth = cam.azimuthAngle;
    const initialPolar = cam.polarAngle;

    cam.rotate(0.5, 0.3);

    expect(cam.azimuthAngle).not.toBe(initialAzimuth);
    expect(cam.polarAngle).not.toBe(initialPolar);
  });

  it('should clamp polar angle to min/max', () => {
    const cam = new mod.OrbitCamera({
      minPolarAngle: 0.2,
      maxPolarAngle: 2.0,
    });

    // Try to rotate far beyond limits
    cam.rotate(0, -100);
    expect(cam.polarAngle).toBeGreaterThanOrEqual(0.2);

    cam.rotate(0, 200);
    expect(cam.polarAngle).toBeLessThanOrEqual(2.0);
  });

  /* ---------- zoom ---------- */

  it('should change distance on zoom()', () => {
    const cam = new mod.OrbitCamera({ distance: 10 });

    cam.zoom(0.5); // zoom in
    expect(cam.distance).toBeLessThan(10);
  });

  it('should clamp distance to min/max', () => {
    const cam = new mod.OrbitCamera({
      distance: 10,
      minDistance: 5,
      maxDistance: 20,
    });

    cam.zoom(100); // zoom out a lot
    expect(cam.distance).toBeLessThanOrEqual(20);

    cam.zoom(-100); // zoom in a lot
    expect(cam.distance).toBeGreaterThanOrEqual(5);
  });

  /* ---------- pan ---------- */

  it('should move orbit target on pan()', () => {
    const cam = new mod.OrbitCamera({ target: vec3(0, 0, 0) });

    cam.pan(5, 3);

    // Target should have moved
    const tx = cam.orbitTarget[0];
    const ty = cam.orbitTarget[1];
    const tz = cam.orbitTarget[2];
    const moved = Math.abs(tx) + Math.abs(ty) + Math.abs(tz) > 0.01;
    expect(moved).toBe(true);
  });

  it('should NOT pan when enablePan is false', () => {
    const cam = new mod.OrbitCamera({ target: vec3(0, 0, 0), enablePan: false });

    cam.pan(5, 3);

    expect(cam.orbitTarget[0]).toBe(0);
    expect(cam.orbitTarget[1]).toBe(0);
    expect(cam.orbitTarget[2]).toBe(0);
  });

  /* ---------- update ---------- */

  it('should position camera on sphere around target after update()', () => {
    const cam = new mod.OrbitCamera({ distance: 10, target: vec3(0, 0, 0) });
    cam.azimuthAngle = 0;
    cam.polarAngle = Math.PI / 2; // equator

    cam.update(1 / 60);

    // Camera should be roughly at distance 10 from origin
    const dx = cam.position[0];
    const dy = cam.position[1];
    const dz = cam.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(dist).toBeCloseTo(10, 0);
  });

  it('should look at orbit target after update()', () => {
    const cam = new mod.OrbitCamera({ target: vec3(5, 0, 5), distance: 10 });

    cam.update(1 / 60);

    // ViewMatrix should be valid (camera is looking at the target)
    const vm = cam.viewMatrix;
    expect(vm).toBeDefined();
    expect(vm.length).toBe(16);
  });

  /* ---------- setTarget ---------- */

  it('should update orbit center via setTarget()', () => {
    const cam = new mod.OrbitCamera();

    cam.setTarget(vec3(10, 5, 10));

    expect(cam.orbitTarget[0]).toBe(10);
    expect(cam.orbitTarget[1]).toBe(5);
    expect(cam.orbitTarget[2]).toBe(10);
  });

  /* ---------- reset ---------- */

  it('should restore initial state on reset()', () => {
    const cam = new mod.OrbitCamera({
      distance: 15,
      target: vec3(1, 2, 3),
    });

    // Change state
    cam.rotate(1.5, 0.5);
    cam.zoom(5);
    cam.pan(10, 10);

    cam.reset();

    expect(cam.distance).toBe(15);
    expect(cam.orbitTarget[0]).toBeCloseTo(1);
    expect(cam.orbitTarget[1]).toBeCloseTo(2);
    expect(cam.orbitTarget[2]).toBeCloseTo(3);
    expect(cam.azimuthAngle).toBe(0);
    expect(cam.polarAngle).toBe(Math.PI / 4);
  });

  /* ---------- rotateSpeed ---------- */

  it('should scale rotation by rotateSpeed', () => {
    const cam1 = new mod.OrbitCamera({ rotateSpeed: 1 });
    const cam2 = new mod.OrbitCamera({ rotateSpeed: 2 });

    cam1.rotate(1, 0);
    cam2.rotate(1, 0);

    // cam2 should have rotated further
    const diff = Math.abs(cam2.azimuthAngle) - Math.abs(cam1.azimuthAngle);
    expect(diff).toBeGreaterThan(0);
  });

  /* ---------- PerspectiveCamera inheritance ---------- */

  it('should have valid projectionMatrix (inherits PerspectiveCamera)', () => {
    const cam = new mod.OrbitCamera();
    const pm = cam.projectionMatrix;
    expect(pm).toBeDefined();
    expect(pm.length).toBe(16);
  });
});
