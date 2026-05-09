/**
 * Phase 57 KR3 — Lockstep 集成测试
 *
 * 起 GameServer 做 input relay，验证多客户端锁步同步行为。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameServer } from '../../../src/net/server';
import { WebSocketTransport } from '../../../src/net/websocket-transport';
import { NetworkClient } from '../../../src/net/network-client';
import { createLockstepClient } from '../../../src/net/lockstep';

const PORT = 18975;
const BASE_URL = `ws://localhost:${PORT}`;

function waitForConnected(transport: WebSocketTransport, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (transport.connected) { resolve(); return; }
      if (Date.now() - start > timeout) { reject(new Error('连接超时')); return; }
      setTimeout(check, 10);
    };
    check();
  });
}

function pollUntil(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) { resolve(); return; }
      if (Date.now() - start > timeout) { reject(new Error('轮询超时')); return; }
      setTimeout(check, 20);
    };
    check();
  });
}

describe('LockstepClient 集成测试 — GameServer input relay', { timeout: 15000 }, () => {
  let server: GameServer;

  beforeAll(async () => {
    server = new GameServer({ port: PORT });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('三客户端同时 submitInput → 三方都收到 step 触发', async () => {
    const tA = new WebSocketTransport({ url: BASE_URL, reconnect: false });
    const tB = new WebSocketTransport({ url: BASE_URL, reconnect: false });
    const tC = new WebSocketTransport({ url: BASE_URL, reconnect: false });

    const cA = new NetworkClient(tA);
    const cB = new NetworkClient(tB);
    const cC = new NetworkClient(tC);

    cA.connect('room-all-three');
    cB.connect('room-all-three');
    cC.connect('room-all-three');

    await Promise.all([waitForConnected(tA), waitForConnected(tB), waitForConnected(tC)]);

    const lsA = createLockstepClient<{ n: number }>({
      client: cA, localPlayerId: 'pA', expectedPeerCount: 3,
    });
    const lsB = createLockstepClient<{ n: number }>({
      client: cB, localPlayerId: 'pB', expectedPeerCount: 3,
    });
    const lsC = createLockstepClient<{ n: number }>({
      client: cC, localPlayerId: 'pC', expectedPeerCount: 3,
    });

    let aOk = false, bOk = false, cOk = false;
    lsA.onStep(() => { aOk = true; });
    lsB.onStep(() => { bOk = true; });
    lsC.onStep(() => { cOk = true; });

    lsA.submitInput({ n: 1 });
    lsB.submitInput({ n: 2 });
    lsC.submitInput({ n: 3 });

    await pollUntil(() => {
      if (!aOk) lsA.tryStep();
      if (!bOk) lsB.tryStep();
      if (!cOk) lsC.tryStep();
      return aOk && bOk && cOk;
    });

    expect(lsA.currentTick).toBe(1);
    expect(lsB.currentTick).toBe(1);
    expect(lsC.currentTick).toBe(1);

    tA.disconnect();
    tB.disconnect();
    tC.disconnect();
  });

  it('客户端 A 延迟 200ms submitInput → 其他客户端 stall → 收到后恢复', async () => {
    const tA = new WebSocketTransport({ url: BASE_URL, reconnect: false });
    const tB = new WebSocketTransport({ url: BASE_URL, reconnect: false });
    const tC = new WebSocketTransport({ url: BASE_URL, reconnect: false });

    const cA = new NetworkClient(tA);
    const cB = new NetworkClient(tB);
    const cC = new NetworkClient(tC);

    cA.connect('room-stall-test');
    cB.connect('room-stall-test');
    cC.connect('room-stall-test');

    await Promise.all([waitForConnected(tA), waitForConnected(tB), waitForConnected(tC)]);

    const lsA = createLockstepClient<{ x: number }>({
      client: cA, localPlayerId: 'pA', expectedPeerCount: 3,
    });
    const lsB = createLockstepClient<{ x: number }>({
      client: cB, localPlayerId: 'pB', expectedPeerCount: 3,
    });
    const lsC = createLockstepClient<{ x: number }>({
      client: cC, localPlayerId: 'pC', expectedPeerCount: 3,
    });

    // B 和 C 提交，A 故意延迟
    lsB.submitInput({ x: 2 });
    lsC.submitInput({ x: 3 });

    // 等待 B 和 C 彼此收到对方的 input（网络传递）
    await new Promise((r) => setTimeout(r, 200));

    // B 和 C 应该 stall（等待 A）
    expect(lsB.tryStep()).toBeNull();
    expect(lsB.stalled).toBe(true);
    expect(lsC.tryStep()).toBeNull();
    expect(lsC.stalled).toBe(true);

    // A 延迟后提交
    lsA.submitInput({ x: 1 });

    // 等待 B 和 C 收到 A 的 input 并恢复
    let bOk = false, cOk = false;
    lsB.onStep(() => { bOk = true; });
    lsC.onStep(() => { cOk = true; });

    await pollUntil(() => {
      if (!bOk) lsB.tryStep();
      if (!cOk) lsC.tryStep();
      return bOk && cOk;
    });

    expect(lsB.stalled).toBe(false);
    expect(lsC.stalled).toBe(false);

    tA.disconnect();
    tB.disconnect();
    tC.disconnect();
  });
});
