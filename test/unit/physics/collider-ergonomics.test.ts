import { describe, it, expect } from 'vitest';
import { SphereCollider, CollisionWorld } from '../../../src/physics/collision';
import { BoxCollider } from '../../../src/physics/box-collider';
import { vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';

describe('SphereCollider — 构造风格', () => {
  it('旧风格 (radius, center?) 仍然工作', () => {
    const c = new SphereCollider(2, vec3(1, 2, 3));
    expect(c.radius).toBe(2);
    expect(c.center[0]).toBe(1);
    expect(c.center[1]).toBe(2);
    expect(c.center[2]).toBe(3);
  });

  it('旧风格只传 radius 时 center=(0,0,0)', () => {
    const c = new SphereCollider(5);
    expect(c.radius).toBe(5);
    expect(c.center[0]).toBe(0);
  });

  it('新风格 (center, radius) 工作', () => {
    const c = new SphereCollider(vec3(1, 2, 3), 2);
    expect(c.radius).toBe(2);
    expect(c.center[0]).toBe(1);
    expect(c.center[1]).toBe(2);
    expect(c.center[2]).toBe(3);
  });

  it('新风格只传 center 时 radius=1', () => {
    const c = new SphereCollider(vec3(0, -0.5, 0));
    expect(c.radius).toBe(1);
    expect(c.center[1]).toBe(-0.5);
  });

  it('零参数等价于 radius=1, center=(0,0,0)', () => {
    const c = new SphereCollider();
    expect(c.radius).toBe(1);
    expect(c.center[0]).toBe(0);
  });

  it('SphereCollider.fromCenter 静态工厂', () => {
    const c = SphereCollider.fromCenter(vec3(0, -0.5, 0), 0.5);
    expect(c.radius).toBe(0.5);
    expect(c.center[1]).toBe(-0.5);
  });
});

describe('BoxCollider — 构造风格', () => {
  it('旧风格 (halfExtents, center?) 仍然工作', () => {
    const b = new BoxCollider(vec3(1, 0.5, 1), vec3(0, 5, 0));
    expect(b.halfExtents[0]).toBe(1);
    expect(b.center[1]).toBe(5);
  });

  it('BoxCollider.fromCenter 静态工厂', () => {
    const b = BoxCollider.fromCenter(vec3(0, 0, 0), vec3(50, 0.5, 50));
    expect(b.center[0]).toBe(0);
    expect(b.halfExtents[0]).toBe(50);
    expect(b.halfExtents[1]).toBe(0.5);
  });
});

describe('CollisionWorld.addStaticBody', () => {
  it('addStaticBody 自动创建 Node3D 并返回', () => {
    const world = new CollisionWorld();
    const node = world.addStaticBody(new SphereCollider(0.5));
    expect(node).toBeInstanceOf(Node3D);
    expect(world.getCollider(node)).toBeDefined();
  });

  it('addStaticBody 接受 BoxCollider', () => {
    const world = new CollisionWorld();
    const ground = BoxCollider.fromCenter(vec3(0, 0, 0), vec3(50, 0.5, 50));
    const node = world.addStaticBody(ground);
    expect(node).toBeInstanceOf(Node3D);
  });

  it('addStaticBody 支持自定义 name 和 layer', () => {
    const world = new CollisionWorld();
    const node = world.addStaticBody(new SphereCollider(1), { name: 'ground', layer: 2 });
    expect(node.name).toBe('ground');
  });

  it('addStaticBody 创建的 body 可被 raycast 击中', () => {
    const world = new CollisionWorld();
    world.addStaticBody(new SphereCollider(vec3(0, 0, -5), 1));
    const hits = world.raycast(vec3(0, 0, 0), vec3(0, 0, -1));
    expect(hits).not.toBeNull();
    expect(hits[0].distance).toBeCloseTo(4, 1);
  });
});
