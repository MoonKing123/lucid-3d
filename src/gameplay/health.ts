import { EventEmitter } from './event-emitter';

export type HealthEvents = {
  'health.changed': (current: number, max: number) => void;
  'health.died': () => void;
};

export class Health extends EventEmitter<HealthEvents> {
  private _current: number;
  private _max: number;

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

  heal(amount: number): void {
    this._current = Math.min(this._max, this._current + amount);
    this.emit('health.changed', this._current, this._max);
  }

  reset(newMax?: number): void {
    if (newMax !== undefined) {
      this._max = newMax;
    }
    this._current = this._max;
    this.emit('health.changed', this._current, this._max);
  }

  get current(): number { return this._current; }
  get max(): number { return this._max; }
  get isDead(): boolean { return this._current <= 0; }
}
