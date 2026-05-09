/**
 * Phase 57 KR3 — Lockstep 帧同步
 *
 * 确定性帧同步客户端 — 每 tick 广播本地 input，收齐所有 peer 的同 tick input 后推进 simulation。
 * 适合 RTS / 格斗 / 棋牌（peer-to-peer 无需服务器权威）。
 */

import type { NetworkClient } from './network-client';

export interface LockstepClientOptions<TInput> {
  client: NetworkClient;
  localPlayerId: string;
  expectedPeerCount: number;
  tickRate?: number;
  inputMessage?: string;
}

export interface LockstepStepResult<TInput> {
  tick: number;
  inputs: ReadonlyMap<string, TInput>;
}

interface InputMsg<TInput> {
  tick: number;
  playerId: string;
  input: TInput;
}

export class LockstepClient<TInput = unknown> {
  private _client: NetworkClient;
  private _localPlayerId: string;
  private _expectedPeerCount: number;
  private _inputMessage: string;
  private _currentTick = 0;
  private _submitTick = 1;
  private _stalled = false;
  private _pendingInputs = new Map<number, Map<string, TInput>>();
  private _stepHandlers: Array<(tick: number, inputs: ReadonlyMap<string, TInput>) => void> = [];

  constructor(options: LockstepClientOptions<TInput>) {
    this._client = options.client;
    this._localPlayerId = options.localPlayerId;
    this._expectedPeerCount = options.expectedPeerCount;
    this._inputMessage = options.inputMessage ?? 'lockstep.input';

    this._client.on(this._inputMessage, (data) => {
      const msg = data as InputMsg<TInput>;
      if (!this._pendingInputs.has(msg.tick)) {
        this._pendingInputs.set(msg.tick, new Map());
      }
      this._pendingInputs.get(msg.tick)!.set(msg.playerId, msg.input);
    });
  }

  submitInput(input: TInput): void {
    const tick = this._submitTick++;
    if (!this._pendingInputs.has(tick)) {
      this._pendingInputs.set(tick, new Map());
    }
    this._pendingInputs.get(tick)!.set(this._localPlayerId, input);
    this._client.send(this._inputMessage, {
      tick,
      playerId: this._localPlayerId,
      input,
    });
  }

  tryStep(): LockstepStepResult<TInput> | null {
    const nextTick = this._currentTick + 1;
    const inputs = this._pendingInputs.get(nextTick);
    if (!inputs || inputs.size < this._expectedPeerCount) {
      this._stalled = true;
      return null;
    }
    this._stalled = false;
    this._currentTick = nextTick;
    const result: LockstepStepResult<TInput> = {
      tick: nextTick,
      inputs: new Map(inputs) as ReadonlyMap<string, TInput>,
    };
    this._pendingInputs.delete(nextTick);
    for (const h of this._stepHandlers) h(result.tick, result.inputs);
    return result;
  }

  onStep(handler: (tick: number, inputs: ReadonlyMap<string, TInput>) => void): void {
    this._stepHandlers.push(handler);
  }

  get currentTick(): number { return this._currentTick; }
  get stalled(): boolean { return this._stalled; }
}

export function createLockstepClient<TInput>(
  options: LockstepClientOptions<TInput>,
): LockstepClient<TInput> {
  return new LockstepClient<TInput>(options);
}
