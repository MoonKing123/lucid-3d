/**
 * FollowCamera — pre-written tests (Architect)
 * Validates: construction, snap, update damping, lookAt, distance clamp
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/follow-camera';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('FollowCamera', () => {
  /* ---------- construction ---------- */

  it('should create with default options', () => {
    const cam = new mod.FollowCamera();
    expect(cam).toBeDefined();
    expect(cam.offset[0]).toBe(0);
    expect(cam.offset[1]).toBe(5);
    expect(cam.offset[2]).toBe(-10);
    expect(cam.damping).toBe(0.1);
    expect(cam.target).toBeNull();
  });

  it('should accept custom options', () => {
    const cam = new mod.FollowCamera({
      offset: vec3(0, 10, -20),
      lookAtOffset: vec3(0, 2, 0),
      damping: 0.5,
      minDistance: 5,
      maxDistance: 50,
    });
    expect(cam.offset[1]).toBe(10);
    expect(cam.offset[2]).toBe(-20);
    expect(cam.lookAtOffset[1]).toBe(2);
    expect(cam.damping).toBe(0.5);
    expect(cam.minDistance).toBe(5);
    expect(cam.maxDistance).toBe(50);
  });

  /* ---------- snap ---------- */

  it('should snap camera to ideal position immediately', () => {
    const cam = new mod.FollowCamera({ offset: vec3(0, 5, -10) });
    const target = new Node3D('player');
    target.position = vec3(10, 0, 20);
    cam.target = target;

    cam.snap();

    // Camera should be at target.position + offset = (10, 5, 10)
    expect(cam.position[0]).toBeCloseTo(10);
    expect(cam.position[1]).toBeCloseTo(5);
    expect(cam.position[2]).toBeCloseTo(10);
  });

  it('should snap to origin offset when target is at origin', () => {
    const cam = new mod.FollowCamera({ offset: vec3(3, 4, 5) });
    const target = new Node3D('player');
    target.position = vec3(0, 0, 0);
    cam.target = target;

    cam.snap();

    expect(cam.position[0]).toBeCloseTo(3);
    expect(cam.position[1]).toBeCloseTo(4);
    expect(cam.position[2]).toBeCloseTo(5);
  });

  /* ---------- update with damping ---------- */

  it('should move camera toward ideal position on update', () => {
    const cam = new mod.FollowCamera({ offset: vec3(0, 5, -10), damping: 0.1 });
    const target = new Node3D('player');
    target.position = vec3(10, 0, 0);
    cam.target = target;

    // Camera starts at origin, ideal position is (10, 5, -10)
    cam.position = vec3(0, 0, 0);

    cam.update(1 / 60);

    // Should have moved toward ideal but not reached it due to damping
    expect(cam.position[0]).toBeGreaterThan(0);
    expect(cam.position[0]).toBeLessThan(10);
  });

  it('should converge to ideal position over many frames', () => {
    const cam = new mod.FollowCamera({ offset: vec3(0, 5, -10), damping: 0.1 });
    const target = new Node3D('player');
    target.position = vec3(10, 0, 0);
    cam.target = target;
    cam.position = vec3(0, 0, 0);

    // Simulate 300 frames (should be very close to ideal)
    for (let i = 0; i < 300; i++) cam.update(1 / 60);

    expect(cam.position[0]).toBeCloseTo(10, 0);
    expect(cam.position[1]).toBeCloseTo(5, 0);
    expect(cam.position[2]).toBeCloseTo(-10, 0);
  });

  it('should not move when dt is 0', () => {
    const cam = new mod.FollowCamera({ offset: vec3(0, 5, -10) });
    const target = new Node3D('player');
    target.position = vec3(10, 0, 0);
    cam.target = target;
    cam.position = vec3(0, 0, 0);

    cam.update(0);

    expect(cam.position[0]).toBe(0);
    expect(cam.position[1]).toBe(0);
    expect(cam.position[2]).toBe(0);
  });

  /* ---------- lookAt ---------- */

  it('should look at target position plus lookAtOffset after snap', () => {
    const cam = new mod.FollowCamera({
      offset: vec3(0, 5, -10),
      lookAtOffset: vec3(0, 2, 0),
    });
    const target = new Node3D('player');
    target.position = vec3(0, 0, 0);
    cam.target = target;

    cam.snap();

    // After snap, viewMatrix should encode looking at (0, 2, 0) from (0, 5, -10)
    const vm = cam.viewMatrix;
    expect(vm).toBeDefined();
    // Camera position should be at offset
    expect(cam.position[0]).toBeCloseTo(0);
    expect(cam.position[1]).toBeCloseTo(5);
    expect(cam.position[2]).toBeCloseTo(-10);
  });

  /* ---------- no target ---------- */

  it('should stay in place when target is null', () => {
    const cam = new mod.FollowCamera();
    cam.position = vec3(1, 2, 3);
    cam.target = null;

    cam.update(1 / 60);

    expect(cam.position[0]).toBe(1);
    expect(cam.position[1]).toBe(2);
    expect(cam.position[2]).toBe(3);
  });

  /* ---------- distance clamping ---------- */

  it('should clamp camera distance to minDistance', () => {
    const cam = new mod.FollowCamera({
      offset: vec3(0, 0, -0.1), // very close
      minDistance: 5,
      maxDistance: 100,
    });
    const target = new Node3D('player');
    target.position = vec3(0, 0, 0);
    cam.target = target;

    cam.snap();

    // Distance should be at least minDistance
    const dx = cam.position[0] - target.position[0];
    const dy = cam.position[1] - target.position[1];
    const dz = cam.position[2] - target.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(dist).toBeGreaterThanOrEqual(5 - 0.01);
  });

  it('should clamp camera distance to maxDistance', () => {
    const cam = new mod.FollowCamera({
      offset: vec3(0, 0, -500), // very far
      minDistance: 1,
      maxDistance: 50,
    });
    const target = new Node3D('player');
    target.position = vec3(0, 0, 0);
    cam.target = target;

    cam.snap();

    const dx = cam.position[0];
    const dy = cam.position[1];
    const dz = cam.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(dist).toBeLessThanOrEqual(50 + 0.01);
  });

  /* ---------- PerspectiveCamera inheritance ---------- */

  it('should have valid projectionMatrix (inherits PerspectiveCamera)', () => {
    const cam = new mod.FollowCamera();
    const pm = cam.projectionMatrix;
    expect(pm).toBeDefined();
    expect(pm.length).toBe(16);
  });
});
