import type { GameServer } from './server';

export interface ServerStateSyncOptions<TState> {
  server: GameServer;
  tickRate?: number;
  stateMessage?: string;
  computeDelta?: (prev: TState, next: TState) => Partial<TState>;
}

export class ServerStateSync<TState = unknown> {
  private readonly _server: GameServer;
  private readonly _tickRate: number;
  private readonly _stateMessage: string;
  private readonly _computeDelta: (prev: TState, next: TState) => Partial<TState>;
  private readonly _entityStates = new Map<string, TState>();
  private readonly _prevEntityStates = new Map<string, TState>();
  private _currentTick = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: ServerStateSyncOptions<TState>) {
    this._server = options.server;
    this._tickRate = options.tickRate ?? 30;
    this._stateMessage = options.stateMessage ?? 'player.state';
    this._computeDelta = options.computeDelta ?? ((prev, next) => {
      const p = prev as Record<string, unknown>;
      const n = next as Record<string, unknown>;
      const delta: Record<string, unknown> = {};
      for (const key of Object.keys(n)) {
        if (n[key] !== p[key]) delta[key] = n[key];
      }
      return delta as Partial<TState>;
    });
  }

  setEntityState(id: string, state: TState): void {
    this._entityStates.set(id, state);
  }

  start(): void {
    if (this._timer !== null) return;
    const intervalMs = Math.round(1000 / this._tickRate);
    this._timer = setInterval(() => this._tick(), intervalMs);
  }

  stop(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  get currentTick(): number { return this._currentTick; }

  private _tick(): void {
    this._currentTick++;
    for (const [id, state] of this._entityStates) {
      const prev = this._prevEntityStates.get(id);
      const payload: unknown = prev ? this._computeDelta(prev, state) : state;
      for (const roomId of this._server.rooms.keys()) {
        this._server.broadcast(roomId, this._stateMessage, { id, tick: this._currentTick, state: payload });
      }
      this._prevEntityStates.set(id, JSON.parse(JSON.stringify(state)) as TState);
    }
  }
}
