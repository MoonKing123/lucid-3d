/**
 * CharacterController — 3D 角色控制器。
 * 提供重力、跳跃、地面检测、水平移动等开箱即用的角色运动能力。
 * 地面检测使用 CollisionWorld.findGround() Y 轴接近度检测。
 *
 * 默认 groundCheckDistance = 0.5：对应角色高度 50% 的"脚下区域"，
 * 与 Unity CharacterController / Godot KinematicBody 保持一致的宽容度。
 * 旧默认值 0.1 要求亚像素精度，人形角色实际使用中很容易漏检。
 *
 * @see test/unit/gameplay/character-controller.test.ts
 */

import type { Node3D } from '../core/node3d';
import { type Vec3, vec3 } from '../math/vec3';
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
  private _node: Node3D;
  private _gravity: number;
  private _jumpSpeed: number;
  private _moveSpeed: number;
  private _groundCheckDistance: number;
  private _collisionWorld: CollisionWorld | undefined;
  private _groundLayer: number;
  private _vel: Vec3;
  private _grounded: boolean;
  private _moveDir: Vec3;

  constructor(node: Node3D, options?: CharacterControllerOptions) {
    this._node = node;
    this._gravity = options?.gravity ?? -9.81;
    this._jumpSpeed = options?.jumpSpeed ?? 5;
    this._moveSpeed = options?.moveSpeed ?? 3;
    this._groundCheckDistance = options?.groundCheckDistance ?? 0.5;
    this._collisionWorld = options?.collisionWorld;
    this._groundLayer = options?.groundLayer ?? 0xFFFFFFFF;
    this._vel = vec3(0, 0, 0);
    this._grounded = false;
    this._moveDir = vec3(0, 0, 0);
  }

  get isGrounded(): boolean {
    return this._grounded;
  }

  get velocity(): Vec3 {
    return vec3(this._vel[0], this._vel[1], this._vel[2]);
  }

  move(direction: Vec3): void {
    this._moveDir[0] = direction[0];
    this._moveDir[1] = direction[1];
    this._moveDir[2] = direction[2];
  }

  jump(): void {
    if (this._grounded) {
      this._vel[1] = this._jumpSpeed;
      this._grounded = false;
    }
  }

  update(dt: number): void {
    // 重力：仅在未落地时累积
    if (!this._grounded) {
      this._vel[1] += this._gravity * dt;
    }

    // 地面检测（在位移之前检测，避免重力导致角色下沉后错过地面）
    if (this._collisionWorld) {
      const groundY = (this._collisionWorld as any).findGround(
        this._node.position[1],
        this._groundCheckDistance,
        this._groundLayer,
      ) as number | null;

      if (groundY !== null) {
        this._grounded = true;
        if (this._vel[1] < 0) this._vel[1] = 0;
        if (this._node.position[1] < groundY) this._node.position[1] = groundY;
      } else {
        this._grounded = false;
      }
    }

    // Y 方向位移
    this._node.position[1] += this._vel[1] * dt;

    // 水平方向移动（仅 X/Z，Y 分量忽略）
    const mx = this._moveDir[0];
    const mz = this._moveDir[2];
    const mLen = Math.sqrt(mx * mx + mz * mz);
    if (mLen > 1e-6) {
      const s = this._moveSpeed * dt / mLen;
      this._node.position[0] += mx * s;
      this._node.position[2] += mz * s;
    }
    this._moveDir[0] = 0;
    this._moveDir[1] = 0;
    this._moveDir[2] = 0;
  }

  teleport(position: Vec3): void {
    this._node.position[0] = position[0];
    this._node.position[1] = position[1];
    this._node.position[2] = position[2];
    this._vel[0] = 0;
    this._vel[1] = 0;
    this._vel[2] = 0;
    this._grounded = false;
  }
}
