import type { NetworkClient } from './network-client';

export interface StateSyncOptions {
  stateMessage?: string;
  joinMessage?: string;
  leaveMessage?: string;
}

export class StateSync<TState = Record<string, unknown>> {
  private _remoteIds: string[] = [];
  private _joinHandlers: Array<(id: string, state: TState) => void> = [];
  private _leaveHandlers: Array<(id: string) => void> = [];
  private _updateHandlers: Array<(id: string, state: TState) => void> = [];

  constructor(client: NetworkClient, options?: StateSyncOptions) {
    const joinMsg = options?.joinMessage ?? 'player.join';
    const leaveMsg = options?.leaveMessage ?? 'player.leave';
    const stateMsg = options?.stateMessage ?? 'player.state';

    client.on(joinMsg, (data) => {
      const msg = data as { id: string } & TState;
      if (!this._remoteIds.includes(msg.id)) this._remoteIds.push(msg.id);
      for (const h of this._joinHandlers) h(msg.id, msg);
    });

    client.on(leaveMsg, (data) => {
      const msg = data as { id: string };
      this._remoteIds = this._remoteIds.filter(x => x !== msg.id);
      for (const h of this._leaveHandlers) h(msg.id);
    });

    client.on(stateMsg, (data) => {
      const msg = data as { id: string } & TState;
      for (const h of this._updateHandlers) h(msg.id, msg);
    });
  }

  onJoin(handler: (id: string, state: TState) => void): void {
    this._joinHandlers.push(handler);
  }

  onLeave(handler: (id: string) => void): void {
    this._leaveHandlers.push(handler);
  }

  onUpdate(handler: (id: string, state: TState) => void): void {
    this._updateHandlers.push(handler);
  }

  update(_dt: number): void {}

  get remoteIds(): ReadonlyArray<string> { return this._remoteIds; }
}
