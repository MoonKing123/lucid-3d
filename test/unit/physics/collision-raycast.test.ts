/**
 * Pre-written tests for CollisionWorld.raycast().
 * AI must extend src/physics/collision.ts to make these pass.
 *
 * New API addition to CollisionWorld:
 *   interface CollisionRaycastHit {
 *     node: Node3D;
 *     distance: number;
 *     point: Vec3;
 *   }
 *
 *   raycast(
 *     origin: Vec3,
 *     direction: Vec3,
 *     maxDistance?: number,       // default: Infinity
 *     layerMask?: number,        // default: 0xFFFFFFFF (all layers)
 *   ): CollisionRaycastHit[];
 *
 * Implementation notes:
 * - Casts a ray against all registered colliders (sphere and box)
 * - For SphereCollider: analytic ray-sphere intersection
 *   (world center = node.position + collider.center, use quadratic formula)
 * - For BoxCollider: slab method ray-AABB intersection
 *   (world AABB = BoxCollider.toAABB() translated by node.position)
 * - Returns hits sorted by distance (nearest first)
 * - Respects layerMask filter: only test colliders whose layer & layerMask !== 0
 * - maxDistance caps the ray length
 * - direction should be normalized by the caller; implementation should work with non-unit directions too
 *   but reported distance is in units of the direction vector
 *
 * Depends on:
 * - CollisionWorld.addBody() with layer support (KR 2)
 * - BoxCollider (KR 1) for box raycast tests
 */
import { describe, it, expect } from 'vitest';
import { CollisionWorld, SphereCollider } from '../../../src/physics/collision';
import * as boxMod from '../../../src/physics/box-collider';
import { vec3, length, sub } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';

// Skip all tests if raycast() or addBody() are not yet implemented
const hasRaycast = typeof CollisionWorld.prototype.raycast === 'function';
const hasAddBody = typeof CollisionWorld.prototype.addBody === 'function';
const describeImpl = (hasRaycast && hasAddBody) ? describe : describe.skip;

// BoxCollider tests also need box-collider to not be a stub
const isBoxStub = '__STUB__' in boxMod && (boxMod as any).__STUB__ === true;
const describeBox = (describeImpl !== describe.skip && !isBoxStub) ? describe : describe.skip;
const { BoxCollider } = boxMod as any;

/* ═══════════════════════════════════════════
   Sphere raycast
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld.raycast — sphere colliders', () => {
  it('should hit a sphere directly ahead', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('target');
    obj.position = vec3(0, 0, -5);
    world.addBody(obj, { shape: new SphereCollider(1) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].node).toBe(obj);
    expect(hits[0].distance).toBeCloseTo(4); // 5 - radius 1
    expect(hits[0].point[2]).toBeCloseTo(-4);
  });

  it('should miss a sphere off to the side', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('target');
    obj.position = vec3(10, 0, -5);
    world.addBody(obj, { shape: new SphereCollider(1) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits).toHaveLength(0);
  });

  it('should return hits sorted by distance (nearest first)', () => {
    const world = new CollisionWorld();
    const near = new Node3D('near');
    const far = new Node3D('far');
    near.position = vec3(0, 0, -3);
    far.position = vec3(0, 0, -10);
    world.addBody(near, { shape: new SphereCollider(1) });
    world.addBody(far, { shape: new SphereCollider(1) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBe(2);
    expect(hits[0].node).toBe(near);
    expect(hits[1].node).toBe(far);
    expect(hits[0].distance).toBeLessThan(hits[1].distance);
  });

  it('should respect maxDistance', () => {
    const world = new CollisionWorld();
    const near = new Node3D('near');
    const far = new Node3D('far');
    near.position = vec3(0, 0, -3);
    far.position = vec3(0, 0, -10);
    world.addBody(near, { shape: new SphereCollider(1) });
    world.addBody(far, { shape: new SphereCollider(1) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1), 5);
    expect(hits.length).toBe(1);
    expect(hits[0].node).toBe(near);
  });

  it('should respect layerMask filtering', () => {
    const world = new CollisionWorld();
    const player = new Node3D('player');
    const enemy = new Node3D('enemy');
    player.position = vec3(0, 0, -3);
    enemy.position = vec3(0, 0, -5);
    world.addBody(player, { shape: new SphereCollider(1), layer: 2 });
    world.addBody(enemy, { shape: new SphereCollider(1), layer: 4 });

    // Only raycast against enemies (layer 4)
    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1), Infinity, 4);
    expect(hits.length).toBe(1);
    expect(hits[0].node).toBe(enemy);
  });

  it('should account for collider center offset', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('target');
    obj.position = vec3(0, 0, 0);
    // Collider center offset puts sphere at (0,0,-5)
    world.addBody(obj, { shape: new SphereCollider(1, vec3(0, 0, -5)) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].node).toBe(obj);
    expect(hits[0].distance).toBeCloseTo(4);
  });

  it('should not hit spheres behind the ray origin', () => {
    const world = new CollisionWorld();
    const behind = new Node3D('behind');
    behind.position = vec3(0, 0, 5); // behind ray pointing -Z
    world.addBody(behind, { shape: new SphereCollider(1) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits).toHaveLength(0);
  });

  it('should hit sphere when ray origin is inside', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('target');
    obj.position = vec3(0, 0, 0);
    world.addBody(obj, { shape: new SphereCollider(5) }); // large sphere, origin inside

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].node).toBe(obj);
    expect(hits[0].distance).toBeCloseTo(5); // exit point
  });
});

/* ═══════════════════════════════════════════
   Box raycast (depends on KR 1)
   ═══════════════════════════════════════════ */

describeBox('CollisionWorld.raycast — box colliders', () => {
  it('should hit a box directly ahead', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('wall');
    obj.position = vec3(0, 0, -5);
    world.addBody(obj, { shape: new BoxCollider(vec3(2, 2, 0.5)) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].node).toBe(obj);
    // Box: center(0,0,-5) half(2,2,0.5) → Z range [-5.5, -4.5]
    expect(hits[0].distance).toBeCloseTo(4.5);
  });

  it('should miss a box off to the side', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('wall');
    obj.position = vec3(10, 0, -5);
    world.addBody(obj, { shape: new BoxCollider(vec3(1, 1, 1)) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits).toHaveLength(0);
  });

  it('should sort mixed sphere and box hits by distance', () => {
    const world = new CollisionWorld();
    const sphere = new Node3D('sphere');
    const box = new Node3D('box');
    sphere.position = vec3(0, 0, -3);
    box.position = vec3(0, 0, -8);

    world.addBody(sphere, { shape: new SphereCollider(1) });
    world.addBody(box, { shape: new BoxCollider(vec3(1, 1, 1)) });

    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits.length).toBe(2);
    expect(hits[0].node).toBe(sphere);
    expect(hits[1].node).toBe(box);
  });
});

/* ═══════════════════════════════════════════
   Edge cases
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld.raycast — edge cases', () => {
  it('should return empty array when no colliders exist', () => {
    const world = new CollisionWorld();
    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits).toHaveLength(0);
  });

  it('should return empty array when all colliders are filtered out', () => {
    const world = new CollisionWorld();
    const obj = new Node3D('obj');
    obj.position = vec3(0, 0, -5);
    world.addBody(obj, { shape: new SphereCollider(1), layer: 2 });

    // Raycast only layer 4 — should miss layer 2
    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1), Infinity, 4);
    expect(hits).toHaveLength(0);
  });
});
