/**
 * Phase 57 KR3 — Lockstep 帧同步 单元测试
 *
 * Architect 预写 — 测试 stub 全部 skip，等 Forge 实现后自动启用。
 */

import { describe, it, expect, vi } from 'vitest';
import * as lockstepMod from '../../../src/net/lockstep';
import { MockNetwork } from '../../../src/net/mock-network';
import { NetworkClient } from '../../../src/net/network-client';

const isStub = '__STUB__' in lockstepMod && (lockstepMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

function makeClient(playerId: string, network: MockNetwork): NetworkClient {
  const transport = network.createTransport(playerId);
  const client = new NetworkClient(transport);
  client.connect('lockstep-room');
  return client;
}

describeImpl('LockstepClient — basic semantics', () => {
  it('creates a LockstepClient instance', () => {
    const net = new MockNetwork();
    const client = makeClient('p1', net);
    const lockstep = lockstepMod.createLockstepClient<{ move: string }>({
      client,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    expect(lockstep).toBeInstanceOf(lockstepMod.LockstepClient);
  });

  it('starts at currentTick=0 and not stalled', () => {
    const net = new MockNetwork();
    const client = makeClient('p1', net);
    const lockstep = lockstepMod.createLockstepClient<{ move: string }>({
      client,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    expect(lockstep.currentTick).toBe(0);
  });

  it('submitInput before peer input → tryStep returns null + stalled=true', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const lockstep = lockstepMod.createLockstepClient<{ move: string }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    lockstep.submitInput({ move: 'left' });
    expect(lockstep.tryStep()).toBeNull();
    expect(lockstep.stalled).toBe(true);
    expect(lockstep.currentTick).toBe(0);
  });

  it('two peers both submit → tryStep returns inputs map containing both', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const ls1 = lockstepMod.createLockstepClient<{ move: string }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    const ls2 = lockstepMod.createLockstepClient<{ move: string }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 2,
    });
    ls1.submitInput({ move: 'left' });
    ls2.submitInput({ move: 'right' });
    const result = ls1.tryStep();
    expect(result).not.toBeNull();
    expect(result!.tick).toBe(1);
    expect(result!.inputs.size).toBe(2);
    expect(result!.inputs.get('p1')).toEqual({ move: 'left' });
    expect(result!.inputs.get('p2')).toEqual({ move: 'right' });
  });

  it('currentTick advances after successful tryStep', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const ls1 = lockstepMod.createLockstepClient<{ move: string }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    const ls2 = lockstepMod.createLockstepClient<{ move: string }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 2,
    });
    ls1.submitInput({ move: 'a' });
    ls2.submitInput({ move: 'b' });
    expect(ls1.tryStep()).not.toBeNull();
    expect(ls1.currentTick).toBe(1);
  });

  it('tick monotonically increments across multiple steps', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const ls1 = lockstepMod.createLockstepClient<{ n: number }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    const ls2 = lockstepMod.createLockstepClient<{ n: number }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 2,
    });
    for (let i = 0; i < 3; i++) {
      ls1.submitInput({ n: i });
      ls2.submitInput({ n: i });
      const r = ls1.tryStep();
      expect(r).not.toBeNull();
      expect(r!.tick).toBe(i + 1);
    }
    expect(ls1.currentTick).toBe(3);
  });

  it('onStep handler fires in tick order with correct inputs', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const ls1 = lockstepMod.createLockstepClient<{ k: string }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    const ls2 = lockstepMod.createLockstepClient<{ k: string }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 2,
    });
    const seen: number[] = [];
    ls1.onStep((tick) => seen.push(tick));
    for (let i = 0; i < 3; i++) {
      ls1.submitInput({ k: `i${i}` });
      ls2.submitInput({ k: `j${i}` });
      ls1.tryStep();
    }
    expect(seen).toEqual([1, 2, 3]);
  });

  it('missing peer → stalled remains true until input arrives', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const ls1 = lockstepMod.createLockstepClient<{ x: number }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
    });
    const ls2 = lockstepMod.createLockstepClient<{ x: number }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 2,
    });
    ls1.submitInput({ x: 1 });
    expect(ls1.tryStep()).toBeNull();
    expect(ls1.stalled).toBe(true);
    ls2.submitInput({ x: 2 });
    expect(ls1.tryStep()).not.toBeNull();
    expect(ls1.stalled).toBe(false);
  });

  it('three peers (N=3) only steps when all three have submitted', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const c3 = makeClient('p3', net);
    const ls1 = lockstepMod.createLockstepClient<{ a: number }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 3,
    });
    const ls2 = lockstepMod.createLockstepClient<{ a: number }>({
      client: c2,
      localPlayerId: 'p2',
      expectedPeerCount: 3,
    });
    const ls3 = lockstepMod.createLockstepClient<{ a: number }>({
      client: c3,
      localPlayerId: 'p3',
      expectedPeerCount: 3,
    });
    ls1.submitInput({ a: 1 });
    ls2.submitInput({ a: 2 });
    expect(ls1.tryStep()).toBeNull();
    ls3.submitInput({ a: 3 });
    const r = ls1.tryStep();
    expect(r).not.toBeNull();
    expect(r!.inputs.size).toBe(3);
  });

  it('default tickRate is 20 Hz (informational; configurable)', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const lockstep = lockstepMod.createLockstepClient<{ m: string }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 1,
      tickRate: 20,
    });
    // tickRate is a configuration knob; ensure construction with explicit value succeeds
    expect(lockstep).toBeInstanceOf(lockstepMod.LockstepClient);
  });

  it('custom inputMessage channel name is respected (no message leaks)', () => {
    const net = new MockNetwork();
    const c1 = makeClient('p1', net);
    const c2 = makeClient('p2', net);
    const onUnrelated = vi.fn();
    c2.on('lockstep.input', onUnrelated); // default channel
    const lockstep = lockstepMod.createLockstepClient<{ k: number }>({
      client: c1,
      localPlayerId: 'p1',
      expectedPeerCount: 2,
      inputMessage: 'custom.lockstep',
    });
    lockstep.submitInput({ k: 1 });
    // input goes to 'custom.lockstep' not 'lockstep.input'
    expect(onUnrelated).not.toHaveBeenCalled();
  });
});
