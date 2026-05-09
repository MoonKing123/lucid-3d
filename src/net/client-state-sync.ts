import type { NetworkClient } from './network-client';

export interface ClientStateSyncOptions<TInput, TState> {
  client: NetworkClient;
  inputMessage?: string;
  stateMessage?: string;
  tickRate?: number;
}

export class ClientStateSync<TInput = unknown, TState = unknown> {
  private readonly _client: NetworkClient;
  private readonly _inputMessage: string;
  private readonly _stateHandlers: Array<(id: string, tick: number, state: TState) => void> = [];

  constructor(options: ClientStateSyncOptions<TInput, TState>) {
    this._client = options.client;
    this._inputMessage = options.inputMessage ?? 'player.input';
    const stateMessage = options.stateMessage ?? 'player.state';

    this._client.on(stateMessage, (data) => {
      const msg = data as { id: string; tick: number; state: TState };
      for (const h of this._stateHandlers) h(msg.id, msg.tick, msg.state);
    });
  }

  sendInput(input: TInput): void {
    this._client.send(this._inputMessage, input);
  }

  onState(handler: (id: string, tick: number, state: TState) => void): void {
    this._stateHandlers.push(handler);
  }
}
