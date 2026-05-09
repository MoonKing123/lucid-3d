import { describe, it, expect, beforeEach } from 'vitest';
import { ClientStateSync } from '../../../src/net/client-state-sync';
import { MockNetwork, resetMockNetwork } from '../../../src/net/mock-network';
import { NetworkClient } from '../../../src/net/network-client';

beforeEach(() => {
  resetMockNetwork();
});

describe('ClientStateSync', () => {
  it('sendInput 向房间内其他节点发送 player.input', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client });

    const received: unknown[] = [];
    netServer.on('player.input', (d) => received.push(d));

    sync.sendInput({ x: 1, y: 0 });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ x: 1, y: 0 });
  });

  it('onState 在收到 player.state 时触发回调', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client });

    const received: Array<{ id: string; tick: number; state: unknown }> = [];
    sync.onState((id, tick, state) => received.push({ id, tick, state }));

    netServer.send('player.state', { id: 'e1', tick: 5, state: { x: 3, y: 0, z: 0 } });

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('e1');
    expect(received[0].tick).toBe(5);
    expect(received[0].state).toEqual({ x: 3, y: 0, z: 0 });
  });

  it('使用自定义 inputMessage 发送 input', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client, inputMessage: 'custom.input' });

    const defaultReceived: unknown[] = [];
    const customReceived: unknown[] = [];
    netServer.on('player.input', (d) => defaultReceived.push(d));
    netServer.on('custom.input', (d) => customReceived.push(d));

    sync.sendInput({ action: 'jump' });

    expect(defaultReceived).toHaveLength(0);
    expect(customReceived).toHaveLength(1);
  });

  it('使用自定义 stateMessage 接收 state', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client, stateMessage: 'custom.state' });

    const received: Array<{ tick: number }> = [];
    sync.onState((_, tick) => received.push({ tick }));

    // 默认 player.state 不应触发
    netServer.send('player.state', { id: 'e1', tick: 1, state: {} });
    // 自定义 custom.state 才触发
    netServer.send('custom.state', { id: 'e1', tick: 2, state: { x: 1 } });

    expect(received).toHaveLength(1);
    expect(received[0].tick).toBe(2);
  });

  it('多个 onState 回调都触发', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client });

    const calls1: string[] = [];
    const calls2: string[] = [];
    sync.onState((id) => calls1.push(id));
    sync.onState((id) => calls2.push(id));

    netServer.send('player.state', { id: 'e1', tick: 1, state: {} });

    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);
  });

  it('多次 sendInput 每次都发送', () => {
    const netClient = new MockNetwork();
    const netServer = new MockNetwork();
    netClient.connect('room');
    netServer.connect('room');

    const client = new NetworkClient(netClient);
    const sync = new ClientStateSync({ client });

    const received: unknown[] = [];
    netServer.on('player.input', (d) => received.push(d));

    sync.sendInput({ x: 1 });
    sync.sendInput({ x: 2 });
    sync.sendInput({ x: 3 });

    expect(received).toHaveLength(3);
  });
});
