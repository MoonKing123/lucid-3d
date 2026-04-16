/**
 * WeaponStateMachine — 武器状态机。
 * 状态：idle / firing / reloading / empty
 * 使用 Timer 驱动自动状态转换（开火冷却 + 换弹计时）。
 */

import { Timer } from '../../../src/gameplay/timer';

export type WeaponState = 'idle' | 'firing' | 'reloading' | 'empty';

export interface WeaponStateMachineOptions {
  /** 开火冷却时间（秒），默认 0.12 */
  fireCooldown?: number;
  /** 换弹时间（秒），默认 2.0 */
  reloadTime?: number;
}

export class WeaponStateMachine {
  private _state: WeaponState = 'idle';
  private _timer: Timer;

  readonly fireCooldown: number;
  readonly reloadTime: number;

  /** 开火冷却完成时回调（由 Weapon 设置） */
  onFireDone: () => void = () => {};
  /** 换弹完成时回调（由 Weapon 设置） */
  onReloadDone: () => void = () => {};

  constructor(opts: WeaponStateMachineOptions = {}) {
    this._timer = new Timer();
    this.fireCooldown = opts.fireCooldown ?? 0.12;
    this.reloadTime = opts.reloadTime ?? 2.0;
  }

  get current(): WeaponState {
    return this._state;
  }

  /**
   * 尝试进入 firing 状态（仅 idle 时有效）。
   * 成功后自动启动冷却定时器，冷却结束回到 idle 并调用 onFireDone。
   */
  tryFire(): boolean {
    if (this._state !== 'idle') return false;
    this._state = 'firing';
    this._timer.cancelAll();
    this._timer.setTimeout(() => {
      this._state = 'idle';
      this.onFireDone();
    }, this.fireCooldown);
    return true;
  }

  /**
   * 尝试手动换弹（仅 idle 时有效）。
   * 成功后启动换弹定时器，结束后回到 idle 并调用 onReloadDone。
   */
  tryReload(): boolean {
    if (this._state !== 'idle') return false;
    this._startReload();
    return true;
  }

  /**
   * 强制进入换弹状态（弹药耗尽时自动调用，不受当前状态限制）。
   */
  forceReload(): void {
    if (this._state === 'reloading') return;
    this._timer.cancelAll();
    this._startReload();
  }

  private _startReload(): void {
    this._state = 'reloading';
    this._timer.setTimeout(() => {
      this._state = 'idle';
      this.onReloadDone();
    }, this.reloadTime);
  }

  update(dt: number): void {
    this._timer.update(dt);
  }
}
