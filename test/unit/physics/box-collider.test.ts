/**
 * Pre-written tests for BoxCollider — AABB box collision shape.
 * AI must implement src/physics/box-collider.ts to make these pass.
 *
 * API:
 *   class BoxCollider {
 *     center: Vec3;       // local-space center offset
 *     halfExtents: Vec3;  // half-size on each axis (always positive)
 *
 *     constructor(halfExtents?: Vec3, center?: Vec3);
 *     intersectsBox(other: BoxCollider): boolean;
 *     intersectsSphere(sphere: SphereCollider): boolean;
 *     overlapBox(other: BoxCollider): number;
 *     overlapSphere(sphere: SphereCollider): number;
 *     containsPoint(point: Vec3): boolean;
 *     toAABB(): AABB;
 *     clone(): BoxCollider;
 *   }
 *
 * Implementation notes:
 * - Box-box intersection: AABB overlap test on all 3 axes
 * - Box-sphere: closest point on box to sphere center, then distance check
 * - Overlap depth: minimum penetration across all separating axes (SAT)
 * - toAABB(): returns AABB(center - halfExtents, center + halfExtents)
 * - center is local-space offset (world position comes from Node3D.position + center)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/physics/box-collider';
import { SphereCollider } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';
import { AABB } from '../../../src/math/aabb';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { BoxCollider } = mod;

/* ═══════════════════════════════════════════
   Construction
   ═══════════════════════════════════════════ */

describeImpl('BoxCollider — construction', () => {
  it('should create with default halfExtents=(0.5,0.5,0.5) and center=(0,0,0)', () => {
    const b = new BoxCollider();
    expect(b.halfExtents[0]).toBeCloseTo(0.5);
    expect(b.halfExtents[1]).toBeCloseTo(0.5);
    expect(b.halfExtents[2]).toBeCloseTo(0.5);
    expect(b.center[0]).toBeCloseTo(0);
    expect(b.center[1]).toBeCloseTo(0);
    expect(b.center[2]).toBeCloseTo(0);
  });

  it('should accept custom halfExtents and center', () => {
    const b = new BoxCollider(vec3(2, 3, 4), vec3(1, 0, -1));
    expect(b.halfExtents[0]).toBeCloseTo(2);
    expect(b.halfExtents[1]).toBeCloseTo(3);
    expect(b.halfExtents[2]).toBeCloseTo(4);
    expect(b.center[0]).toBeCloseTo(1);
    expect(b.center[1]).toBeCloseTo(0);
    expect(b.center[2]).toBeCloseTo(-1);
  });

  it('should clone independently', () => {
    const a = new BoxCollider(vec3(1, 2, 3), vec3(4, 5, 6));
    const b = a.clone();
    b.halfExtents[0] = 99;
    b.center[0] = 99;
    expect(a.halfExtents[0]).toBeCloseTo(1);
    expect(a.center[0]).toBeCloseTo(4);
  });
});

/* ═══════════════════════════════════════════
   Box-Box intersection
   ═══════════════════════════════════════════ */

describeImpl('BoxCollider — box-box intersection', () => {
  it('should detect overlapping boxes', () => {
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(1.5, 0, 0));
    expect(a.intersectsBox(b)).toBe(true);
  });

  it('should detect non-overlapping boxes', () => {
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(5, 0, 0));
    expect(a.intersectsBox(b)).toBe(false);
  });

  it('should detect touching boxes (edge case)', () => {
    // Box A: center(0,0,0) half(1,1,1) → [-1,1] on each axis
    // Box B: center(2,0,0) half(1,1,1) → [1,3] on X → exactly touching at X=1
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(2, 0, 0));
    expect(a.intersectsBox(b)).toBe(true); // touching counts as intersection
  });

  it('should detect contained box', () => {
    const outer = new BoxCollider(vec3(5, 5, 5), vec3(0, 0, 0));
    const inner = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    expect(outer.intersectsBox(inner)).toBe(true);
  });

  it('should detect separation on single axis', () => {
    // Overlap on X and Z, but separated on Y
    const a = new BoxCollider(vec3(2, 1, 2), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(2, 1, 2), vec3(1, 5, 1));
    expect(a.intersectsBox(b)).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   Box-Sphere intersection
   ═══════════════════════════════════════════ */

describeImpl('BoxCollider — box-sphere intersection', () => {
  it('should detect sphere inside box', () => {
    const box = new BoxCollider(vec3(5, 5, 5), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(0, 0, 0));
    expect(box.intersectsSphere(sphere)).toBe(true);
  });

  it('should detect sphere partially overlapping box face', () => {
    // Box: center(0,0,0) half(1,1,1) → [-1,1]
    // Sphere: center(1.5,0,0) r=1 → extends from 0.5 to 2.5 on X
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(1.5, 0, 0));
    expect(box.intersectsSphere(sphere)).toBe(true);
  });

  it('should detect no overlap between box and distant sphere', () => {
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(10, 0, 0));
    expect(box.intersectsSphere(sphere)).toBe(false);
  });

  it('should detect sphere near box corner', () => {
    // Box: [-1,1]^3, sphere at (2,2,2) r=1
    // Closest point on box to sphere center: (1,1,1)
    // Distance: sqrt(1+1+1) = sqrt(3) ≈ 1.732 > 1 → no overlap
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(2, 2, 2));
    expect(box.intersectsSphere(sphere)).toBe(false);
  });

  it('should detect sphere touching box corner', () => {
    // Box: [-1,1]^3, sphere at (2,0,0) r=1
    // Closest point on box: (1,0,0), distance = 1 = radius → touching
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(2, 0, 0));
    expect(box.intersectsSphere(sphere)).toBe(true);
  });
});

/* ═══════════════════════════════════════════
   Overlap depth
   ═══════════════════════════════════════════ */

describeImpl('BoxCollider — overlap depth', () => {
  it('should return positive overlap for intersecting boxes', () => {
    // A: center(0,0,0) half(1,1,1) → [-1,1]
    // B: center(1.5,0,0) half(1,1,1) → [0.5,2.5]
    // Overlap on X: min(1,2.5) - max(-1,0.5) = 1 - 0.5 = 0.5
    // Overlap on Y: min(1,1) - max(-1,-1) = 1 - (-1) = 2
    // Overlap on Z: same as Y = 2
    // Min penetration = 0.5
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(1.5, 0, 0));
    expect(a.overlapBox(b)).toBeCloseTo(0.5);
  });

  it('should return zero for exactly touching boxes', () => {
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(2, 0, 0));
    expect(a.overlapBox(b)).toBeCloseTo(0);
  });

  it('should return negative for separated boxes', () => {
    const a = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const b = new BoxCollider(vec3(1, 1, 1), vec3(5, 0, 0));
    // Gap on X: max(-1,4) - min(1,6) = 4 - 1 = 3, so overlap = -3
    expect(a.overlapBox(b)).toBeCloseTo(-3);
  });

  it('should return positive overlap for box-sphere intersection', () => {
    // Box: [-1,1], sphere center(1.5,0,0) r=1
    // Closest point on box to sphere: (1,0,0)
    // Distance = 0.5, overlap = r - dist = 1 - 0.5 = 0.5
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(1.5, 0, 0));
    expect(box.overlapSphere(sphere)).toBeCloseTo(0.5);
  });

  it('should return negative overlap for separated box-sphere', () => {
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    const sphere = new SphereCollider(1, vec3(5, 0, 0));
    // Closest point on box: (1,0,0), distance = 4, overlap = 1 - 4 = -3
    expect(box.overlapSphere(sphere)).toBeCloseTo(-3);
  });
});

/* ═══════════════════════════════════════════
   containsPoint & toAABB
   ═══════════════════════════════════════════ */

describeImpl('BoxCollider — containsPoint', () => {
  it('should contain a point inside the box', () => {
    const box = new BoxCollider(vec3(2, 2, 2), vec3(0, 0, 0));
    expect(box.containsPoint(vec3(1, 1, 1))).toBe(true);
  });

  it('should contain a point on the boundary', () => {
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    expect(box.containsPoint(vec3(1, 0, 0))).toBe(true);
  });

  it('should not contain a point outside the box', () => {
    const box = new BoxCollider(vec3(1, 1, 1), vec3(0, 0, 0));
    expect(box.containsPoint(vec3(2, 0, 0))).toBe(false);
  });
});

describeImpl('BoxCollider — toAABB', () => {
  it('should convert to AABB correctly', () => {
    const box = new BoxCollider(vec3(2, 3, 4), vec3(1, 0, -1));
    const aabb = box.toAABB();
    expect(aabb.min[0]).toBeCloseTo(-1);  // 1 - 2
    expect(aabb.min[1]).toBeCloseTo(-3);  // 0 - 3
    expect(aabb.min[2]).toBeCloseTo(-5);  // -1 - 4
    expect(aabb.max[0]).toBeCloseTo(3);   // 1 + 2
    expect(aabb.max[1]).toBeCloseTo(3);   // 0 + 3
    expect(aabb.max[2]).toBeCloseTo(3);   // -1 + 4
  });
});
