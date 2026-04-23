import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import type { AnimationAction } from '../../../src/animation/animation-action';
import type { CollisionWorld } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';
import {
  createSkeleton,
  createIdleClip,
  createRunClip,
  createAttackClip,
} from './animations';

export type AnimState = 'idle' | 'run' | 'attack';

export interface InputLike {
  isKeyDown(key: string): boolean;
}

const MOVE_SPEED   = 4;
const SPRINT_SPEED = 10;
const CROSSFADE_DUR = 0.15;

export class Player {
  readonly node: Node3D;
  readonly mixer: AnimationMixer;

  private readonly _controller: CharacterController;
  private readonly _idleAction:   AnimationAction;
  private readonly _runAction:    AnimationAction;
  private readonly _attackAction: AnimationAction;

  private _state: AnimState = 'idle';

  constructor(world: CollisionWorld) {
    this.node = new Node3D('player');

    this._controller = new CharacterController(this.node, {
      moveSpeed: MOVE_SPEED,
      jumpSpeed: 5,
      groundCheckDistance: 0.5,
      collisionWorld: world,
    });

    const skeleton = createSkeleton();
    this.mixer = new AnimationMixer(skeleton);

    // 创建三个 action
    this._idleAction   = this.mixer.clipAction(createIdleClip());
    this._runAction    = this.mixer.clipAction(createRunClip());
    this._attackAction = this.mixer.clipAction(createAttackClip());

    // 只有 idle 初始可见；其他 enabled=false 权重归零
    this._runAction.enabled    = false;
    this._attackAction.enabled = false;
    this._attackAction.loop    = false;

    this._idleAction.loop = true;
    this._runAction.loop  = true;
    this._idleAction.play();
  }

  get position() { return this.node.position; }
  get animState(): AnimState { return this._state; }
  get isGrounded(): boolean { return this._controller.isGrounded; }

  update(dt: number, input: InputLike, cameraYaw: number): void {
    // ── 读取输入 ──
    const fwdX  = -Math.sin(cameraYaw);
    const fwdZ  =  Math.cos(cameraYaw);
    const rightX =  Math.cos(cameraYaw);
    const rightZ =  Math.sin(cameraYaw);

    let dx = 0, dz = 0;
    if (input.isKeyDown('w') || input.isKeyDown('W')) { dx += fwdX;  dz += fwdZ; }
    if (input.isKeyDown('s') || input.isKeyDown('S')) { dx -= fwdX;  dz -= fwdZ; }
    if (input.isKeyDown('a') || input.isKeyDown('A')) { dx -= rightX; dz -= rightZ; }
    if (input.isKeyDown('d') || input.isKeyDown('D')) { dx += rightX; dz += rightZ; }

    const isSprinting  = input.isKeyDown('Shift') || input.isKeyDown('shift');
    const attackPressed = input.isKeyDown('f') || input.isKeyDown('F');
    const jumpPressed   = input.isKeyDown(' ');

    const mLen = Math.sqrt(dx * dx + dz * dz);
    const isMoving = mLen > 1e-6;

    // ── 跳跃 ──
    if (jumpPressed) this._controller.jump();

    // ── 水平移动（CharacterController + 冲刺补偿） ──
    if (isMoving) {
      this._controller.move(vec3(dx, 0, dz));

      // 冲刺：额外位移（CharacterController 归一化后只有 moveSpeed；冲刺补偿差值）
      if (isSprinting) {
        const bonus = (SPRINT_SPEED - MOVE_SPEED) * dt / mLen;
        this.node.position[0] += dx * bonus;
        this.node.position[2] += dz * bonus;
      }
    }

    this._controller.update(dt);
    this.mixer.update(dt);
    this._updateAnimState(isMoving, attackPressed);
  }

  private _updateAnimState(isMoving: boolean, attackPressed: boolean): void {
    if (attackPressed && this._state !== 'attack') {
      // 进入攻击
      const fromAction = this._state === 'run' ? this._runAction : this._idleAction;
      this._attackAction.enabled = true;
      fromAction.crossFadeTo(this._attackAction, CROSSFADE_DUR);
      this._state = 'attack';
    } else if (this._state === 'attack') {
      if (!this._attackAction.isRunning) {
        // 攻击结束，回到 idle 或 run
        if (isMoving) {
          this._runAction.enabled = true;
          this._attackAction.crossFadeTo(this._runAction, CROSSFADE_DUR);
          this._state = 'run';
        } else {
          this._idleAction.enabled = true;
          this._attackAction.crossFadeTo(this._idleAction, CROSSFADE_DUR);
          this._state = 'idle';
        }
      }
    } else {
      // idle ↔ run 过渡
      if (isMoving && this._state !== 'run') {
        this._runAction.enabled = true;
        this._idleAction.crossFadeTo(this._runAction, CROSSFADE_DUR);
        this._state = 'run';
      } else if (!isMoving && this._state !== 'idle') {
        this._idleAction.enabled = true;
        this._runAction.crossFadeTo(this._idleAction, CROSSFADE_DUR);
        this._state = 'idle';
      }
    }
  }
}
