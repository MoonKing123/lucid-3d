/**
 * Player — BR-12P 玩家角色。
 * 组合 CharacterController 实现 WASD 移动、跳跃、冲刺。
 * 移动方向相对于 FPSCamera 的 yaw，以实现 FPS 风格操控。
 */

import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { CollisionWorld, SphereCollider } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';
import { type FPSCamera } from './fps-camera';

/** 输入状态接口，与 InputManager 兼容，也支持 headless 模拟。 */
export interface InputState {
  isKeyDown(key: string): boolean;
}

export interface PlayerOptions {
  collisionWorld?: CollisionWorld;
  startPosition?: [number, number, number];
  moveSpeed?: number;
  jumpSpeed?: number;
  sprintMultiplier?: number;
}

/** 玩家碰撞层（与地面/墙壁区分） */
export const LAYER_PLAYER = 1;

export class Player {
  readonly node: Node3D;
  readonly controller: CharacterController;
  private _input: InputState | null = null;
  private _sprintMultiplier: number;
  private _baseMoveSpeed: number;

  constructor(opts: PlayerOptions = {}) {
    this.node = new Node3D('player');
    if (opts.startPosition) {
      this.node.position[0] = opts.startPosition[0];
      this.node.position[1] = opts.startPosition[1];
      this.node.position[2] = opts.startPosition[2];
    }

    this._baseMoveSpeed = opts.moveSpeed ?? 5;
    this._sprintMultiplier = opts.sprintMultiplier ?? 2;

    this.controller = new CharacterController(this.node, {
      gravity: -9.81,
      jumpSpeed: 5,
      moveSpeed: this._baseMoveSpeed,
      groundCheckDistance: 0.5,
      collisionWorld: opts.collisionWorld,
    });

    // 注册玩家球体碰撞体
    if (opts.collisionWorld) {
      opts.collisionWorld.addBody(this.node, {
        shape: new SphereCollider(0.4, vec3(0, 0.4, 0)),
        layer: LAYER_PLAYER,
        mask: 0xFFFFFFFF,
      });
    }
  }

  /** 设置输入状态（支持真实 InputManager 或 headless 模拟）。 */
  setInput(input: InputState | null): void {
    this._input = input;
  }

  /**
   * 每帧更新：读输入 → 计算移动方向 → 驱动 CharacterController。
   * @param dt 帧时间（秒）
   * @param fpsCamera 用于将 WASD 映射到相机朝向（可选）
   */
  update(dt: number, fpsCamera?: FPSCamera): void {
    if (this._input) {
      const forward = fpsCamera?.getForwardXZ() ?? vec3(0, 0, -1);
      const right = fpsCamera?.getRightXZ() ?? vec3(1, 0, 0);
      const sprint =
        this._input.isKeyDown('Shift') ||
        this._input.isKeyDown('ShiftLeft') ||
        this._input.isKeyDown('ShiftRight');

      let mx = 0, mz = 0;

      if (this._input.isKeyDown('w') || this._input.isKeyDown('W')) {
        mx += forward[0];
        mz += forward[2];
      }
      if (this._input.isKeyDown('s') || this._input.isKeyDown('S')) {
        mx -= forward[0];
        mz -= forward[2];
      }
      if (this._input.isKeyDown('a') || this._input.isKeyDown('A')) {
        mx -= right[0];
        mz -= right[2];
      }
      if (this._input.isKeyDown('d') || this._input.isKeyDown('D')) {
        mx += right[0];
        mz += right[2];
      }

      const speedMult = sprint ? this._sprintMultiplier : 1;
      if (mx !== 0 || mz !== 0) {
        this.controller.move(vec3(mx * speedMult, 0, mz * speedMult));
      }

      if (this._input.isKeyDown(' ')) {
        this.controller.jump();
      }
    }

    this.controller.update(dt);
  }

  get position() {
    return this.node.position;
  }

  get isGrounded() {
    return this.controller.isGrounded;
  }
}
