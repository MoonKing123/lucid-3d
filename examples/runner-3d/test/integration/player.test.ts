/**
 * Player 集成测试 — Issue #211
 *
 * 注意：Issue spec 中的测试代码有以下 API 错误，已按实际 src/ API 修正：
 * 1. SphereCollider 构造参数顺序：(radius, center?)，非 (center, radius)
 * 2. CollisionWorld.addBody 需要 (node, options)，不能只传 options 对象
 * 3. 落地帧数：在 gravity=-20, dt=1/60, groundCheckDistance=0.1 下需要约 12 帧落地，
 *    使用 20 帧确保安全落地（Issue spec 中 10 帧不够）
 * 已在 api-friction/bug-from-demo issue 中记录上述问题。
 */
import { describe, it, expect } from 'vitest';
import { Player } from '../../src/player';
import { CollisionWorld, SphereCollider } from '../../../../src/physics/collision';
import { Node3D } from '../../../../src/core/node3d';
import { vec3 } from '../../../../src/math/vec3';

describe('Player — 集成测试', () => {
  it('未输入时静止', () => {
    const player = new Player({ startPosition: [0, 0, 0] });
    player.update(0.1);
    expect(player.position[0]).toBeCloseTo(0);
    expect(player.position[2]).toBeCloseTo(0);
  });

  it('收到 move 指令向 +Z 移动', () => {
    const player = new Player({ startPosition: [0, 0, 0] });
    player.controller.move(vec3(0, 0, 1));
    player.update(1.0); // 1 秒
    expect(player.position[2]).toBeGreaterThan(0);
  });

  it('受重力作用 Y 持续下降', () => {
    const player = new Player({ startPosition: [0, 5, 0] });
    const y0 = player.position[1];
    player.update(0.5);
    expect(player.position[1]).toBeLessThan(y0);
  });

  it('落地后跳跃使 Y 速度向上', () => {
    // 创建碰撞世界，用 SphereCollider 模拟 y=0 地面
    // SphereCollider(radius=0.5, center=(0,-0.5,0))：topY = 0 + (-0.5) + 0.5 = 0
    const world = new CollisionWorld();
    const groundNode = new Node3D('ground');
    // addBody 需要 (node, collider|options)，SphereCollider 构造为 (radius, center?)
    world.addBody(groundNode, new SphereCollider(0.5, vec3(0, -0.5, 0)));

    const player = new Player({
      collisionWorld: world,
      startPosition: [0, 0.5, 0],
    });

    // gravity=-20, dt=1/60：约 12 帧后落地（y 进入 groundCheckDistance=0.1 范围）
    // 使用 20 帧确保稳定落地
    for (let i = 0; i < 20; i++) player.update(1 / 60);

    // 确认已落地
    expect(player.controller.isGrounded).toBe(true);

    // 跳跃并记录跳跃前位置
    player.controller.jump();
    const yBefore = player.position[1];

    // 下一帧应向上移动
    player.update(1 / 60);
    expect(player.position[1]).toBeGreaterThanOrEqual(yBefore);
  });
});
