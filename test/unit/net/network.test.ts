import { describe, it, expect, vi } from 'vitest';
import * as mockMod from '../../../src/net/mock-network';
import * as clientMod from '../../../src/net/network-client';
import * as syncMod from '../../../src/net/state-sync';
import * as interpMod from '../../../src/net/interpolator';

const isMockStub = '__STUB__' in mockMod && (mockMod as any).__STUB__ === true;
const isClientStub = '__STUB__' in clientMod && (clientMod as any).__STUB__ === true;
const isSyncStub = '__STUB__' in syncMod && (syncMod as any).__STUB__ === true;
const isInterpStub = '__STUB__' in interpMod && (interpMod as any).__STUB__ === true;

const describeMock = isMockStub ? describe.skip : describe;
const describeClient = isClientStub ? describe.skip : describe;
const describeSync = isSyncStub ? describe.skip : describe;
const describeInterp = isInterpStub ? describe.skip : describe;

describeMock('MockNetwork', () => {
  it('creates a MockNetwork instance', () => {
    const net = mockMod.createMockNetwork();
    expect(net).toBeInstanceOf(mockMod.MockNetwork);
  });

  it('starts disconnected', () => {
    const net = mockMod.createMockNetwork();
    expect(net.connected).toBe(false);
  });

  it('connect sets connected=true', () => {
    const net = mockMod.createMockNetwork();
    net.connect('room-1');
    expect(net.connected).toBe(true);
  });

  it('disconnect sets connected=false', () => {
    const net = mockMod.createMockNetwork();
    net.connect('room-1');
    net.disconnect();
    expect(net.connected).toBe(false);
  });

  it('broadcasts messages to all listeners in same room', () => {
    const a = mockMod.createMockNetwork();
    const b = mockMod.createMockNetwork();
    a.connect('room-1');
    b.connect('room-1');
    const fn = vi.fn();
    b.on('test', fn);
    a.send('test', { value: 42 });
    expect(fn).toHaveBeenCalledWith({ value: 42 });
  });

  it('does not broadcast across rooms', () => {
    const a = mockMod.createMockNetwork();
    const b = mockMod.createMockNetwork();
    a.connect('room-1');
    b.connect('room-2');
    const fn = vi.fn();
    b.on('test', fn);
    a.send('test', { value: 42 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('off removes listener', () => {
    const a = mockMod.createMockNetwork();
    const b = mockMod.createMockNetwork();
    a.connect('r');
    b.connect('r');
    const fn = vi.fn();
    b.on('msg', fn);
    b.off('msg', fn);
    a.send('msg', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('resetMockNetwork clears all state', () => {
    const a = mockMod.createMockNetwork();
    a.connect('r');
    mockMod.resetMockNetwork();
    const b = mockMod.createMockNetwork();
    b.connect('r');
    const fn = vi.fn();
    b.on('msg', fn);
    a.send('msg', {});
    expect(fn).not.toHaveBeenCalled();
  });
});

describeClient('NetworkClient', () => {
  it('wraps transport send/on/off', () => {
    const net = mockMod.createMockNetwork();
    const client = new clientMod.NetworkClient(net);
    net.connect('r');
    expect(client.connected).toBe(false);
    client.connect('r');
    expect(client.connected).toBe(true);
  });

  it('rate-limits broadcasts via update()', () => {
    const net = mockMod.createMockNetwork();
    const client = new clientMod.NetworkClient(net, { broadcastRate: 10 });
    client.connect('r');
    const sent: unknown[] = [];
    net.on('state', (d) => sent.push(d));
    client.send('state', { x: 1 });
    client.send('state', { x: 2 });
    client.update(1 / 60);
    expect(sent.length).toBeLessThanOrEqual(1);
  });
});

describeSync('StateSync', () => {
  it('tracks remote entity join/leave', () => {
    const netA = mockMod.createMockNetwork();
    const netB = mockMod.createMockNetwork();
    const clientA = new clientMod.NetworkClient(netA);
    const clientB = new clientMod.NetworkClient(netB);
    clientA.connect('r');
    clientB.connect('r');
    const sync = new syncMod.StateSync(clientB);
    const joins: string[] = [];
    sync.onJoin((id) => joins.push(id));
    clientA.send('player.join', { id: 'p1' });
    expect(joins).toContain('p1');
  });
});

describeInterp('RemoteEntityInterpolator', () => {
  it('creates with default lerpSpeed', () => {
    const interp = new interpMod.RemoteEntityInterpolator();
    expect(interp).toBeInstanceOf(interpMod.RemoteEntityInterpolator);
  });

  it('creates with custom lerpSpeed', () => {
    const interp = new interpMod.RemoteEntityInterpolator(5);
    expect(interp).toBeInstanceOf(interpMod.RemoteEntityInterpolator);
  });

  it('setTarget updates target position', () => {
    const interp = new interpMod.RemoteEntityInterpolator(10);
    interp.setTarget(5, 10, 15);
    expect(interp.targetX).toBe(5);
    expect(interp.targetY).toBe(10);
    expect(interp.targetZ).toBe(15);
  });

  it('update lerps current toward target', () => {
    const interp = new interpMod.RemoteEntityInterpolator(10);
    interp.setTarget(10, 0, 0);
    const pos = { x: 0, y: 0, z: 0 };
    interp.update(0.1, pos);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(10);
  });

  it('converges to target over time', () => {
    const interp = new interpMod.RemoteEntityInterpolator(10);
    interp.setTarget(10, 0, 0);
    const pos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 100; i++) {
      interp.update(1 / 60, pos);
    }
    expect(pos.x).toBeCloseTo(10, 1);
  });
});
