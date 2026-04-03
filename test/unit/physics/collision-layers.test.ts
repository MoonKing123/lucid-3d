/**
 * Pre-written tests for Collision Layers & Trigger Mode.
 * AI must extend src/physics/collision.ts (CollisionWorld) to make these pass.
 *
 * New API additions to CollisionWorld:
 *   addBody(node: Node3D, options: BodyOptions): void;
 *
 *   interface BodyOptions {
 *     shape: SphereCollider | BoxCollider;
 *     layer?: number;       // bitmask: which layer(s) this body occupies (default: 1)
 *     mask?: number;        // bitmask: which layers this body detects (default: 0xFFFFFFFF)
 *     isTrigger?: boolean;  // trigger mode: events fire but separation = vec3(0,0,0) (default: false)
 *   }
 *
 * Implementation notes:
 * - Two bodies A and B can collide only if: (A.layer & B.mask) !== 0 AND (B.layer & A.mask) !== 0
 * - Trigger colliders fire enter/stay/exit events but always report separation = vec3(0,0,0)
 * - addBody() is the new recommended API; addCollider() remains for backward compat (layer=1, mask=all, isTrigger=false)
 * - step() must check layer/mask before intersection test for performance
 * - query() gains optional layerMask parameter: query(center, radius, layerMask?)
 *
 * Layer convention examples:
 *   LAYER_DEFAULT   = 1      (0b0001)
 *   LAYER_PLAYER    = 2      (0b0010)
 *   LAYER_ENEMY     = 4      (0b0100)
 *   LAYER_TRIGGER   = 8      (0b1000)
 */
import { describe, it, expect, vi } from 'vitest';
import { CollisionWorld, SphereCollider } from '../../../src/physics/collision';
import { vec3, length } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';

// Skip all tests if addBody() is not yet implemented
const hasAddBody = typeof CollisionWorld.prototype.addBody === 'function';
const describeImpl = hasAddBody ? describe : describe.skip;

/* ═══════════════════════════════════════════
   addBody() with layers
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld — addBody & layer filtering', () => {
  it('should detect collision when layers match', () => {
    const world = new CollisionWorld();
    const a = new Node3D('player');
    const b = new Node3D('enemy');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    world.addBody(a, { shape: new SphereCollider(1), layer: 2, mask: 0xFFFFFFFF });
    world.addBody(b, { shape: new SphereCollider(1), layer: 4, mask: 0xFFFFFFFF });

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
  });

  it('should NOT detect collision when layers do not match mask', () => {
    const world = new CollisionWorld();
    const a = new Node3D('player');
    const b = new Node3D('ghost');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    // Player on layer 2, only detects layer 4 (enemies)
    // Ghost on layer 8, only detects layer 2 (players) — but player doesn't detect layer 8
    world.addBody(a, { shape: new SphereCollider(1), layer: 2, mask: 4 });
    world.addBody(b, { shape: new SphereCollider(1), layer: 8, mask: 2 });

    const enterA = vi.fn();
    const enterB = vi.fn();
    world.onCollisionEnter(a, enterA);
    world.onCollisionEnter(b, enterB);
    world.step();
    // Requires BOTH directions: (A.layer & B.mask) AND (B.layer & A.mask)
    // A.layer(2) & B.mask(2) = 2 ≠ 0 → B detects A ✓
    // B.layer(8) & A.mask(4) = 0 → A does NOT detect B ✗
    // Since bidirectional check fails, no collision
    expect(enterA).not.toHaveBeenCalled();
    expect(enterB).not.toHaveBeenCalled();
  });

  it('should detect collision only when BOTH layer/mask checks pass', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    // A on layer 2, detects layers 4|8
    // B on layer 4, detects layers 2|8
    world.addBody(a, { shape: new SphereCollider(1), layer: 2, mask: 4 | 8 });
    world.addBody(b, { shape: new SphereCollider(1), layer: 4, mask: 2 | 8 });

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    // A.layer(2) & B.mask(2|8) = 2 ≠ 0 ✓
    // B.layer(4) & A.mask(4|8) = 4 ≠ 0 ✓
    expect(enterCb).toHaveBeenCalledTimes(1);
  });

  it('should default to layer=1, mask=all when using addBody without layer/mask', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    world.addBody(a, { shape: new SphereCollider(1) });
    world.addBody(b, { shape: new SphereCollider(1) });

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
  });

  it('should be backward compatible with addCollider (layer=1, mask=all)', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    // Mix old API and new API
    world.addCollider(a, new SphereCollider(1));
    world.addBody(b, { shape: new SphereCollider(1), layer: 1 });

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();
    expect(enterCb).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════
   Trigger mode
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld — trigger mode', () => {
  it('should fire enter/stay/exit events for trigger colliders', () => {
    const world = new CollisionWorld();
    const player = new Node3D('player');
    const zone = new Node3D('zone');
    player.position = vec3(0, 0, 0);
    zone.position = vec3(1, 0, 0);

    world.addBody(player, { shape: new SphereCollider(1) });
    world.addBody(zone, { shape: new SphereCollider(2), isTrigger: true });

    const enterCb = vi.fn();
    const stayCb = vi.fn();
    const exitCb = vi.fn();
    world.onCollisionEnter(player, enterCb);
    world.onCollisionStay(player, stayCb);
    world.onCollisionExit(player, exitCb);

    world.step(); // enter
    expect(enterCb).toHaveBeenCalledTimes(1);

    world.step(); // stay
    expect(stayCb).toHaveBeenCalledTimes(1);

    player.position = vec3(100, 0, 0); // move away
    world.step(); // exit
    expect(exitCb).toHaveBeenCalledTimes(1);
  });

  it('should report zero separation vector for trigger colliders', () => {
    const world = new CollisionWorld();
    const player = new Node3D('player');
    const zone = new Node3D('zone');
    player.position = vec3(0, 0, 0);
    zone.position = vec3(1, 0, 0);

    world.addBody(player, { shape: new SphereCollider(1) });
    world.addBody(zone, { shape: new SphereCollider(2), isTrigger: true });

    const enterCb = vi.fn();
    world.onCollisionEnter(player, enterCb);
    world.step();

    const event = enterCb.mock.calls[0][0];
    // Trigger → separation is always zero
    expect(event.separation[0]).toBeCloseTo(0);
    expect(event.separation[1]).toBeCloseTo(0);
    expect(event.separation[2]).toBeCloseTo(0);
  });

  it('should still produce separation for non-trigger colliders', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1.5, 0, 0);

    world.addBody(a, { shape: new SphereCollider(1), isTrigger: false });
    world.addBody(b, { shape: new SphereCollider(1), isTrigger: false });

    const enterCb = vi.fn();
    world.onCollisionEnter(a, enterCb);
    world.step();

    const event = enterCb.mock.calls[0][0];
    const mag = length(event.separation);
    expect(mag).toBeCloseTo(0.5); // overlap = 2 - 1.5 = 0.5
  });
});

/* ═══════════════════════════════════════════
   query with layer mask
   ═══════════════════════════════════════════ */

describeImpl('CollisionWorld — query with layerMask', () => {
  it('should filter query results by layerMask', () => {
    const world = new CollisionWorld();
    const player = new Node3D('player');
    const enemy = new Node3D('enemy');
    const pickup = new Node3D('pickup');
    player.position = vec3(0, 0, 0);
    enemy.position = vec3(1, 0, 0);
    pickup.position = vec3(0.5, 0, 0);

    world.addBody(player, { shape: new SphereCollider(1), layer: 2 });
    world.addBody(enemy, { shape: new SphereCollider(1), layer: 4 });
    world.addBody(pickup, { shape: new SphereCollider(0.5), layer: 8 });

    // Query only enemies (layer 4)
    const enemies = world.query(vec3(0, 0, 0), 5, 4);
    expect(enemies).toContain(enemy);
    expect(enemies).not.toContain(player);
    expect(enemies).not.toContain(pickup);
  });

  it('should return all when layerMask is omitted', () => {
    const world = new CollisionWorld();
    const a = new Node3D('a');
    const b = new Node3D('b');
    a.position = vec3(0, 0, 0);
    b.position = vec3(1, 0, 0);

    world.addBody(a, { shape: new SphereCollider(1), layer: 2 });
    world.addBody(b, { shape: new SphereCollider(1), layer: 4 });

    const results = world.query(vec3(0, 0, 0), 5);
    expect(results).toHaveLength(2);
  });

  it('should support multi-layer mask query', () => {
    const world = new CollisionWorld();
    const player = new Node3D('player');
    const enemy = new Node3D('enemy');
    const pickup = new Node3D('pickup');
    player.position = vec3(0, 0, 0);
    enemy.position = vec3(1, 0, 0);
    pickup.position = vec3(0.5, 0, 0);

    world.addBody(player, { shape: new SphereCollider(1), layer: 2 });
    world.addBody(enemy, { shape: new SphereCollider(1), layer: 4 });
    world.addBody(pickup, { shape: new SphereCollider(0.5), layer: 8 });

    // Query enemies and pickups (layer 4 | 8 = 12)
    const results = world.query(vec3(0, 0, 0), 5, 4 | 8);
    expect(results).toContain(enemy);
    expect(results).toContain(pickup);
    expect(results).not.toContain(player);
  });
});
