/**
 * Pre-written tests for Collision detection system.
 * AI must implement src/physics/collision.ts to make these pass.
 *
 * API:
 *   class SphereCollider {
 *     center: Vec3;   // local-space center offset
 *     radius: number;
 *
 *     constructor(radius?: number, center?: Vec3);
 *     intersectsSphere(other: SphereCollider): boolean;
 *     intersectsAABB(aabb: AABB): boolean;
 *     overlapSphere(other: SphereCollider): number;
 *     clone(): SphereCollider;
 *   }
 *
 *   class CollisionWorld {
 *     addCollider(node: Node3D, collider: SphereCollider): void;
 *     removeCollider(node: Node3D): void;
 *     getCollider(node: Node3D): SphereCollider | undefined;
 *     onCollisionEnter(node: Node3D, cb: CollisionCallback): void;
 *     onCollisionStay(node: Node3D, cb: CollisionCallback): void;
 *     onCollisionExit(node: Node3D, cb: CollisionCallback): void;
 *     step(): void;
 *     query(center: Vec3, radius: number): Node3D[];
 *     get size(): number;
 *   }
 *
 * Implementation notes:
 * - SphereCollider uses local-space center; CollisionWorld uses Node3D.position + center for world pos
 * - step() does O(n²) pair checking (sufficient for game-scale collider counts)
 * - Events: enter fires on first overlap frame, stay fires on subsequent frames, exit fires when separated
 * - separation vector in CollisionEvent points from self to other
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/physics/collision';
import { vec3, sub, length } from '../../../src/math/vec3';
import { AABB } from '../../../src/math/aabb';
import { Node3D } from '../../../src/core/node3d';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { SphereCollider, CollisionWorld } = mod;

/* ═══════════════════════════════════════════
   SphereCollider
   ═══════════════════════════════════════════ */

describeImpl('SphereCollider — construction', () => {
  it('should create with default radius=1 and center=(0,0,0)', () => {
    const c = new SphereCollider();
    expect(c.radius).toBe(1);
    expect(c.center[0]).toBeCloseTo(0);
    expect(c.center[1]).toBeCloseTo(0);
    expect(c.center[2]).toBeCloseTo(0);
  });

  it('should accept custom radius and center', () => {
    const c = new SphereCollider(5, vec3(1, 2, 3));
    expect(c.radius).toBe(5);
    expect(c.center[0]).toBeCloseTo(1);
    expect(c.center[1]).toBeCloseTo(2);
    expect(c.center[2]).toBeCloseTo(3);
  });

  it('should clone independently', () => {
    const a = new SphereCollider(3, vec3(1, 0, 0));
    const b = a.clone();
    b.radius = 10;
    expect(a.radius).toBe(3);
    expect(b.radius).toBe(10);
  });
});

describeImpl('SphereCollider — sphere-sphere intersection', () => {
  it('should detect overlapping spheres', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(1.5, 0, 0));
    expect(a.intersectsSphere(b)).toBe(true);
  });

  it('should detect non-overlapping spheres', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(3, 0, 0));
    expect(a.intersectsSphere(b)).toBe(false);
  });

  it('should detect touching spheres (edge case)', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(2, 0, 0));
    // Exactly touching = intersecting (<=)
    expect(a.intersectsSphere(b)).toBe(true);
  });

  it('should detect concentric spheres', () => {
    const a = new SphereCollider(2, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(0, 0, 0));
    expect(a.intersectsSphere(b)).toBe(true);
  });
});

describeImpl('SphereCollider — sphere-AABB intersection', () => {
  it('should detect sphere inside AABB', () => {
    const s = new SphereCollider(0.5, vec3(0, 0, 0));
    const box = new AABB(vec3(-2, -2, -2), vec3(2, 2, 2));
    expect(s.intersectsAABB(box)).toBe(true);
  });

  it('should detect sphere partially overlapping AABB', () => {
    const s = new SphereCollider(1, vec3(2.5, 0, 0));
    const box = new AABB(vec3(0, 0, 0), vec3(3, 3, 3));
    expect(s.intersectsAABB(box)).toBe(true);
  });

  it('should detect no overlap when sphere is far from AABB', () => {
    const s = new SphereCollider(1, vec3(10, 0, 0));
    const box = new AABB(vec3(0, 0, 0), vec3(2, 2, 2));
    expect(s.intersectsAABB(box)).toBe(false);
  });

  it('should handle sphere touching AABB corner', () => {
    // Sphere at (3,3,3) r=1, AABB (0,0,0)-(2,2,2)
    // Distance from sphere center to nearest AABB point (2,2,2) = sqrt(3) ≈ 1.732
    const s = new SphereCollider(1, vec3(3, 3, 3));
    const box = new AABB(vec3(0, 0, 0), vec3(2, 2, 2));
    expect(s.intersectsAABB(box)).toBe(false); // sqrt(3) > 1
  });
});

describeImpl('SphereCollider — overlap depth', () => {
  it('should return positive overlap for intersecting spheres', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(1.5, 0, 0));
    // overlap = (1+1) - 1.5 = 0.5
    expect(a.overlapSphere(b)).toBeCloseTo(0.5);
  });

  it('should return zero for exactly touching spheres', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(2, 0, 0));
    expect(a.overlapSphere(b)).toBeCloseTo(0);
  });

  it('should return negative for separated spheres', () => {
    const a = new SphereCollider(1, vec3(0, 0, 0));
    const b = new SphereCollider(1, vec3(5, 0, 0));
    // overlap = (1+1) - 5 = -3
    expect(a.overlapSphere(b)).toBeCloseTo(-3);
  });
});

/* ═══════════════════════════════════════════
   CollisionWorld
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld — registration', () => {
  it('should add and retrieve colliders', () => {
    const world = new CollisionWorld();
    const node = new Node3D('obj');
    const col = new SphereCollider(1);
    world.addCollider(node, col);
    expect(world.getCollider(node)).toBe(col);
    expect(world.size).toBe(1);
  });

  it('should remove colliders', () => {
    const world = new CollisionWorld();
    const node = new Node3D('obj');
    world.addCollider(node, new SphereCollider(1));
    world.removeCollider(node);
    expect(world.getCollider(node)).toBeUndefined();
    expect(world.size).toBe(0);
  });

  it('should replace collider on same node', () => {
    const world = new CollisionWorld();
    const node = new Node3D('obj');
    const c1 = new SphereCollider(1);
    const c2 = new SphereCollider(2);
    world.addCollider(node, c1);
    world.addCollider(node, c2);
    expect(world.getCollider(node)).toBe(c2);
    expect(world.size).toBe(1);
  });
});

describeImpl('CollisionWorld — collision events', () => {
  it('should fire onCollisionEnter when spheres first overlap', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);

    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
    expect(enterCb.mock.calls[0][0].otherNode).toBe(b);
  });

  it('should fire onCollisionStay on subsequent overlap frames', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    const stayCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.onCollisionStay(a, stayCb);

    world.step(); // enter
    world.step(); // stay

    expect(enterCb).toHaveBeenCalledTimes(1);
    expect(stayCb).toHaveBeenCalledTimes(1);
  });

  it('should fire onCollisionExit when spheres separate', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const exitCb = vi.fn();
    world.onCollisionExit(a, exitCb);

    world.step(); // enter
    b.position = vec3(10, 0, 0); // move away
    world.step(); // exit

    expect(exitCb).toHaveBeenCalledTimes(1);
    expect(exitCb.mock.calls[0][0].otherNode).toBe(b);
  });

  it('should fire events symmetrically for both nodes', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterA = vi.fn();
    const enterB = vi.fn();
    world.onCollisionEnter(a, enterA);
    world.onCollisionEnter(b, enterB);

    world.step();
    expect(enterA).toHaveBeenCalledTimes(1);
    expect(enterB).toHaveBeenCalledTimes(1);
    expect(enterA.mock.calls[0][0].otherNode).toBe(b);
    expect(enterB.mock.calls[0][0].otherNode).toBe(a);
  });

  it('should include separation vector in collision event', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1.5, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);

    world.step();
    const event = enterCb.mock.calls[0][0];
    // separation vector points from a to b: normalized (1,0,0) * overlap 0.5
    expect(event.separation[0]).toBeGreaterThan(0);
    expect(Math.abs(event.separation[1])).toBeLessThan(0.001);
    expect(Math.abs(event.separation[2])).toBeLessThan(0.001);
    // separation magnitude = overlap depth = 0.5
    const mag = length(event.separation);
    expect(mag).toBeCloseTo(0.5);
  });

  it('should not fire events for non-overlapping colliders', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(10, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);

    world.step();
    expect(enterCb).not.toHaveBeenCalled();
  });
});

describeImpl('CollisionWorld — world-space using Node3D.position + collider center offset', () => {
  it('should account for collider center offset', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    // a at origin with offset (5,0,0), b at (6,0,0) with no offset
    // world centers: a=(5,0,0), b=(6,0,0), dist=1, r+r=2 → overlap
    a.position = vec3(0, 0, 0);
    b.position = vec3(6, 0, 0);
    world.addCollider(a, new SphereCollider(1, vec3(5, 0, 0)));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
  });

  it('should use node position for world-space calculation', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(3, 0, 0);
    b.position = vec3(4, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
  });
});

describeImpl('CollisionWorld — query', () => {
  it('should return nodes overlapping a query sphere', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    const c = new Node3D('c');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    c.position = vec3(100, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));
    world.addCollider(c, new SphereCollider(1));

    const results = world.query(vec3(0, 0, 0), 2);
    expect(results).toContain(a);
    expect(results).toContain(b);
    expect(results).not.toContain(c);
  });

  it('should return empty array when nothing overlaps', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    a.position = vec3(100, 0, 0);
    world.addCollider(a, new SphereCollider(1));

    const results = world.query(vec3(0, 0, 0), 1);
    expect(results).toHaveLength(0);
  });
});

describeImpl('CollisionWorld — edge cases', () => {
  it('should handle removing a collider mid-simulation', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);
    world.addCollider(a, new SphereCollider(1));
    world.addCollider(b, new SphereCollider(1));

    world.step(); // enter
    world.removeCollider(b);
    // Should not throw
    expect(() => world.step()).not.toThrow();
  });

  it('should handle single collider (no pairs)', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    world.addCollider(a, new SphereCollider(1));
    expect(() => world.step()).not.toThrow();
  });

  it('should handle zero colliders', () => {
    const world = new CollisionWorld();
    expect(() => world.step()).not.toThrow();
  });
});
