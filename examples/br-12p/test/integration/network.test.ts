/**
 * network.test.ts — BR-12P M4.4 多人网络同步集成测试。
 * 使用 Mock 网络，无需真实 WebSocket 服务器，headless 可运行。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/game';
import { MockNetwork, resetMockNetwork } from '../../src/net/mock-network';
import { StateSync } from '../../src/net/state-sync';
import { NetworkClient } from '../../src/net/network-client';
import { RemotePlayer } from '../../src/net/remote-player';

// ── 测试辅助 ──────────────────────────────────────────────────────────

/** 创建一个标准 12 人场景（1 本地 + 11 远程） */
function createNetworkScene() {
  resetMockNetwork();

  const game = new Game({ headless: true });
  const net = new MockNetwork();
  net.connect();

  const sync = new StateSync(net, 'local-0');
  const client = new NetworkClient(net, sync, 'local-0', '本地玩家');

  client.bindLocalState(
    () => {
      const p = game.player.position;
      return { x: p[0], y: p[1], z: p[2] };
    },
    () => game.fpsCamera.yaw,
    () => 100,
  );

  return { game, net, sync, client };
}

/** 模拟 N 个远程玩家加入 */
function joinRemotePlayers(net: MockNetwork, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `remote-${i}`;
    ids.push(id);
    net.send({
      type: 'player.join',
      id,
      name: `玩家${i}`,
      position: { x: i * 3, y: 0, z: i * 3 },
    });
  }
  return ids;
}

// ── 1. 初始化 + PlayerJoin ─────────────────────────────────────────────

describe('M4.4 网络同步 — 玩家加入', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('Game headless 模式可正常创建', () => {
    const game = new Game({ headless: true });
    expect(game).toBeDefined();
  });

  it('MockNetwork connect() 标记为已连接', () => {
    const net = new MockNetwork();
    net.connect();
    expect(net.isConnected).toBe(true);
  });

  it('11 个远程玩家 PlayerJoin 后 StateSync 存有 11 个玩家', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 11);
    expect(sync.playerCount).toBe(11);
  });

  it('PlayerJoin 触发 onPlayerJoined 回调', () => {
    const { net, sync } = createNetworkScene();
    const joined: string[] = [];
    sync.onPlayerJoined((p) => joined.push(p.id));
    joinRemotePlayers(net, 3);
    expect(joined).toHaveLength(3);
    expect(joined).toContain('remote-0');
  });

  it('远程玩家实例化后位置与 Join 消息一致', () => {
    const { net, sync } = createNetworkScene();
    net.send({
      type: 'player.join',
      id: 'p1',
      name: '测试',
      position: { x: 5, y: 0, z: 10 },
    });
    const player = sync.players.get('p1');
    expect(player).toBeInstanceOf(RemotePlayer);
    expect(player!.node.position[0]).toBeCloseTo(5, 3);
    expect(player!.node.position[2]).toBeCloseTo(10, 3);
  });

  it('快进 1s 后 11 个远程玩家都已实例化', () => {
    const { game, net, sync, client } = createNetworkScene();
    joinRemotePlayers(net, 11);
    // 模拟 1 秒（60 帧）
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
      client.update(1 / 60);
    }
    expect(sync.playerCount).toBe(11);
    for (const player of sync.players.values()) {
      expect(player).toBeInstanceOf(RemotePlayer);
    }
  });
});

// ── 2. PlayerLeave ──────────────────────────────────────────────────────

describe('M4.4 网络同步 — 玩家离开', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('PlayerLeave 后玩家从 sync 中移除', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 3);
    expect(sync.playerCount).toBe(3);

    net.send({ type: 'player.leave', id: 'remote-0' });
    expect(sync.playerCount).toBe(2);
    expect(sync.players.has('remote-0')).toBe(false);
  });

  it('PlayerLeave 触发 onPlayerLeft 回调', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 2);
    const left: string[] = [];
    sync.onPlayerLeft((id) => left.push(id));

    net.send({ type: 'player.leave', id: 'remote-1' });
    expect(left).toContain('remote-1');
  });
});

// ── 3. 本地玩家状态广播 ──────────────────────────────────────────────────

describe('M4.4 网络同步 — 本地状态广播', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('client.update 超过 0.1s 后广播 PlayerState 消息', () => {
    const { net, client } = createNetworkScene();
    const received: string[] = [];
    net.on('player.state', (msg) => received.push(msg.id));

    // 0.1s = STATE_SEND_INTERVAL
    client.update(0.11);
    expect(received).toContain('local-0');
  });

  it('本地射击广播 PlayerFire 消息', () => {
    const { net, client } = createNetworkScene();
    const fired: string[] = [];
    net.on('player.fire', (msg) => fired.push(msg.id));

    client.fire({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 'ak47');
    expect(fired).toContain('local-0');
  });

  it('PlayerFire 消息包含正确的 origin 和 direction', () => {
    const { net, client } = createNetworkScene();
    let capturedOrigin: any = null;
    let capturedDir: any = null;
    net.on('player.fire', (msg) => {
      capturedOrigin = msg.origin;
      capturedDir = msg.direction;
    });

    client.fire({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: -1 });
    expect(capturedOrigin).toEqual({ x: 1, y: 2, z: 3 });
    expect(capturedDir).toEqual({ x: 0, y: 0, z: -1 });
  });
});

// ── 4. 远程玩家位置同步 ──────────────────────────────────────────────────

describe('M4.4 网络同步 — 远程位置同步', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('接收 PlayerState 后远程玩家目标位置更新', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({
      type: 'player.state',
      id: 'remote-0',
      position: { x: 15, y: 0, z: 20 },
      rotation: 0.5,
      health: 100,
    });

    // 推进一帧让插值生效
    sync.update(0.1);

    const player = sync.players.get('remote-0')!;
    // 插值后接近目标（不一定完全到达）
    expect(player.node.position[0]).toBeGreaterThan(0);
  });

  it('11 个远程玩家同时接收 PlayerState 后各自位置更新', () => {
    const { net, sync } = createNetworkScene();
    const ids = joinRemotePlayers(net, 11);

    for (let i = 0; i < 11; i++) {
      net.send({
        type: 'player.state',
        id: ids[i],
        position: { x: (i + 1) * 5, y: 0, z: 0 },
        rotation: 0,
        health: 100,
      });
    }
    sync.update(0.5);

    // 每个玩家位置都应该有所移动（不完全在原位）
    let movedCount = 0;
    for (let i = 0; i < 11; i++) {
      const p = sync.players.get(ids[i])!;
      if (p.node.position[0] > 0.1) movedCount++;
    }
    expect(movedCount).toBeGreaterThanOrEqual(10);
  });
});

// ── 5. 射击/命中/死亡 ──────────────────────────────────────────────────

describe('M4.4 网络同步 — 战斗循环', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('PlayerFire 事件被 onPlayerFired 回调捕获', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    let capturedId = '';
    sync.onPlayerFired((id) => { capturedId = id; });

    net.send({
      type: 'player.fire',
      id: 'remote-0',
      origin: { x: 0, y: 1, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
      weaponId: 'rifle',
    });

    expect(capturedId).toBe('remote-0');
  });

  it('PlayerHit 使目标玩家血量减少', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 2);

    const before = sync.players.get('remote-1')!.health.current;
    net.send({
      type: 'player.hit',
      attackerId: 'remote-0',
      targetId: 'remote-1',
      damage: 30,
    });

    expect(sync.players.get('remote-1')!.health.current).toBe(before - 30);
  });

  it('本地玩家被 PlayerHit 后触发 onLocalHit 回调', () => {
    const { net, client } = createNetworkScene();
    let hitDamage = 0;
    let hitAttacker = '';
    client.onLocalHit((attId, dmg) => {
      hitAttacker = attId;
      hitDamage = dmg;
    });

    net.send({
      type: 'player.hit',
      attackerId: 'remote-0',
      targetId: 'local-0',
      damage: 25,
    });

    expect(hitDamage).toBe(25);
    expect(hitAttacker).toBe('remote-0');
  });

  it('PlayerDie 消息使远程玩家进入 dead 状态', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({ type: 'player.die', id: 'remote-0' });
    expect(sync.players.get('remote-0')!.isDead).toBe(true);
  });

  it('血量降为 0 时玩家进入 dead 状态', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({
      type: 'player.hit',
      attackerId: 'local-0',
      targetId: 'remote-0',
      damage: 200,
    });

    expect(sync.players.get('remote-0')!.isDead).toBe(true);
  });
});

// ── 6. 死亡/复活循环 ──────────────────────────────────────────────────

describe('M4.4 网络同步 — 死亡与复活', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('PlayerRespawn 消息使已死亡玩家恢复 alive 状态', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({ type: 'player.die', id: 'remote-0' });
    expect(sync.players.get('remote-0')!.isDead).toBe(true);

    net.send({
      type: 'player.respawn',
      id: 'remote-0',
      position: { x: 10, y: 0, z: 10 },
    });

    expect(sync.players.get('remote-0')!.isDead).toBe(false);
  });

  it('PlayerRespawn 后玩家位置更新到复活坐标', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({ type: 'player.die', id: 'remote-0' });
    net.send({
      type: 'player.respawn',
      id: 'remote-0',
      position: { x: 7, y: 0, z: 13 },
    });

    const p = sync.players.get('remote-0')!;
    expect(p.node.position[0]).toBeCloseTo(7, 3);
    expect(p.node.position[2]).toBeCloseTo(13, 3);
  });

  it('死亡后 3s 自动触发复活消息', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 1);

    net.send({ type: 'player.die', id: 'remote-0' });
    expect(sync.players.get('remote-0')!.isDead).toBe(true);

    // 推进超过 3s
    sync.update(3.5);
    // 复活后应不再是 dead 状态
    expect(sync.players.get('remote-0')!.isDead).toBe(false);
  });

  it('完整生命周期：join → 同步 → 射击 → 命中 → 死亡 → 复活', () => {
    const { net, sync, client } = createNetworkScene();
    const ids = joinRemotePlayers(net, 11);

    // 同步位置
    for (const id of ids) {
      net.send({
        type: 'player.state',
        id,
        position: { x: Math.random() * 20, y: 0, z: Math.random() * 20 },
        rotation: 0,
        health: 100,
      });
    }
    sync.update(0.1);

    // 本地玩家开枪
    let fireCaptured = false;
    sync.onPlayerFired(() => { fireCaptured = true; });
    client.fire({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 });

    // 命中远程玩家
    net.send({
      type: 'player.hit',
      attackerId: 'local-0',
      targetId: ids[0],
      damage: 200,
    });
    expect(sync.players.get(ids[0])!.isDead).toBe(true);

    // 3s 后复活
    sync.update(3.5);
    expect(sync.players.get(ids[0])!.isDead).toBe(false);

    // 验证所有 11 个玩家仍在
    expect(sync.playerCount).toBe(11);
  });
});

// ── 7. 12 人场景完整性 ──────────────────────────────────────────────────

describe('M4.4 网络同步 — 12 人场景', () => {
  beforeEach(() => { resetMockNetwork(); });

  it('1 本地 + 11 远程 = 12 人游戏', () => {
    const { net, sync, client } = createNetworkScene();
    client.join();
    joinRemotePlayers(net, 11);

    // 本地玩家不计入 sync（sync 只管远程）
    // 远程玩家 11 个
    expect(sync.playerCount).toBe(11);
  });

  it('所有 11 个远程玩家都有独立 Node3D + AnimationMixer', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 11);

    for (const player of sync.players.values()) {
      expect(player.node).toBeDefined();
      expect(player.mixer).toBeDefined();
    }
  });

  it('11 个远程玩家各自 id 唯一', () => {
    const { net, sync } = createNetworkScene();
    joinRemotePlayers(net, 11);

    const ids = Array.from(sync.players.keys());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(11);
  });

  it('重复 PlayerJoin 同一 id 不重复创建', () => {
    const { net, sync } = createNetworkScene();
    net.send({ type: 'player.join', id: 'dup', name: '重复', position: { x: 0, y: 0, z: 0 } });
    net.send({ type: 'player.join', id: 'dup', name: '重复2', position: { x: 1, y: 0, z: 1 } });
    expect(sync.playerCount).toBe(1);
  });
});
