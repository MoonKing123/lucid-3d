/**
 * Weapon — BR-12P 第一人称武器系统。
 *
 * 整合：弹药状态 + 状态机（idle/firing/reloading/empty）+
 *       Raycast 命中检测 + 枪口闪光 + 命中特效 + 音效。
 *
 * 通过 EventEmitter 广播以下事件：
 *   weapon.fired       (ammoRemaining: number)
 *   weapon.hit         (point: Vec3, target: Node3D)
 *   weapon.reload_start ()
 *   weapon.reload_end  ()
 *   weapon.empty       ()
 */

import { EventEmitter } from '../../../src/gameplay/event-emitter';
import { type Vec3, vec3 } from '../../../src/math/vec3';
import { CollisionWorld } from '../../../src/physics/collision';
import { type Node3D } from '../../../src/core/node3d';
import { WeaponStateMachine, type WeaponState } from './weapon-state-machine';
import { BulletSystem } from './bullet-system';
import { MuzzleFlash } from './muzzle-flash';
import { HitEffect } from './hit-effect';
import { WeaponAudio } from './audio-weapon';

/** 可命中目标的碰撞层（NPC、玩家、可破坏物） */
export const LAYER_HITTABLE = 4;

/** 武器事件映射 */
export type WeaponEvents = {
  'weapon.fired': (ammoRemaining: number) => void;
  'weapon.hit': (point: Vec3, target: Node3D) => void;
  'weapon.reload_start': () => void;
  'weapon.reload_end': () => void;
  'weapon.empty': () => void;
};

export interface WeaponOptions {
  world: CollisionWorld;
  /** 最大弹匣容量，默认 30 */
  maxAmmo?: number;
  /** 单发冷却时间（秒），默认 0.12 */
  fireCooldown?: number;
  /** 换弹时间（秒），默认 2.0 */
  reloadTime?: number;
  /** Raycast 层掩码，默认 LAYER_HITTABLE */
  layerMask?: number;
}

export class Weapon extends EventEmitter<WeaponEvents> {
  readonly stateMachine: WeaponStateMachine;
  readonly muzzleFlash: MuzzleFlash;
  readonly hitEffect: HitEffect;
  readonly audio: WeaponAudio;

  private _ammo: number;
  private _maxAmmo: number;
  private _bulletSystem: BulletSystem;

  constructor(options: WeaponOptions) {
    super();

    this._maxAmmo = options.maxAmmo ?? 30;
    this._ammo = this._maxAmmo;

    this._bulletSystem = new BulletSystem(options.world, {
      layerMask: options.layerMask ?? LAYER_HITTABLE,
    });
    this.muzzleFlash = new MuzzleFlash();
    this.hitEffect = new HitEffect();
    this.audio = new WeaponAudio();

    this.stateMachine = new WeaponStateMachine({
      fireCooldown: options.fireCooldown,
      reloadTime: options.reloadTime,
    });

    // 开火冷却完成：若弹药耗尽则自动换弹
    this.stateMachine.onFireDone = () => {
      if (this._ammo <= 0) {
        this.stateMachine.forceReload();
        this.emit('weapon.reload_start');
      }
    };

    // 换弹完成：重置弹药
    this.stateMachine.onReloadDone = () => {
      this._ammo = this._maxAmmo;
      this.emit('weapon.reload_end');
    };
  }

  /**
   * 尝试开火。
   * @param origin 射线起点（相机位置）
   * @param direction 归一化射线方向（相机前向）
   * @returns 是否成功开火
   */
  fire(origin: Vec3, direction: Vec3): boolean {
    // 状态机不在 idle → 无法开火
    if (!this.stateMachine.tryFire()) {
      if (this._ammo === 0) {
        this.emit('weapon.empty');
        this.audio.playEmpty();
      }
      return false;
    }

    this._ammo--;
    this.emit('weapon.fired', this._ammo);
    this.audio.playFire();

    // 枪口闪光 burst
    this.muzzleFlash.trigger();

    // Raycast 命中检测
    const hits = this._bulletSystem.cast(origin, direction);
    if (hits.length > 0) {
      const hit = hits[0];
      this.hitEffect.trigger(hit.point);
      this.emit('weapon.hit', hit.point, hit.node);
    }

    return true;
  }

  /**
   * 手动换弹（R 键触发）。仅 idle 状态下有效。
   */
  reload(): boolean {
    if (!this.stateMachine.tryReload()) {
      return false;
    }
    this.audio.playReload();
    this.emit('weapon.reload_start');
    return true;
  }

  /**
   * 每帧更新：驱动状态机计时器 + 粒子特效。
   */
  update(dt: number): void {
    this.stateMachine.update(dt);
    this.muzzleFlash.update(dt);
    this.hitEffect.update(dt);
  }

  get state(): WeaponState { return this.stateMachine.current; }
  get ammo(): number { return this._ammo; }
  get maxAmmo(): number { return this._maxAmmo; }
}
