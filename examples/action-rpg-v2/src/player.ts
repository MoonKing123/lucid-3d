import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { AnimationStateMachine } from '../../../src/animation/animation-state-machine';
import type { AnimationAction } from '../../../src/animation/animation-action';
import type { CollisionWorld } from '../../../src/physics/collision';
import { vec3, type Vec3 } from '../../../src/math/vec3';
import {
  createSkeleton,
  createIdleClip,
  createRunClip,
  createAttackClip,
} from './animations';

export interface InputLike {
  isKeyDown(key: string): boolean;
}

const MOVE_SPEED   = 4;
const SPRINT_SPEED = 10;

export class Player {
  readonly node: Node3D;
  readonly mixer: AnimationMixer;
  readonly stateMachine: AnimationStateMachine;

  private readonly _controller: CharacterController;
  private readonly _attackAction: AnimationAction;

  // 当前水平速度大小（供状态机条件引用）
  private _horzSpeed: number = 0;
  // 单帧攻击触发标志
  private _attackTrigger: boolean = false;

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

    const idleAction   = this.mixer.clipAction(createIdleClip());
    const runAction    = this.mixer.clipAction(createRunClip());
    const attackAction = this.mixer.clipAction(createAttackClip());

    idleAction.loop   = true;
    runAction.loop    = true;
    attackAction.loop = false;

    this._attackAction = attackAction;

    // 注册状态机三态
    this.stateMachine = new AnimationStateMachine();
    this.stateMachine
      .addState('idle',   idleAction)
      .addState('run',    runAction)
      .addState('attack', attackAction);

    // 添加转换条件
    this.stateMachine
      .addTransition('idle', 'run',
        () => this._horzSpeed > 0.1, 0.15)
      .addTransition('run', 'idle',
        () => this._horzSpeed <= 0.1, 0.15)
      .addTransition('idle', 'attack',
        () => this._attackTrigger, 0.1)
      .addTransition('run', 'attack',
        () => this._attackTrigger, 0.1)
      // attack 动画播完（isRunning=false）后自动回 idle
      .addTransition('attack', 'idle',
        () => !this._attackAction.isRunning, 0.15);
  }

  get position(): Vec3 { return this.node.position; }

  update(dt: number, input: InputLike, cameraYaw: number): void {
    const fwdX   = -Math.sin(cameraYaw);
    const fwdZ   =  Math.cos(cameraYaw);
    const rightX =  Math.cos(cameraYaw);
    const rightZ =  Math.sin(cameraYaw);

    let dx = 0, dz = 0;
    if (input.isKeyDown('w') || input.isKeyDown('W')) { dx += fwdX;  dz += fwdZ; }
    if (input.isKeyDown('s') || input.isKeyDown('S')) { dx -= fwdX;  dz -= fwdZ; }
    if (input.isKeyDown('a') || input.isKeyDown('A')) { dx -= rightX; dz -= rightZ; }
    if (input.isKeyDown('d') || input.isKeyDown('D')) { dx += rightX; dz += rightZ; }

    const isSprinting = input.isKeyDown('Shift') || input.isKeyDown('shift');
    const jumpPressed = input.isKeyDown(' ');

    const mLen    = Math.sqrt(dx * dx + dz * dz);
    const isMoving = mLen > 1e-6;

    if (jumpPressed) this._controller.jump();

    if (isMoving) {
      this._controller.move(vec3(dx, 0, dz));
      const speed = isSprinting ? SPRINT_SPEED : MOVE_SPEED;
      this._horzSpeed = speed;
      if (isSprinting) {
        const bonus = (SPRINT_SPEED - MOVE_SPEED) * dt / mLen;
        this.node.position[0] += dx * bonus;
        this.node.position[2] += dz * bonus;
      }
    } else {
      this._horzSpeed = 0;
    }

    this._controller.update(dt);

    // 攻击触发：仅当不在 attack 状态时设置
    if ((input.isKeyDown('f') || input.isKeyDown('F')) &&
        this.stateMachine.currentState !== 'attack') {
      this._attackTrigger = true;
    }

    // 状态机驱动动画切换（内部会调用 action._update 推进时间）
    this.stateMachine.update(dt);

    // 状态机消费 attackTrigger 后清除
    if (this.stateMachine.currentState === 'attack') {
      this._attackTrigger = false;
    }

    // 以 dt=0 触发骨骼权重混合（避免双重推进动画时间）
    this.mixer.update(0);
  }
}
