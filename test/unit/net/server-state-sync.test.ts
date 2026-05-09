import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServerStateSync } from '../../../src/net/server-state-sync';
import type { GameServer } from '../../../src/net/server';

function createMockServer(initialRooms: Record<string, string[]> = {}) {
  const rooms = new Map<string, Set<string>>(
    Object.entries(initialRooms).map(([k, v]) => [k, new Set(v)])
  );
  return {
    broadcast: vi.fn(),
    rooms,
    addRoom(roomId: string, clients: string[] = []) {
      rooms.set(roomId, new Set(clients));
    },
  } as unknown as GameServer & { broadcast: ReturnType<typeof vi.fn>; addRoom: (r: string, c?: string[]) => void };
}

describe('ServerStateSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始 currentTick 为 0', () => {
    const server = createMockServer();
    const sync = new ServerStateSync({ server });
    expect(sync.currentTick).toBe(0);
  });

  it('start 后每个 tick 周期递增 currentTick', () => {
    const server = createMockServer();
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(sync.currentTick).toBe(1);
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(sync.currentTick).toBe(2);
    sync.stop();
  });

  it('stop 后不再递增 tick', () => {
    const server = createMockServer();
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(sync.currentTick).toBe(1);
    sync.stop();
    vi.advanceTimersByTime(1000);
    expect(sync.currentTick).toBe(1);
  });

  it('重复调用 start 不会启动多个 timer', () => {
    const server = createMockServer();
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.start();
    sync.start(); // 重复调用
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(sync.currentTick).toBe(1); // 只递增一次
    sync.stop();
  });

  it('setEntityState 后 tick 时广播到所有房间', () => {
    const server = createMockServer();
    server.addRoom('room1', ['c1']);
    server.addRoom('room2', ['c2']);
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.setEntityState('e1', { x: 1, y: 2, z: 3 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(server.broadcast).toHaveBeenCalledWith(
      'room1', 'player.state', expect.objectContaining({ id: 'e1', tick: 1 })
    );
    expect(server.broadcast).toHaveBeenCalledWith(
      'room2', 'player.state', expect.objectContaining({ id: 'e1', tick: 1 })
    );
    sync.stop();
  });

  it('第一次 tick 广播完整 state（无 prev）', () => {
    const server = createMockServer({ room1: ['c1'] });
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.setEntityState('e1', { x: 5, y: 3, z: 0 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    const arg = (server.broadcast as ReturnType<typeof vi.fn>).mock.calls[0][2] as { state: unknown };
    expect(arg.state).toEqual({ x: 5, y: 3, z: 0 });
    sync.stop();
  });

  it('第二次 tick 广播 delta（只有变化字段）', () => {
    const server = createMockServer({ room1: ['c1'] });
    const sync = new ServerStateSync<{ x: number; y: number; z: number }>({ server, tickRate: 30 });
    sync.setEntityState('e1', { x: 0, y: 0, z: 0 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 1: 完整 state
    sync.setEntityState('e1', { x: 5, y: 0, z: 0 }); // 仅 x 变化
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 2: delta
    const calls = (server.broadcast as ReturnType<typeof vi.fn>).mock.calls;
    const tick2Arg = calls[calls.length - 1][2] as { state: Partial<{ x: number; y: number; z: number }> };
    expect(tick2Arg.state).toEqual({ x: 5 });
    sync.stop();
  });

  it('state 无变化时广播空 delta', () => {
    const server = createMockServer({ r: ['c1'] });
    const sync = new ServerStateSync<{ x: number }>({ server, tickRate: 30 });
    sync.setEntityState('e1', { x: 1 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 1
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 2: 无变化
    const calls = (server.broadcast as ReturnType<typeof vi.fn>).mock.calls;
    const tick2Arg = calls[calls.length - 1][2] as { state: unknown };
    expect(tick2Arg.state).toEqual({});
    sync.stop();
  });

  it('广播消息包含 tick 字段单调递增', () => {
    const server = createMockServer({ r: ['c1'] });
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.setEntityState('e1', { v: 1 });
    sync.start();
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(Math.ceil(1000 / 30));
    }
    const calls = (server.broadcast as ReturnType<typeof vi.fn>).mock.calls;
    const ticks = calls.map(c => (c[2] as { tick: number }).tick);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    }
    sync.stop();
  });

  it('支持自定义 computeDelta', () => {
    const server = createMockServer({ r: ['c1'] });
    const customDelta = vi.fn((_prev: { x: number }, next: { x: number }) => ({ x: next.x * 2 }));
    const sync = new ServerStateSync<{ x: number }>({ server, tickRate: 30, computeDelta: customDelta });
    sync.setEntityState('e1', { x: 1 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 1: 无 prev，不调用 computeDelta
    sync.setEntityState('e1', { x: 2 });
    vi.advanceTimersByTime(Math.ceil(1000 / 30)); // tick 2: 调用 computeDelta
    expect(customDelta).toHaveBeenCalled();
    const calls = (server.broadcast as ReturnType<typeof vi.fn>).mock.calls;
    const lastArg = calls[calls.length - 1][2] as { state: { x: number } };
    expect(lastArg.state.x).toBe(4); // 自定义 delta: x * 2
    sync.stop();
  });

  it('无 entity 时不广播', () => {
    const server = createMockServer({ r: ['c1'] });
    const sync = new ServerStateSync({ server, tickRate: 30 });
    sync.start();
    vi.advanceTimersByTime(Math.ceil(1000 / 30));
    expect(server.broadcast).not.toHaveBeenCalled();
    sync.stop();
  });
});
