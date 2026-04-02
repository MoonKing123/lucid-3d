/**
 * Pre-written tests for Frustum — view frustum culling.
 * AI must implement src/math/frustum.ts to make these pass.
 *
 * API — Plane:
 *   interface Plane { normal: Vec3; constant: number; }
 *   createPlane(normal?: Vec3, constant?: number): Plane;
 *   distanceToPoint(plane: Plane, point: Vec3): number;
 *
 * API — Frustum:
 *   class Frustum {
 *     planes: Plane[];   // 6 clip planes [left, right, bottom, top, near, far]
 *     constructor();
 *     setFromProjectionMatrix(m: Mat4): void;  // extract planes from VP matrix
 *     containsPoint(point: Vec3): boolean;
 *     intersectsAABB(aabb: { min: Vec3; max: Vec3 }): boolean;
 *   }
 *
 * Implementation notes:
 * - Extract 6 planes from the combined viewProjection matrix (Gribb/Hartmann method)
 * - Each plane: normal points inward (toward frustum interior)
 * - Normalize each plane after extraction (divide by normal length)
 * - intersectsAABB: test the P-vertex (furthest along plane normal) against each plane
 * - Depends on: Vec3, Mat4, AABB interface (min/max Vec3)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/math/frustum';
import { vec3 } from '../../../src/math/vec3';
import { perspective, lookAt, multiply, identity } from '../../../src/math/mat4';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Frustum, createPlane, distanceToPoint } = mod;

/* ───────────── Plane ───────────── */

describeImpl('Plane — createPlane', () => {
  it('should create plane with given normal and constant', () => {
    const p = createPlane(vec3(0, 1, 0), 5);
    expect(p.normal[0]).toBeCloseTo(0);
    expect(p.normal[1]).toBeCloseTo(1);
    expect(p.normal[2]).toBeCloseTo(0);
    expect(p.constant).toBeCloseTo(5);
  });

  it('should default to (0,0,1) normal and 0 constant', () => {
    const p = createPlane();
    expect(p.normal[2]).toBeCloseTo(1);
    expect(p.constant).toBeCloseTo(0);
  });
});

describeImpl('Plane — distanceToPoint', () => {
  it('should return positive distance for point on normal side', () => {
    const p = createPlane(vec3(0, 1, 0), 0);
    const d = distanceToPoint(p, vec3(0, 5, 0));
    expect(d).toBeCloseTo(5);
  });

  it('should return negative distance for point on opposite side', () => {
    const p = createPlane(vec3(0, 1, 0), 0);
    const d = distanceToPoint(p, vec3(0, -3, 0));
    expect(d).toBeCloseTo(-3);
  });

  it('should return 0 for point on the plane', () => {
    const p = createPlane(vec3(0, 1, 0), -2);
    const d = distanceToPoint(p, vec3(5, 2, 3));
    expect(d).toBeCloseTo(0);
  });
});

/* ───────────── Frustum construction ───────────── */

describeImpl('Frustum — construction', () => {
  it('should start with empty planes array', () => {
    const f = new Frustum();
    expect(f.planes).toBeDefined();
  });

  it('setFromProjectionMatrix should create 6 planes', () => {
    const f = new Frustum();
    const proj = perspective(Math.PI / 4, 1, 0.1, 100);
    const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
    const vp = multiply(proj, view);
    f.setFromProjectionMatrix(vp);
    expect(f.planes.length).toBe(6);
  });
});

/* ───────────── containsPoint ───────────── */

describeImpl('Frustum — containsPoint', () => {
  function makeFrustum(): InstanceType<typeof Frustum> {
    const f = new Frustum();
    const proj = perspective(Math.PI / 2, 1, 1, 100);
    const view = lookAt(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
    f.setFromProjectionMatrix(multiply(proj, view));
    return f;
  }

  it('should contain origin (camera looks at it)', () => {
    const f = makeFrustum();
    expect(f.containsPoint(vec3(0, 0, 0))).toBe(true);
  });

  it('should contain point near center of frustum', () => {
    const f = makeFrustum();
    expect(f.containsPoint(vec3(0, 0, 5))).toBe(true);
  });

  it('should NOT contain point behind camera', () => {
    const f = makeFrustum();
    expect(f.containsPoint(vec3(0, 0, 20))).toBe(false);
  });

  it('should NOT contain point far beyond far plane', () => {
    const f = makeFrustum();
    expect(f.containsPoint(vec3(0, 0, -200))).toBe(false);
  });

  it('should NOT contain point far to the side', () => {
    const f = makeFrustum();
    expect(f.containsPoint(vec3(500, 0, 5))).toBe(false);
  });
});

/* ───────────── intersectsAABB ───────────── */

describeImpl('Frustum — intersectsAABB', () => {
  function makeFrustum(): InstanceType<typeof Frustum> {
    const f = new Frustum();
    const proj = perspective(Math.PI / 2, 1, 1, 100);
    const view = lookAt(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
    f.setFromProjectionMatrix(multiply(proj, view));
    return f;
  }

  it('should intersect AABB at origin', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) };
    expect(f.intersectsAABB(aabb)).toBe(true);
  });

  it('should intersect AABB partially inside', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(-2, -2, 4), max: vec3(2, 2, 8) };
    expect(f.intersectsAABB(aabb)).toBe(true);
  });

  it('should NOT intersect AABB behind camera', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(-1, -1, 15), max: vec3(1, 1, 20) };
    expect(f.intersectsAABB(aabb)).toBe(false);
  });

  it('should NOT intersect AABB far to the side', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(200, 200, 0), max: vec3(210, 210, 5) };
    expect(f.intersectsAABB(aabb)).toBe(false);
  });

  it('should NOT intersect AABB beyond far plane', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(-1, -1, -200), max: vec3(1, 1, -150) };
    expect(f.intersectsAABB(aabb)).toBe(false);
  });

  it('should intersect large AABB encompassing entire frustum', () => {
    const f = makeFrustum();
    const aabb = { min: vec3(-500, -500, -500), max: vec3(500, 500, 500) };
    expect(f.intersectsAABB(aabb)).toBe(true);
  });

  it('should work with identity matrix (NDC cube)', () => {
    const f = new Frustum();
    f.setFromProjectionMatrix(identity());
    const inside = { min: vec3(-0.5, -0.5, -0.5), max: vec3(0.5, 0.5, 0.5) };
    expect(f.intersectsAABB(inside)).toBe(true);
    const outside = { min: vec3(2, 2, 2), max: vec3(3, 3, 3) };
    expect(f.intersectsAABB(outside)).toBe(false);
  });
});
