/**
 * Phase 57 KR3 — Lockstep 帧同步
 *
 * 确定性帧同步客户端 — 每 tick 广播本地 input，收齐所有 peer 的同 tick input 后推进 simulation。
 * 适合 RTS / 格斗 / 棋牌（peer-to-peer 无需服务器权威）。
 *
 * STUB — 本文件为 Architect 预写占位，等 Forge 实现。
 */

export const __STUB__ = true;

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

export class LockstepClient<TInput = unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options: LockstepClientOptions<TInput>) {
    throw new Error('LockstepClient not implemented (stub)');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitInput(_input: TInput): void {
    throw new Error('Not implemented (stub)');
  }

  tryStep(): LockstepStepResult<TInput> | null {
    throw new Error('Not implemented (stub)');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStep(_handler: (tick: number, inputs: ReadonlyMap<string, TInput>) => void): void {
    throw new Error('Not implemented (stub)');
  }

  get currentTick(): number {
    throw new Error('Not implemented (stub)');
  }

  get stalled(): boolean {
    throw new Error('Not implemented (stub)');
  }
}

export function createLockstepClient<TInput>(
  options: LockstepClientOptions<TInput>,
): LockstepClient<TInput> {
  return new LockstepClient<TInput>(options);
}
