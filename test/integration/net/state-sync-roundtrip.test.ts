import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameServer } from '../../../src/net/server';
import { WebSocketTransport } from '../../../src/net/websocket-transport';
import { NetworkClient } from '../../../src/net/network-client';
import { ClientStateSync } from '../../../src/net/client-state-sync';
import { ServerStateSync } from '../../../src/net/server-state-sync';

const PORT = 18975;

function waitForCondition(check: () => boolean, timeout = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (check()) { resolve(); return; }
      if (Date.now() - start > timeout) { reject(new Error('等待超时')); return; }
      setTimeout(poll, 20);
    };
    poll();
  });
}

function waitForConnected(transport: WebSocketTransport): Promise<void> {
  return waitForCondition(() => transport.connected);
}

describe('State Sync 全链路', { timeout: 20000 }, () => {
  let server: GameServer;
  let serverSync: ServerStateSync<{ x: number; y: number; z: number }>;

  beforeAll(async () => {
    server = new GameServer({ port: PORT });
    await server.start();

    serverSync = new ServerStateSync({ server, tickRate: 30 });

    // 将客户端 input 映射为服务器权威 entity state
    server.onMessage((clientId, type, data) => {
      if (type === 'player.input') {
        const input = data as { x: number; y: number; z: number };
        serverSync.setEntityState(clientId, input);
      }
    });

    serverSync.start();
  });

  afterAll(async () => {
    serverSync.stop();
    await server.stop();
  });

  it('客户端 A 发 input，服务器更新，客户端 B 收到 state delta', async () => {
    const transportA = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const transportB = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });

    const clientA = new NetworkClient(transportA);
    const clientB = new NetworkClient(transportB);

    transportA.connect('game-room');
    transportB.connect('game-room');
    await Promise.all([waitForConnected(transportA), waitForConnected(transportB)]);

    const syncA = new ClientStateSync<{ x: number; y: number; z: number }, unknown>({ client: clientA });
    const syncB = new ClientStateSync<unknown, { x: number; y: number; z: number }>({ client: clientB });

    const bReceived: Array<{ id: string; tick: number; state: unknown }> = [];
    syncB.onState((id, tick, state) => bReceived.push({ id, tick, state }));

    // 等连接稳定后发送 input
    await new Promise(r => setTimeout(r, 100));
    syncA.sendInput({ x: 10, y: 0, z: 0 });

    // 等服务器处理 input 并广播 tick
    await waitForCondition(() => bReceived.length > 0, 4000);

    expect(bReceived.length).toBeGreaterThan(0);

    // 找到包含 x=10 的状态消息
    const match = bReceived.find(r => (r.state as { x?: number }).x === 10);
    expect(match).toBeDefined();
    expect(match!.tick).toBeGreaterThan(0);

    transportA.disconnect();
    transportB.disconnect();
  });

  it('tick 字段对同一 entity 单调递增', async () => {
    const transport = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const client = new NetworkClient(transport);
    transport.connect('tick-room');
    await waitForConnected(transport);

    const sync = new ClientStateSync({ client });

    // 设置一个持续广播的 entity
    serverSync.setEntityState('monotonic-entity', { x: 0, y: 0, z: 0 });

    const ticksForEntity: number[] = [];
    sync.onState((id, tick) => {
      if (id === 'monotonic-entity') ticksForEntity.push(tick);
    });

    await waitForCondition(() => ticksForEntity.length >= 3, 4000);

    for (let i = 1; i < ticksForEntity.length; i++) {
      expect(ticksForEntity[i]).toBeGreaterThan(ticksForEntity[i - 1]);
    }

    transport.disconnect();
  });

  it('2 个客户端同时接收同一 entity 的广播', async () => {
    const tA = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const tB = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const cA = new NetworkClient(tA);
    const cB = new NetworkClient(tB);

    tA.connect('shared-room');
    tB.connect('shared-room');
    await Promise.all([waitForConnected(tA), waitForConnected(tB)]);

    const syncA2 = new ClientStateSync({ client: cA });
    const syncB2 = new ClientStateSync({ client: cB });

    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];
    syncA2.onState((id) => { if (id === 'shared-entity') receivedA.push(id); });
    syncB2.onState((id) => { if (id === 'shared-entity') receivedB.push(id); });

    serverSync.setEntityState('shared-entity', { x: 5, y: 5, z: 5 });

    await waitForCondition(() => receivedA.length > 0 && receivedB.length > 0, 4000);

    expect(receivedA.length).toBeGreaterThan(0);
    expect(receivedB.length).toBeGreaterThan(0);

    tA.disconnect();
    tB.disconnect();
  });
});
