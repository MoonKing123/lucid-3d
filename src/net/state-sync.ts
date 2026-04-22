export const __STUB__ = true;

import type { NetworkClient } from './network-client';

export interface StateSyncOptions {
  stateMessage?: string;
  joinMessage?: string;
  leaveMessage?: string;
}

export class StateSync<TState = Record<string, unknown>> {
  constructor(_client: NetworkClient, _options?: StateSyncOptions) {
    throw new Error('Not implemented');
  }
  onJoin(_handler: (id: string, state: TState) => void): void { throw new Error('Not implemented'); }
  onLeave(_handler: (id: string) => void): void { throw new Error('Not implemented'); }
  onUpdate(_handler: (id: string, state: TState) => void): void { throw new Error('Not implemented'); }
  update(_dt: number): void { throw new Error('Not implemented'); }
  get remoteIds(): ReadonlyArray<string> { throw new Error('Not implemented'); }
}
