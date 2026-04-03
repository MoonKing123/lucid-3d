/**
 * CharacterController — 3D 角色控制器。
 * 提供重力、跳跃、地面检测、水平移动等开箱即用的角色运动能力。
 * 依赖 CollisionWorld.raycast() 做地面检测。
 * @see test/unit/gameplay/character-controller.test.ts
 */

export const __STUB__ = true;

import type { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';
import type { CollisionWorld } from '../physics/collision';

export interface CharacterControllerOptions {
  gravity?: number;
  jumpSpeed?: number;
  moveSpeed?: number;
  groundCheckDistance?: number;
  collisionWorld?: CollisionWorld;
  groundLayer?: number;
}

export class CharacterController {
  constructor(_node: Node3D, _options?: CharacterControllerOptions) {
    throw new Error('STUB');
  }
  get isGrounded(): boolean { throw new Error('STUB'); }
  get velocity(): Vec3 { throw new Error('STUB'); }
  move(_direction: Vec3): void { throw new Error('STUB'); }
  jump(): void { throw new Error('STUB'); }
  update(_dt: number): void { throw new Error('STUB'); }
  teleport(_position: Vec3): void { throw new Error('STUB'); }
}
