import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameServer } from '../../../src/net/server';
import { WebSocketTransport } from '../../../src/net/websocket-transport';

const PORT = 18974;

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

describe('GameServer 消息回路', { timeout: 10000 }, () => {
  let server: GameServer;

  beforeAll(async () => {
    server = new GameServer({ port: PORT });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('clientA 发消息，clientB 收到', async () => {
    const clientA = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const clientB = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });

    clientA.connect('test-room');
    clientB.connect('test-room');

    await Promise.all([waitForConnected(clientA), waitForConnected(clientB)]);

    const received: unknown[] = [];
    clientB.on('chat', (data) => received.push(data));

    clientA.send('chat', { text: 'hello from A' });

    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 3000;
      const poll = () => {
        if (received.length > 0) { resolve(); return; }
        if (Date.now() > deadline) { reject(new Error('消息未收到')); return; }
        setTimeout(poll, 20);
      };
      poll();
    });

    expect(received).toEqual([{ text: 'hello from A' }]);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('clientA 的消息不会反射回自己', async () => {
    const clientA = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const clientB = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });

    clientA.connect('solo-room');
    clientB.connect('solo-room');

    await Promise.all([waitForConnected(clientA), waitForConnected(clientB)]);

    const selfReceived: unknown[] = [];
    clientA.on('ping', (d) => selfReceived.push(d));

    clientA.send('ping', { n: 1 });

    await new Promise((r) => setTimeout(r, 200));

    expect(selfReceived.length).toBe(0);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('不同房间消息隔离', async () => {
    const clientA = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    const clientC = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });

    clientA.connect('room-alpha');
    clientC.connect('room-beta');

    await Promise.all([waitForConnected(clientA), waitForConnected(clientC)]);

    const cReceived: unknown[] = [];
    clientC.on('msg', (d) => cReceived.push(d));

    clientA.send('msg', { secret: 42 });

    await new Promise((r) => setTimeout(r, 200));

    expect(cReceived.length).toBe(0);

    clientA.disconnect();
    clientC.disconnect();
  });

  it('server.clientCount 统计连接数', async () => {
    await new Promise((r) => setTimeout(r, 200)); // 等前序测试连接关闭
    const before = server.clientCount;
    const t = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    t.connect('count-room');
    await waitForConnected(t);
    expect(server.clientCount).toBe(before + 1);
    t.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    expect(server.clientCount).toBe(before);
  });

  it('onClientJoin / onClientLeave 回调', async () => {
    const joins: string[] = [];
    const leaves: string[] = [];
    server.onClientJoin((id) => joins.push(id));
    server.onClientLeave((id) => leaves.push(id));

    const t = new WebSocketTransport({ url: `ws://localhost:${PORT}`, reconnect: false });
    t.connect('cb-room');
    await waitForConnected(t);
    expect(joins.length).toBeGreaterThan(0);

    t.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    expect(leaves.length).toBeGreaterThan(0);
  });
});
