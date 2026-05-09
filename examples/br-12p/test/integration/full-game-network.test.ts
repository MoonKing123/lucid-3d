/**
 * full-game-network.test.ts — M7 KR4 真 WebSocket 12 客户端 30s 压测。
 *
 * 验收目标：
 * - 12 客户端（1 本地 Game + 11 原始 WS）连接同一 Room
 * - 1800 帧（30s @ 60fps）无崩溃无异常
 * - drawCalls ≤ 60（vs M4.6 基线不退化）
 * - 至少 1 远程玩家死亡消息经服务器广播验证
 * - 11 个 RemotePlayer mixer.time ≈ 30s
 * - 断开后 server.clientCount === 0（无连接泄漏）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameServer } from '../../../../src/net/server';
import { WsGameNetwork } from '../../src/net/ws-game-network';
import { StateSync } from '../../src/net/state-sync';
import { NetworkClient } from '../../src/net/network-client';
import { Game } from '../../src/game';
import { HUDManager } from '../../src/ui/hud-manager';
import type { NetworkMessage } from '../../src/net/message-protocol';

// ── 常量 ─────────────────────────────────────────────────────────────────

const PORT = 19080;
const ROOM = 'br-12p';
const WS_URL = `ws://localhost:${PORT}`;
const DT = 1 / 60;
const TOTAL_FRAMES = 1800; // 30s @ 60fps

// ── 工具函数 ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function waitConnected(net: WsGameNetwork, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const check = () => {
      if (net.isConnected) { resolve(); return; }
      if (Date.now() - t0 > timeoutMs) { reject(new Error(`WsGameNetwork 连接超时 ${timeoutMs}ms`)); return; }
      setTimeout(check, 10);
    };
    check();
  });
}

function waitWsOpen(ws: WebSocket, timeoutMs = 5000): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error('WebSocket 连接超时')), timeoutMs);
    ws.onopen = () => { clearTimeout(tid); resolve(); };
    ws.onerror = () => { clearTimeout(tid); reject(new Error('WebSocket 连接错误')); };
  });
}

/** 以 { type, data } 格式发送游戏消息 */
function sendMsg(ws: WebSocket, msg: NetworkMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: msg.type, data: msg }));
  }
}

/** 创建并连接 N 个远程 WebSocket 客户端 */
async function connectRemoteClients(count: number): Promise<WebSocket[]> {
  const clients = Array.from({ length: count }, () =>
    new WebSocket(`${WS_URL}?room=${ROOM}`),
  );
  await Promise.all(clients.map(ws => waitWsOpen(ws)));
  return clients;
}

function closeAll(net: WsGameNetwork, remotes: WebSocket[]): void {
  net.disconnect();
  for (const ws of remotes) {
    if (ws.readyState !== WebSocket.CLOSED) ws.close();
  }
}

// ── 测试夹具 ─────────────────────────────────────────────────────────────

let server: GameServer;

beforeAll(async () => {
  server = new GameServer({ port: PORT });
  await server.start();
}, 10_000);

afterAll(async () => {
  await server.stop();
});

// ── 1. 服务器 + 12 客户端连接 ─────────────────────────────────────────────

describe('M7 KR4 — 服务器启动与 12 客户端连接', { timeout: 15_000 }, () => {
  it('GameServer 成功启动并接受连接', async () => {
    const ws = new WebSocket(`${WS_URL}?room=ping`);
    await waitWsOpen(ws);
    expect(server.clientCount).toBeGreaterThanOrEqual(1);
    ws.close();
    await sleep(50);
  });

  it('12 客户端（1 WsGameNetwork + 11 原始 WS）全部连接', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    const remotes = await connectRemoteClients(11);
    await waitConnected(net);

    expect(net.isConnected).toBe(true);
    expect(server.clientCount).toBeGreaterThanOrEqual(12);

    closeAll(net, remotes);
    await sleep(100);
  });
});

// ── 2. 11 远程玩家 join → StateSync 创建 RemotePlayer ────────────────────

describe('M7 KR4 — 远程玩家 Join 广播', { timeout: 15_000 }, () => {
  it('11 个 player.join 消息经服务器广播后 sync.playerCount === 11', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-join-test');
    const remotes = await connectRemoteClients(11);
    await sleep(50);

    for (let i = 0; i < 11; i++) {
      sendMsg(remotes[i], {
        type: 'player.join',
        id: `remote-j${i}`,
        name: `玩家${i}`,
        position: { x: i * 3, y: 0, z: i * 3 },
      });
    }

    await sleep(300);

    expect(sync.playerCount).toBe(11);
    for (const player of sync.players.values()) {
      expect(player.node).toBeDefined();
      expect(player.mixer).toBeDefined();
    }

    closeAll(net, remotes);
    await sleep(50);
  });

  it('11 个远程玩家各自 id 唯一', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-unique');
    const remotes = await connectRemoteClients(11);
    await sleep(100);

    for (let i = 0; i < 11; i++) {
      sendMsg(remotes[i], {
        type: 'player.join',
        id: `remote-u${i}`,
        name: `玩家${i}`,
        position: { x: 0, y: 0, z: 0 },
      });
    }
    await sleep(500); // 11 条消息并发传播需要更多时间

    const ids = [...sync.players.keys()];
    expect(new Set(ids).size).toBe(11);

    closeAll(net, remotes);
    await sleep(50);
  });
});

// ── 3. 远程玩家 die 消息经服务器广播验证 ─────────────────────────────────

describe('M7 KR4 — 死亡消息广播', { timeout: 15_000 }, () => {
  it('remote-0 发送 player.die → 本地 StateSync 标记死亡', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-die-test');
    const remotes = await connectRemoteClients(1);
    await sleep(50);

    sendMsg(remotes[0], {
      type: 'player.join',
      id: 'remote-die-p',
      name: '死亡测试',
      position: { x: 0, y: 0, z: 0 },
    });
    await sleep(150);

    expect(sync.players.has('remote-die-p')).toBe(true);
    expect(sync.players.get('remote-die-p')!.isDead).toBe(false);

    sendMsg(remotes[0], { type: 'player.die', id: 'remote-die-p' });
    await sleep(200);

    expect(sync.players.get('remote-die-p')!.isDead).toBe(true);

    closeAll(net, remotes);
    await sleep(50);
  });

  it('player.hit → 目标血量降低', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-hit-test');
    const remotes = await connectRemoteClients(2);
    await sleep(50);

    for (let i = 0; i < 2; i++) {
      sendMsg(remotes[i], {
        type: 'player.join',
        id: `remote-hit-${i}`,
        name: `命中玩家${i}`,
        position: { x: 0, y: 0, z: 0 },
      });
    }
    await sleep(150);

    const hp0 = sync.players.get('remote-hit-1')!.health.current;

    sendMsg(remotes[0], {
      type: 'player.hit',
      attackerId: 'remote-hit-0',
      targetId: 'remote-hit-1',
      damage: 30,
    });
    await sleep(150);

    expect(sync.players.get('remote-hit-1')!.health.current).toBe(hp0 - 30);

    closeAll(net, remotes);
    await sleep(50);
  });
});

// ── 4. 1800 帧全量压测 ────────────────────────────────────────────────────

describe('M7 KR4 — 1800 帧全量压测', { timeout: 60_000 }, () => {
  it('1800 帧无崩溃 + drawCalls ≤ 60', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    const sync = new StateSync(net, 'local-perf');
    const client = new NetworkClient(net, sync, 'local-perf', '本地玩家');
    client.bindLocalState(
      () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
      () => game.fpsCamera.yaw,
      () => game.playerHealth.current,
    );

    const remotes = await connectRemoteClients(11);
    await sleep(50);

    for (let i = 0; i < 11; i++) {
      sendMsg(remotes[i], {
        type: 'player.join',
        id: `remote-perf-${i}`,
        name: `玩家${i}`,
        position: { x: (i - 5) * 5, y: 0, z: (i - 5) * 5 },
      });
    }
    await sleep(200);

    expect(sync.playerCount).toBe(11);

    const initialDrawCalls = game.drawCallCount;

    expect(() => {
      for (let f = 0; f < TOTAL_FRAMES; f++) {
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    }).not.toThrow();

    expect(game.frameCount).toBe(TOTAL_FRAMES);
    expect(game.drawCallCount).toBeLessThanOrEqual(60);
    // drawCalls 不单调递增（±5 允许波动）
    expect(game.drawCallCount).toBeLessThanOrEqual(initialDrawCalls + 5);

    closeAll(net, remotes);
    await sleep(50);
  });

  it('1800 帧无 console.error 输出', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    const sync = new StateSync(net, 'local-noerr');
    const client = new NetworkClient(net, sync, 'local-noerr', '本地');
    client.bindLocalState(
      () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
      () => 0,
      () => 100,
    );

    const errors: string[] = [];
    const orig = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(' '));

    try {
      for (let f = 0; f < TOTAL_FRAMES; f++) {
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    } finally {
      console.error = orig;
    }

    expect(errors).toEqual([]);
    net.disconnect();
    await sleep(50);
  });

  it('1800 帧 headless 执行时间 < 15 秒', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const game = new Game({ headless: true });
    const hud = new HUDManager(game, 800, 600);
    const sync = new StateSync(net, 'local-timing');
    const client = new NetworkClient(net, sync, 'local-timing', '计时');
    client.bindLocalState(
      () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
      () => 0,
      () => 100,
    );

    const t0 = Date.now();
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }
    expect(Date.now() - t0).toBeLessThan(15_000);

    net.disconnect();
    await sleep(50);
  });
});

// ── 5. mixer.time ≈ 30s 验证 ─────────────────────────────────────────────

describe('M7 KR4 — AnimationMixer 时间累积', { timeout: 30_000 }, () => {
  it('11 个 RemotePlayer 经 1800 帧后 mixer.time ≈ 30s', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-mixer');
    const client = new NetworkClient(net, sync, 'local-mixer', '计时测试');
    client.bindLocalState(() => ({ x: 0, y: 0, z: 0 }), () => 0, () => 100);

    const remotes = await connectRemoteClients(11);
    await sleep(50);

    for (let i = 0; i < 11; i++) {
      sendMsg(remotes[i], {
        type: 'player.join',
        id: `p-mixer-${i}`,
        name: `MixerPlayer${i}`,
        position: { x: i * 2, y: 0, z: 0 },
      });
    }
    await sleep(500);

    expect(sync.playerCount).toBe(11);

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      client.update(DT);
    }

    for (const player of sync.players.values()) {
      // idle 动画 duration=0，时间线性累积至 ~30s
      expect(player.mixer.time).toBeCloseTo(30, 0);
    }

    closeAll(net, remotes);
    await sleep(50);
  });
});

// ── 6. 状态广播 + 位置插值验证 ────────────────────────────────────────────

describe('M7 KR4 — 状态广播与位置插值', { timeout: 30_000 }, () => {
  it('远程玩家发送 player.state → 本地 RemotePlayer 位置趋近目标', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-interp');
    const client = new NetworkClient(net, sync, 'local-interp', '插值测试');
    client.bindLocalState(() => ({ x: 0, y: 0, z: 0 }), () => 0, () => 100);

    const remotes = await connectRemoteClients(1);
    await sleep(50);

    sendMsg(remotes[0], {
      type: 'player.join',
      id: 'remote-interp',
      name: '插值玩家',
      position: { x: 0, y: 0, z: 0 },
    });
    await sleep(100);

    sendMsg(remotes[0], {
      type: 'player.state',
      id: 'remote-interp',
      position: { x: 50, y: 0, z: 50 },
      rotation: 0,
      health: 100,
    });
    await sleep(100);

    for (let f = 0; f < 120; f++) {
      client.update(DT);
    }

    const player = sync.players.get('remote-interp')!;
    expect(player.node.position[0]).toBeGreaterThan(40);
    expect(player.node.position[2]).toBeGreaterThan(40);

    closeAll(net, remotes);
    await sleep(50);
  });

  it('player.respawn 消息使死亡玩家复活', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const sync = new StateSync(net, 'local-respawn');
    const client = new NetworkClient(net, sync, 'local-respawn', '复活测试');
    client.bindLocalState(() => ({ x: 0, y: 0, z: 0 }), () => 0, () => 100);

    const remotes = await connectRemoteClients(1);
    await sleep(50);

    sendMsg(remotes[0], {
      type: 'player.join',
      id: 'remote-resp',
      name: '复活玩家',
      position: { x: 0, y: 0, z: 0 },
    });
    await sleep(100);

    sendMsg(remotes[0], { type: 'player.die', id: 'remote-resp' });
    await sleep(150);
    expect(sync.players.get('remote-resp')!.isDead).toBe(true);

    sendMsg(remotes[0], {
      type: 'player.respawn',
      id: 'remote-resp',
      position: { x: 10, y: 0, z: 10 },
    });
    await sleep(150);
    expect(sync.players.get('remote-resp')!.isDead).toBe(false);

    closeAll(net, remotes);
    await sleep(50);
  });
});

// ── 7. 无连接泄漏 ─────────────────────────────────────────────────────────

describe('M7 KR4 — 连接清理（无泄漏）', { timeout: 15_000 }, () => {
  it('客户端断开后 server.clientCount 归零', async () => {
    await sleep(300); // 等上一组测试的连接全部关闭

    const countBefore = server.clientCount;

    const net = new WsGameNetwork(WS_URL);
    net.connect();
    const remotes = await connectRemoteClients(11);
    await waitConnected(net);
    await sleep(50);

    expect(server.clientCount).toBeGreaterThanOrEqual(countBefore + 12);

    closeAll(net, remotes);
    await sleep(300);

    expect(server.clientCount).toBe(countBefore);
  });

  it('玩家位置 1800 帧后无 NaN', async () => {
    const net = new WsGameNetwork(WS_URL);
    net.connect();
    await waitConnected(net);

    const game = new Game({ headless: true });
    const sync = new StateSync(net, 'local-nan');
    const client = new NetworkClient(net, sync, 'local-nan', 'NaN测试');
    client.bindLocalState(
      () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
      () => game.fpsCamera.yaw,
      () => game.playerHealth.current,
    );

    game.simulateKey('w');
    game.simulateKey('a');

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      game.update(DT);
      client.update(DT);
    }

    const pos = game.player.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);

    net.disconnect();
    await sleep(50);
  });
});
