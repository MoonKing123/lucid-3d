/**
 * full-game.test.ts — M4.6 端到端压力测试。
 * headless 30 秒 / 1800 帧全游戏循环验证。
 *
 * 验证目标：
 * - 1800 帧无崩溃无异常
 * - 无 console.error 输出
 * - drawCalls 不单调递增（无节点泄漏）
 * - 11 个远程玩家通过双实例 P2P 网络同步
 * - 玩家战斗 + 死亡流程正常
 * - HUD 状态与 Game 状态一致
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { HUDManager } from '../../src/ui/hud-manager';
import { MockNetwork, resetMockNetwork } from '../../src/net/mock-network';
import { StateSync } from '../../src/net/state-sync';
import { NetworkClient } from '../../src/net/network-client';

const DT = 1 / 60;
const TOTAL_FRAMES = 1800; // 30 秒 @ 60 FPS

// ── 场景构建辅助 ─────────────────────────────────────────────────────────

interface FullScene {
  game: Game;
  hud: HUDManager;
  sync: StateSync;
  client: NetworkClient;
  remoteNets: MockNetwork[];
}

/**
 * 构建完整 12 人场景：
 * - 11 个本地 AI 敌人（用于射击命中测试）
 * - HUDManager（监听所有 game 事件）
 * - 本地玩家网络（StateSync 接收端）
 * - 11 个远程玩家，各用独立 "发送" MockNetwork（P2P 双实例模式）
 *
 * P2P 双实例说明：
 *   引擎 MockNetwork.send() 将消息发给同房间的其他对等节点（跳过自身）。
 *   因此 remoteNet.send(join) → localNet 的 StateSync 监听器收到 → 创建 RemotePlayer。
 */
function buildScene(): FullScene {
  resetMockNetwork();

  const game = new Game({ headless: true });
  game.spawnEnemies(11);
  const hud = new HUDManager(game, 800, 600);

  // 本地玩家网络（接收端）
  const localNet = new MockNetwork();
  localNet.connect();
  const sync = new StateSync(localNet, 'local-0');
  const client = new NetworkClient(localNet, sync, 'local-0', '本地玩家');
  client.bindLocalState(
    () => { const p = game.player.position; return { x: p[0], y: p[1], z: p[2] }; },
    () => game.fpsCamera.yaw,
    () => game.playerHealth.current,
  );
  client.join();

  // 11 个远程玩家，各有独立发送网络
  const remoteNets: MockNetwork[] = [];
  for (let i = 0; i < 11; i++) {
    const rn = new MockNetwork();
    rn.connect();
    remoteNets.push(rn);
    rn.send({
      type: 'player.join',
      id: `remote-${i}`,
      name: `远程玩家${i}`,
      position: { x: (i - 5) * 5, y: 0, z: (i - 5) * 5 },
    });
  }

  return { game, hud, sync, client, remoteNets };
}

// ── 1. 1800 帧全量压力测试 ─────────────────────────────────────────────────

describe('M4.6 — 1800 帧全量压力测试', () => {
  it('1800 帧无崩溃无异常', () => {
    const { game, hud, client } = buildScene();
    expect(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    }).not.toThrow();
    expect(game.frameCount).toBe(TOTAL_FRAMES);
  });

  it('1800 帧无 console.error 输出', () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      const { game, hud, client } = buildScene();
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    } finally {
      console.error = orig;
    }
    expect(errors).toEqual([]);
  });

  it('drawCallCount 不单调递增（敌人死亡后节点正常回收）', () => {
    const { game, hud, client } = buildScene();
    const samples: number[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
      // 每 5 秒（300 帧）采样一次
      if (i % 300 === 299) samples.push(game.drawCallCount);
    }

    // 允许小量波动（±5），但不应无限递增
    expect(samples[samples.length - 1]).toBeLessThanOrEqual(samples[0] + 5);
  });
});

// ── 2. 分阶段行为验证 ─────────────────────────────────────────────────────

describe('M4.6 — 分阶段行为验证', () => {
  it('阶段1（0-5s）：AI 敌人正在巡逻（至少 1 个位置有变化）', () => {
    const { game, hud, client } = buildScene();
    const initialPos = game.enemies.map(e => [e.node.position[0], e.node.position[2]]);

    for (let i = 0; i < 300; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    const movedCount = game.enemies.filter((e, idx) => {
      const dx = Math.abs(e.node.position[0] - initialPos[idx][0]);
      const dz = Math.abs(e.node.position[2] - initialPos[idx][1]);
      return dx + dz > 0.01;
    }).length;

    expect(movedCount).toBeGreaterThan(0);
  });

  it('阶段2（5-15s）：WASD 移动后玩家位置改变', () => {
    const { game, hud, client } = buildScene();

    // 先稳定 5 秒（300 帧）接地
    for (let i = 0; i < 300; i++) game.update(DT);
    const initialZ = game.player.position[2];

    // 按 W 前进 10 秒（600 帧）
    game.simulateKey('w');
    for (let i = 0; i < 600; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }
    game.releaseKey('w');

    const dz = Math.abs(game.player.position[2] - initialZ);
    expect(dz).toBeGreaterThan(0.1);
  });

  it('阶段3（15-25s）：射击后弹药减少（武器系统正常工作）', () => {
    const { game, hud, client } = buildScene();

    // 运行 15 秒（900 帧）
    for (let i = 0; i < 900; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    const ammo0 = game.weapon.ammo;

    // 随机旋转相机 + 射击 10 秒（600 帧，每 60 帧射一次）
    for (let i = 0; i < 600; i++) {
      if (i % 60 === 0) {
        // 交替旋转以朝向不同方向
        game.applyMouseDelta((i / 60 % 2 === 0 ? 1 : -1) * 200, 0);
        game.simulateShoot();
      }
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    expect(game.weapon.ammo).toBeLessThan(ammo0);
    expect(game.frameCount).toBe(1500);
  });

  it('阶段4（25-30s）：玩家死亡后游戏继续正常运行至 1800 帧', () => {
    const { game, hud, client } = buildScene();

    // 运行 25 秒（1500 帧）
    for (let i = 0; i < 1500; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    // 确保玩家处于死亡状态（AI 可能已击杀，否则手动触发）
    if (!game.playerHealth.isDead) {
      game.playerHealth.takeDamage(game.playerHealth.current);
    }
    expect(game.playerHealth.isDead).toBe(true);

    // 死亡后继续运行 300 帧（5 秒）不崩溃
    expect(() => {
      for (let i = 0; i < 300; i++) {
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    }).not.toThrow();

    expect(game.frameCount).toBe(1800);
  });
});

// ── 3. 网络同步验证 ────────────────────────────────────────────────────────

describe('M4.6 — 网络同步验证', () => {
  it('11 个远程玩家通过 P2P 双实例加入后 sync.playerCount === 11', () => {
    const { sync } = buildScene();
    expect(sync.playerCount).toBe(11);
  });

  it('11 个远程玩家的 id 全部唯一', () => {
    const { sync } = buildScene();
    const ids = [...sync.players.keys()];
    expect(new Set(ids).size).toBe(11);
  });

  it('远程玩家状态更新后 health 同步正确', () => {
    const { game, hud, client, sync, remoteNets } = buildScene();

    remoteNets[0].send({
      type: 'player.state',
      id: 'remote-0',
      position: { x: 50, y: 0, z: 50 },
      rotation: 1.57,
      health: 75,
    });

    const rp = sync.players.get('remote-0');
    expect(rp).toBeDefined();
    expect(rp!.health.current).toBe(75);
  });

  it('持续广播 600 帧后远程玩家插值趋近目标位置', () => {
    const { game, hud, client, sync, remoteNets } = buildScene();

    for (let i = 0; i < 600; i++) {
      // 模拟 10Hz 广播（每 6 帧一次）
      if (i % 6 === 0) {
        remoteNets[0].send({
          type: 'player.state',
          id: 'remote-0',
          position: { x: 30, y: 0, z: 30 },
          rotation: 0,
          health: 100,
        });
      }
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    const rp = sync.players.get('remote-0');
    expect(rp!.node.position[0]).toBeGreaterThan(20);
    expect(rp!.node.position[2]).toBeGreaterThan(20);
  });

  it('远程玩家死亡消息使其进入 dead 状态', () => {
    const { sync, remoteNets } = buildScene();

    remoteNets[0].send({ type: 'player.die', id: 'remote-0' });

    const rp = sync.players.get('remote-0');
    expect(rp?.isDead).toBe(true);
  });

  it('1800 帧全网络广播（11 玩家 × 300 次）无崩溃', () => {
    const { game, hud, client, remoteNets } = buildScene();

    expect(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        // 每 6 帧广播一次（模拟 10Hz 网络频率）
        if (i % 6 === 0) {
          for (let r = 0; r < 11; r++) {
            remoteNets[r].send({
              type: 'player.state',
              id: `remote-${r}`,
              position: {
                x: Math.sin(i / 60 + r) * 15,
                y: 0,
                z: Math.cos(i / 60 + r) * 15,
              },
              rotation: (i * DT + r) % (Math.PI * 2),
              health: 100,
            });
          }
        }
        game.update(DT);
        client.update(DT);
        hud.update(DT);
      }
    }).not.toThrow();
  });
});

// ── 4. 性能基线 ────────────────────────────────────────────────────────────

describe('M4.6 — 性能基线', () => {
  it('初始 drawCallCount < 40（11 敌人 + 地图节点）', () => {
    const { game } = buildScene();
    expect(game.drawCallCount).toBeLessThan(40);
  });

  it('1800 帧 headless 执行时间 < 10 秒', () => {
    const { game, hud, client } = buildScene();
    const t0 = Date.now();

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    expect(Date.now() - t0).toBeLessThan(10_000);
  });

  it('1800 帧后 HUD 弹药显示与 weapon.ammo 一致', () => {
    const { game, hud, client } = buildScene();

    game.simulateShoot();

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    expect(hud.ammoDisplay.ammo).toBe(game.weapon.ammo);
  });

  it('player 位置在 1800 帧后无 NaN', () => {
    const { game, hud, client } = buildScene();

    game.simulateKey('w');
    game.simulateKey('a');
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      game.update(DT);
      client.update(DT);
      hud.update(DT);
    }

    const pos = game.player.position;
    expect(isNaN(pos[0])).toBe(false);
    expect(isNaN(pos[1])).toBe(false);
    expect(isNaN(pos[2])).toBe(false);
  });
});
