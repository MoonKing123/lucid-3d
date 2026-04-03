/**
 * CharacterController — pre-written tests (Architect)
 * Validates: gravity, ground detection, jump, move, teleport
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/character-controller';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';
import { CollisionWorld, SphereCollider } from '../../../src/physics/collision';
import { BoxCollider } from '../../../src/physics/box-collider';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CharacterController', () => {
  /* ---------- construction ---------- */

  it('should create a controller attached to a node', () => {
    const node = new Node3D('player');
    const ctrl = new mod.CharacterController(node);
    expect(ctrl).toBeDefined();
    expect(ctrl.isGrounded).toBe(false);
  });

  it('should have zero velocity initially', () => {
    const node = new Node3D('player');
    const ctrl = new mod.CharacterController(node);
    const v = ctrl.velocity;
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  /* ---------- gravity ---------- */

  it('should apply gravity when not grounded', () => {
    const node = new Node3D('player');
    node.position = vec3(0, 10, 0);
    const ctrl = new mod.CharacterController(node, { gravity: -10 });
    ctrl.update(0.1); // dt = 0.1s
    // y should decrease due to gravity: v += g*dt, pos += v*dt
    expect(node.position.y).toBeLessThan(10);
  });

  it('should accelerate downward over multiple frames', () => {
    const node = new Node3D('player');
    node.position = vec3(0, 100, 0);
    const ctrl = new mod.CharacterController(node, { gravity: -10 });
    ctrl.update(0.1);
    const y1 = node.position.y;
    ctrl.update(0.1);
    const y2 = node.position.y;
    // second frame should fall further (acceleration)
    expect(y1 - y2).toBeGreaterThan(100 - y1);
  });

  /* ---------- ground detection via raycast ---------- */

  it('should detect ground via CollisionWorld raycast', () => {
    const world = new CollisionWorld();
    // Create a ground box at y=0
    const groundNode = new Node3D('ground');
    groundNode.position = vec3(0, 0, 0);
    const groundCollider = new BoxCollider(vec3(0, 0, 0), vec3(50, 0.5, 50));
    world.addBody(groundNode, groundCollider);

    const player = new Node3D('player');
    player.position = vec3(0, 0.6, 0); // just above ground
    const ctrl = new mod.CharacterController(player, {
      gravity: -10,
      collisionWorld: world,
      groundCheckDistance: 0.2,
    });

    ctrl.update(0.016);
    expect(ctrl.isGrounded).toBe(true);
  });

  it('should not be grounded when far above ground', () => {
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    groundNode.position = vec3(0, 0, 0);
    world.addBody(groundNode, new BoxCollider(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 50, 0);
    const ctrl = new mod.CharacterController(player, {
      gravity: -10,
      collisionWorld: world,
      groundCheckDistance: 0.2,
    });

    ctrl.update(0.016);
    expect(ctrl.isGrounded).toBe(false);
  });

  it('should stop falling when grounded', () => {
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    groundNode.position = vec3(0, 0, 0);
    world.addBody(groundNode, new BoxCollider(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 0.6, 0);
    const ctrl = new mod.CharacterController(player, {
      gravity: -10,
      collisionWorld: world,
      groundCheckDistance: 0.2,
    });

    // Multiple updates should not push player below ground
    for (let i = 0; i < 10; i++) ctrl.update(0.016);
    expect(player.position.y).toBeGreaterThanOrEqual(0);
    expect(ctrl.velocity.y).toBeGreaterThanOrEqual(0);
  });

  /* ---------- jump ---------- */

  it('should jump when grounded', () => {
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    world.addBody(groundNode, new BoxCollider(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 0.6, 0);
    const ctrl = new mod.CharacterController(player, {
      gravity: -10,
      jumpSpeed: 5,
      collisionWorld: world,
      groundCheckDistance: 0.2,
    });

    // Ground the character first
    ctrl.update(0.016);
    expect(ctrl.isGrounded).toBe(true);

    const yBefore = player.position.y;
    ctrl.jump();
    ctrl.update(0.016);
    expect(player.position.y).toBeGreaterThan(yBefore);
  });

  it('should not jump when airborne', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 50, 0);
    const ctrl = new mod.CharacterController(player, { gravity: -10, jumpSpeed: 5 });
    ctrl.update(0.016);
    expect(ctrl.isGrounded).toBe(false);
    const velBefore = ctrl.velocity.y;
    ctrl.jump(); // should be ignored
    expect(ctrl.velocity.y).toBe(velBefore);
  });

  /* ---------- move ---------- */

  it('should move horizontally in given direction', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 0, 0);
    const ctrl = new mod.CharacterController(player, { moveSpeed: 10 });
    ctrl.move(vec3(1, 0, 0)); // move right
    ctrl.update(0.1);
    expect(player.position.x).toBeGreaterThan(0);
  });

  it('should normalize move direction', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 0, 0);
    const ctrl = new mod.CharacterController(player, { moveSpeed: 10 });
    ctrl.move(vec3(3, 0, 4)); // magnitude 5, should normalize
    ctrl.update(0.1);
    // distance should be moveSpeed * dt = 10 * 0.1 = 1.0
    const dist = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
    expect(dist).toBeCloseTo(1.0, 1);
  });

  it('should only affect X/Z from move, not Y', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 5, 0);
    // No gravity, no collision world
    const ctrl = new mod.CharacterController(player, { gravity: 0, moveSpeed: 10 });
    ctrl.move(vec3(0, 100, 1)); // Y component should be ignored
    ctrl.update(0.1);
    // Y should stay at 5 (gravity is 0, move Y ignored)
    expect(player.position.y).toBe(5);
    expect(player.position.z).toBeGreaterThan(0);
  });

  /* ---------- teleport ---------- */

  it('should teleport to given position and reset velocity', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 50, 0);
    const ctrl = new mod.CharacterController(player, { gravity: -10 });
    ctrl.update(0.1); // build up some velocity
    ctrl.teleport(vec3(10, 0, 10));
    expect(player.position.x).toBe(10);
    expect(player.position.y).toBe(0);
    expect(player.position.z).toBe(10);
    expect(ctrl.velocity.y).toBe(0);
  });

  /* ---------- edge cases ---------- */

  it('should work without collision world (no ground detection)', () => {
    const player = new Node3D('player');
    player.position = vec3(0, 10, 0);
    const ctrl = new mod.CharacterController(player, { gravity: -10 });
    // Should just apply gravity without crashing
    ctrl.update(0.1);
    expect(player.position.y).toBeLessThan(10);
    expect(ctrl.isGrounded).toBe(false);
  });
});
