/**
 * Health — 通用血量组件。
 * 广播 health.changed / health.died 事件。
 */

import { EventEmitter } from '../../../src/gameplay/event-emitter';

export type HealthEvents = {
  'health.changed': (current: number, max: number) => void;
  'health.died': () => void;
};

export class Health extends EventEmitter<HealthEvents> {
  private _current: number;
  private readonly _max: number;

  constructor(max = 100) {
    super();
    this._max = max;
    this._current = max;
  }

  takeDamage(amount: number): void {
    if (this._current <= 0) return;
    this._current = Math.max(0, this._current - amount);
    this.emit('health.changed', this._current, this._max);
    if (this._current <= 0) {
      this.emit('health.died');
    }
  }

  get current(): number { return this._current; }
  get max(): number { return this._max; }
  get isDead(): boolean { return this._current <= 0; }
}
