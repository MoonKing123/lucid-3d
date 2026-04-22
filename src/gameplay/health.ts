export const __STUB__ = true;

import { EventEmitter } from './event-emitter';

export type HealthEvents = {
  'health.changed': (current: number, max: number) => void;
  'health.died': () => void;
};

export class Health extends EventEmitter<HealthEvents> {
  constructor(_max?: number) {
    super();
    throw new Error('Not implemented');
  }
  takeDamage(_amount: number): void { throw new Error('Not implemented'); }
  heal(_amount: number): void { throw new Error('Not implemented'); }
  reset(_newMax?: number): void { throw new Error('Not implemented'); }
  get current(): number { throw new Error('Not implemented'); }
  get max(): number { throw new Error('Not implemented'); }
  get isDead(): boolean { throw new Error('Not implemented'); }
}
