import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/gameplay/character-controller';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';
import { CollisionWorld } from '../../../src/physics/collision';
import { BoxCollider } from '../../../src/physics/box-collider';

describe('CharacterController — 默认 groundCheckDistance', () => {
  it('默认 groundCheckDistance 应为 0.5', () => {
    const node = new Node3D('p');
    const ctrl = new mod.CharacterController(node);
    // 通过行为推断默认值：放在 y=0.5 上方应能立刻被检测为接地
    // （前提：default ≥ 0.5）
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    world.addBody(groundNode, BoxCollider.fromCenter(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 0.5, 0);
    const ctrl2 = new mod.CharacterController(player, {
      gravity: -20,
      collisionWorld: world,
      // 不传 groundCheckDistance，使用默认值
    });
    ctrl2.update(1 / 60);
    expect(ctrl2.isGrounded).toBe(true);
  });

  it('Issue #211 spec 场景（10 帧落地）现在工作', () => {
    // 重现 Issue #211 spec 中的失败场景：
    // gravity=-20, startY=0.5, ground@0, 10 帧 dt=1/60
    // 旧默认 0.1 下要 ~13 帧才能落地，新默认 0.5 下第 1 帧就该接地
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    world.addBody(groundNode, BoxCollider.fromCenter(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 0.5, 0);
    const ctrl = new mod.CharacterController(player, {
      gravity: -20,
      collisionWorld: world,
    });

    for (let i = 0; i < 10; i++) ctrl.update(1 / 60);
    expect(ctrl.isGrounded).toBe(true);
  });

  it('显式 groundCheckDistance 覆盖默认值（向后兼容）', () => {
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    world.addBody(groundNode, BoxCollider.fromCenter(vec3(0, 0, 0), vec3(50, 0.5, 50)));

    const player = new Node3D('player');
    player.position = vec3(0, 0.3, 0); // 在 0.1 范围外，0.5 范围内
    const ctrl = new mod.CharacterController(player, {
      gravity: -20,
      collisionWorld: world,
      groundCheckDistance: 0.1, // 显式更小的值
    });
    ctrl.update(1 / 60);
    expect(ctrl.isGrounded).toBe(false); // 显式 0.1 时 y=0.3 未接地
  });
});
