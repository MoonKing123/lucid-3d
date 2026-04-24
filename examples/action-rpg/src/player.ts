import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import type { AnimationAction } from '../../../src/animation/animation-action';
import type { CollisionWorld } from '../../../src/physics/collision';
import { vec3, type Vec3 } from '../../../src/math/vec3';
import { EventEmitter } from '../../../src/gameplay/event-emitter';
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

export type PlayerEvents = {
  'health-changed': (health: number, maxHealth: number) => void;
  'mana-changed': (mana: number, maxMana: number) => void;
  'died': () => void;
  'respawned': () => void;
};

const MOVE_SPEED    = 4;
const SPRINT_SPEED  = 10;
const CROSSFADE_DUR = 0.15;
const MANA_REGEN    = 5; // per second

export class Player extends EventEmitter<PlayerEvents> {
  readonly node: Node3D;
  readonly mixer: AnimationMixer;

  private readonly _controller: CharacterController;
  private readonly _idleAction:   AnimationAction;
  private readonly _runAction:    AnimationAction;
  private readonly _attackAction: AnimationAction;

  private _state: AnimState = 'idle';

  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;

  private readonly _spawnPosition: Vec3;

  constructor(world: CollisionWorld) {
    super();
    this.node = new Node3D('player');

    this._controller = new CharacterController(this.node, {
      moveSpeed: MOVE_SPEED,
      jumpSpeed: 5,
      groundCheckDistance: 0.5,
      collisionWorld: world,
    });

    const skeleton = createSkeleton();
    this.mixer = new AnimationMixer(skeleton);

    this._idleAction   = this.mixer.clipAction(createIdleClip());
    this._runAction    = this.mixer.clipAction(createRunClip());
    this._attackAction = this.mixer.clipAction(createAttackClip());

    this._runAction.enabled    = false;
    this._attackAction.enabled = false;
    this._attackAction.loop    = false;

    this._idleAction.loop = true;
    this._runAction.loop  = true;
    this._idleAction.play();

    this.health    = 100;
    this.maxHealth = 100;
    this.mana      = 100;
    this.maxMana   = 100;

    this._spawnPosition = vec3(0, 0, 0);
  }

  get position() { return this.node.position; }
  get animState(): AnimState { return this._state; }
  get isGrounded(): boolean { return this._controller.isGrounded; }

  takeDamage(amount: number): void {
    if (amount <= 0) return;
    const prev = this.health;
    this.health = Math.max(0, this.health - amount);
    if (this.health !== prev) {
      this.emit('health-changed', this.health, this.maxHealth);
      if (this.health === 0) {
        this.emit('died');
      }
    }
  }

  respawn(position?: Vec3): void {
    this.health = this.maxHealth;
    this.mana   = this.maxMana;
    const pos = position ?? this._spawnPosition;
    this.node.position[0] = pos[0];
    this.node.position[1] = pos[1];
    this.node.position[2] = pos[2];
    this.emit('health-changed', this.health, this.maxHealth);
    this.emit('mana-changed', this.mana, this.maxMana);
    this.emit('respawned');
  }

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

    const isSprinting   = input.isKeyDown('Shift') || input.isKeyDown('shift');
    const attackPressed = input.isKeyDown('f') || input.isKeyDown('F');
    const jumpPressed   = input.isKeyDown(' ');

    const mLen    = Math.sqrt(dx * dx + dz * dz);
    const isMoving = mLen > 1e-6;

    if (jumpPressed) this._controller.jump();

    if (isMoving) {
      this._controller.move(vec3(dx, 0, dz));
      if (isSprinting) {
        const bonus = (SPRINT_SPEED - MOVE_SPEED) * dt / mLen;
        this.node.position[0] += dx * bonus;
        this.node.position[2] += dz * bonus;
      }
    }

    this._controller.update(dt);
    this.mixer.update(dt);
    this._updateAnimState(isMoving, attackPressed);
    this._regenMana(dt);
  }

  private _regenMana(dt: number): void {
    if (this.mana >= this.maxMana) return;
    const next = Math.min(this.maxMana, this.mana + MANA_REGEN * dt);
    if (next !== this.mana) {
      this.mana = next;
      this.emit('mana-changed', this.mana, this.maxMana);
    }
  }

  private _updateAnimState(isMoving: boolean, attackPressed: boolean): void {
    if (attackPressed && this._state !== 'attack') {
      const fromAction = this._state === 'run' ? this._runAction : this._idleAction;
      this._attackAction.enabled = true;
      fromAction.crossFadeTo(this._attackAction, CROSSFADE_DUR);
      this._state = 'attack';
    } else if (this._state === 'attack') {
      if (!this._attackAction.isRunning) {
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
