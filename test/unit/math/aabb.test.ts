/**
 * Pre-written tests for AABB (Axis-Aligned Bounding Box).
 * AI must create src/math/aabb.ts to make these pass.
 *
 * API:
 *   class AABB {
 *     min: Vec3;  max: Vec3;
 *     constructor(min?: Vec3, max?: Vec3);
 *     static fromGeometry(geometry: Geometry): AABB;
 *     center(): Vec3;
 *     size(): Vec3;
 *     containsPoint(point: Vec3): boolean;
 *     intersectsAABB(other: AABB): boolean;
 *     expandByPoint(point: Vec3): void;
 *     union(other: AABB): AABB;
 *     clone(): AABB;
 *   }
 */
import { describe, it, expect } from 'vitest';
import { AABB } from '../../../src/math/aabb';
import { vec3 } from '../../../src/math/vec3';
import { Geometry, createCubeGeometry } from '../../../src/renderer/geometry';

/* ───────────── Construction ───────────── */

describe('AABB — construction', () => {
  it('should default to empty box (Inf / -Inf)', () => {
    const b = new AABB();
    expect(b.min[0]).toBe(Infinity);
    expect(b.max[0]).toBe(-Infinity);
  });

  it('should accept custom min/max', () => {
    const b = new AABB(vec3(-1, -2, -3), vec3(4, 5, 6));
    expect(b.min[0]).toBeCloseTo(-1);
    expect(b.max[2]).toBeCloseTo(6);
  });
});

/* ───────────── fromGeometry ───────────── */

describe('AABB.fromGeometry', () => {
  it('should compute bounds of unit cube', () => {
    const b = AABB.fromGeometry(createCubeGeometry());
    expect(b.min[0]).toBeCloseTo(-0.5);
    expect(b.max[0]).toBeCloseTo(0.5);
    expect(b.min[1]).toBeCloseTo(-0.5);
    expect(b.max[1]).toBeCloseTo(0.5);
  });

  it('should compute bounds of triangle', () => {
    const g = new Geometry({ positions: new Float32Array([0, 0, 0, 3, 0, 0, 0, 4, 0]) });
    const b = AABB.fromGeometry(g);
    expect(b.min[0]).toBeCloseTo(0);
    expect(b.max[0]).toBeCloseTo(3);
    expect(b.max[1]).toBeCloseTo(4);
  });
});

/* ───────────── center / size ───────────── */

describe('AABB — center / size', () => {
  it('should compute center', () => {
    const c = new AABB(vec3(0, 0, 0), vec3(4, 6, 8)).center();
    expect(c[0]).toBeCloseTo(2);
    expect(c[1]).toBeCloseTo(3);
    expect(c[2]).toBeCloseTo(4);
  });

  it('should compute size', () => {
    const s = new AABB(vec3(-1, -2, -3), vec3(1, 2, 3)).size();
    expect(s[0]).toBeCloseTo(2);
    expect(s[1]).toBeCloseTo(4);
    expect(s[2]).toBeCloseTo(6);
  });

  it('should have zero size for point box', () => {
    const s = new AABB(vec3(5, 5, 5), vec3(5, 5, 5)).size();
    expect(s[0]).toBeCloseTo(0);
  });
});

/* ───────────── containsPoint ───────────── */

describe('AABB — containsPoint', () => {
  const b = new AABB(vec3(-1, -1, -1), vec3(1, 1, 1));

  it('should contain center', () => {
    expect(b.containsPoint(vec3(0, 0, 0))).toBe(true);
  });

  it('should contain boundary', () => {
    expect(b.containsPoint(vec3(1, 1, 1))).toBe(true);
  });

  it('should not contain outside point', () => {
    expect(b.containsPoint(vec3(2, 0, 0))).toBe(false);
  });
});

/* ───────────── intersectsAABB ───────────── */

describe('AABB — intersectsAABB', () => {
  it('should detect overlap', () => {
    const a = new AABB(vec3(-1, -1, -1), vec3(1, 1, 1));
    const b = new AABB(vec3(0, 0, 0), vec3(2, 2, 2));
    expect(a.intersectsAABB(b)).toBe(true);
  });

  it('should detect touch', () => {
    const a = new AABB(vec3(0, 0, 0), vec3(1, 1, 1));
    const b = new AABB(vec3(1, 0, 0), vec3(2, 1, 1));
    expect(a.intersectsAABB(b)).toBe(true);
  });

  it('should detect separation', () => {
    const a = new AABB(vec3(0, 0, 0), vec3(1, 1, 1));
    const b = new AABB(vec3(2, 2, 2), vec3(3, 3, 3));
    expect(a.intersectsAABB(b)).toBe(false);
  });

  it('should detect containment', () => {
    const outer = new AABB(vec3(-5, -5, -5), vec3(5, 5, 5));
    const inner = new AABB(vec3(-1, -1, -1), vec3(1, 1, 1));
    expect(outer.intersectsAABB(inner)).toBe(true);
  });

  it('should detect single-axis gap', () => {
    const a = new AABB(vec3(0, 0, 0), vec3(1, 1, 1));
    const b = new AABB(vec3(0, 2, 0), vec3(1, 3, 1));
    expect(a.intersectsAABB(b)).toBe(false);
  });
});

/* ───────────── expandByPoint ───────────── */

describe('AABB — expandByPoint', () => {
  it('should grow to include point', () => {
    const b = new AABB(vec3(0, 0, 0), vec3(1, 1, 1));
    b.expandByPoint(vec3(3, -1, 2));
    expect(b.max[0]).toBeCloseTo(3);
    expect(b.min[1]).toBeCloseTo(-1);
  });

  it('should not shrink for interior point', () => {
    const b = new AABB(vec3(-1, -1, -1), vec3(1, 1, 1));
    b.expandByPoint(vec3(0, 0, 0));
    expect(b.min[0]).toBeCloseTo(-1);
    expect(b.max[0]).toBeCloseTo(1);
  });

  it('should work on empty box', () => {
    const b = new AABB();
    b.expandByPoint(vec3(5, 3, 7));
    expect(b.min[0]).toBeCloseTo(5);
    expect(b.max[0]).toBeCloseTo(5);
  });
});

/* ───────────── union / clone ───────────── */

describe('AABB — union', () => {
  it('should enclose both boxes', () => {
    const u = new AABB(vec3(0, 0, 0), vec3(1, 1, 1)).union(new AABB(vec3(-2, -2, -2), vec3(-1, -1, -1)));
    expect(u.min[0]).toBeCloseTo(-2);
    expect(u.max[0]).toBeCloseTo(1);
  });

  it('should not mutate original', () => {
    const a = new AABB(vec3(0, 0, 0), vec3(1, 1, 1));
    a.union(new AABB(vec3(5, 5, 5), vec3(6, 6, 6)));
    expect(a.max[0]).toBeCloseTo(1);
  });
});

describe('AABB — clone', () => {
  it('should create independent copy', () => {
    const b = new AABB(vec3(1, 2, 3), vec3(4, 5, 6));
    const c = b.clone();
    c.expandByPoint(vec3(10, 10, 10));
    expect(b.max[0]).toBeCloseTo(4);
  });
});
