import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { AnimationStateMachine } from '../../../src/animation/animation-state-machine';
import { BlendTree2D } from '../../../src/animation/blend-tree-2d';
import type { AnimationAction } from '../../../src/animation/animation-action';
import type { CollisionWorld } from '../../../src/physics/collision';
import { vec3, type Vec3 } from '../../../src/math/vec3';
import {
  createSkeleton,
  createIdleClip,
  createRunClip,
  createAttackClip,
  createRunDirectionalClips,
} from './animations';
import { CombatSystemV2, type CombatTarget } from './combat';

export interface InputLike {
  isKeyDown(key: string): boolean;
}

const MOVE_SPEED   = 4;
const SPRINT_SPEED = 10;

// 地形高度函数类型（用于脚步贴地 IK）
export type TerrainHeightFn = (x: number, z: number) => number;
// BlendTree2D 8 方向映射位置（x=strafe, y=forward）
const BLEND2D_POSITIONS: { x: number; y: number }[] = [
  { x:  0.0,  y:  1.0 }, // forward
  { x:  0.7,  y:  0.7 }, // forward-right
  { x:  1.0,  y:  0.0 }, // right
  { x:  0.7,  y: -0.7 }, // back-right
  { x:  0.0,  y: -1.0 }, // back
  { x: -0.7,  y: -0.7 }, // back-left
  { x: -1.0,  y:  0.0 }, // left
  { x: -0.7,  y:  0.7 }, // forward-left
];

export class Player {
  readonly node: Node3D;
  readonly mixer: AnimationMixer;
  readonly stateMachine: AnimationStateMachine;
  readonly combat: CombatSystemV2;
  readonly blendTree2D: BlendTree2D;

  private readonly _controller: CharacterController;
  private readonly _attackAction: AnimationAction;
  private readonly _skeleton: ReturnType<typeof createSkeleton>;

  private _horzSpeed: number = 0;
  private _attackTrigger: boolean = false;
  private _bowTrigger: boolean = false;
  private _playerForward: Vec3 = vec3(0, 0, 1);

  // 归一化速度方向（x=strafe, y=forward）
  private _velX: number = 0;
  private _velY: number = 1;

  constructor(world: CollisionWorld) {
    this.node = new Node3D('player');

    this._controller = new CharacterController(this.node, {
      moveSpeed: MOVE_SPEED,
      jumpSpeed: 5,
      groundCheckDistance: 0.5,
      collisionWorld: world,
    });

    this._skeleton = createSkeleton();
    this.mixer = new AnimationMixer(this._skeleton);

    const idleAction   = this.mixer.clipAction(createIdleClip());
    const runAction    = this.mixer.clipAction(createRunClip());
    const attackAction = this.mixer.clipAction(createAttackClip());

    idleAction.loop   = true;
    runAction.loop    = true;
    attackAction.loop = false;

    this._attackAction = attackAction;

    // 8 方向 BlendTree2D
    const dirClips = createRunDirectionalClips();
    const blendEntries = dirClips.map((clip, i) => ({
      position: BLEND2D_POSITIONS[i],
      action: this.mixer.clipAction(clip),
    }));
    for (const entry of blendEntries) {
      entry.action.loop = true;
    }
    this.blendTree2D = new BlendTree2D(blendEntries);

    this.stateMachine = new AnimationStateMachine();
    this.stateMachine
      .addState('idle',   idleAction)
      .addState('run',    runAction)
      .addState('attack', attackAction);

    this.stateMachine
      .addTransition('idle', 'run',
        () => this._horzSpeed > 0.1, 0.15)
      .addTransition('run', 'idle',
        () => this._horzSpeed <= 0.1, 0.15)
      .addTransition('idle', 'attack',
        () => this._attackTrigger, 0.1)
      .addTransition('run', 'attack',
        () => this._attackTrigger, 0.1)
      .addTransition('attack', 'idle',
        () => !this._attackAction.isRunning, 0.15);

    // 战斗系统初始化（enemies 由 game.ts 通过 setCombatTargets 注入）
    this.combat = new CombatSystemV2(this.node, []);
  }

  get position(): Vec3 { return this.node.position; }
  get skeleton() { return this._skeleton; }

  /** 注入可命中目标（由 game.ts 在初始化后调用） */
  setCombatTargets(targets: readonly CombatTarget[]): void {
    this.combat.setTargets(targets);
  }

  /** 触发近战（鼠标左键 / 键盘 F） */
  triggerMeleeAttack(): void {
    this._attackTrigger = true;
  }

  /** 触发射箭（鼠标右键 / 键盘 G） */
  triggerBowShoot(): void {
    this._bowTrigger = true;
  }

  update(
    dt: number,
    input: InputLike,
    cameraYaw: number,
    getTerrainY: TerrainHeightFn = () => 0,
  ): void {
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
    const jumpPressed  = input.isKeyDown(' ');

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
      // 记录朝向（XZ 归一化）
      this._playerForward = vec3(dx / mLen, 0, dz / mLen);

      // 计算相机坐标系下的 strafe/forward 分量（归一化）
      const fwdDot   = dx * fwdX   + dz * fwdZ;
      const rightDot = dx * rightX + dz * rightZ;
      const len = Math.sqrt(fwdDot * fwdDot + rightDot * rightDot);
      if (len > 1e-6) {
        this._velY = fwdDot / len;   // forward 分量
        this._velX = rightDot / len; // strafe 分量
      }
    } else {
      this._horzSpeed = 0;
    }

    this._controller.update(dt);

    // 键盘触发近战（F 键）
    if ((input.isKeyDown('f') || input.isKeyDown('F')) &&
        this.stateMachine.currentState !== 'attack') {
      this._attackTrigger = true;
    }

    // 状态机更新（含动画切换）
    this.stateMachine.update(dt);

    // 攻击状态消费触发标志
    this.stateMachine.update(dt);

    if (this.stateMachine.currentState === 'attack') {
      if (this._attackTrigger) {
        this.combat.meleeAttack(this.node.position, this._playerForward);
      }
      this._attackTrigger = false;
    }

    // 射箭（G 键触发）
    if (input.isKeyDown('g') || input.isKeyDown('G') || this._bowTrigger) {
      this.combat.bowShoot(this.node.position, this._playerForward);
      this._bowTrigger = false;
    }

    // 在 run 状态下用速度方向驱动 BlendTree2D
    if (this.stateMachine.currentState === 'run') {
      this.blendTree2D.setParameters(this._velX, this._velY).update(dt);
    }

    this.mixer.update(0);

    // TwoBoneIK 脚步贴地（每帧）
    this.combat.applyFootIK(this._skeleton, this.node.position, getTerrainY);

    // 弓箭飞行时 IKChain 手抓弓
    if (this.combat.bowActive) {
      const bowGrip = vec3(
        this.node.position[0] - 0.4,
        this.node.position[1] + 1.1,
        this.node.position[2] + 0.3,
      );
      this.combat.applyBowHandIK(this._skeleton, bowGrip, this.node.position);
    }

    this.combat.update(dt);
  }
}
