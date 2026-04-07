/**
 * Track 集成测试 — Issue #212
 *
 * 验证跑道生成、障碍物/金币布局确定性、raycast 检测和 collectCoin 逻辑。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Track, LAYER_OBSTACLE, LAYER_COIN } from '../../src/track';
import { CollisionWorld } from '../../../../src/physics/collision';
import { vec3 } from '../../../../src/math/vec3';

describe('Track 集成测试', () => {
  let world: CollisionWorld;
  let track: Track;

  beforeEach(() => {
    world = new CollisionWorld();
    track = new Track({ length: 100, width: 4, obstacleCount: 5, coinCount: 10, seed: 42 }, world);
  });

  it('在 +Z 方向生成 length 长度的跑道', () => {
    expect(track.root.children.length).toBeGreaterThan(0);
  });

  it('生成 5 个障碍物 + 10 个金币', () => {
    expect(track.obstacles.length).toBe(5);
    expect(track.coins.length).toBe(10);
  });

  it('障碍物 z 坐标都在跑道范围内', () => {
    for (const o of track.obstacles) {
      expect(o.position[2]).toBeGreaterThanOrEqual(0);
      expect(o.position[2]).toBeLessThanOrEqual(100);
    }
  });

  it('seed 相同则障碍物布局确定', () => {
    const w2 = new CollisionWorld();
    const t2 = new Track({ length: 100, width: 4, obstacleCount: 5, coinCount: 10, seed: 42 }, w2);
    for (let i = 0; i < 5; i++) {
      expect(t2.obstacles[i].position).toEqual(track.obstacles[i].position);
    }
  });

  it('raycast 从玩家位置向前检测到障碍物', () => {
    // 将玩家放到第一个障碍物前 1 米，向 +Z 射线
    const obs = track.obstacles[0];
    const origin = vec3(obs.position[0], obs.position[1], obs.position[2] - 3);
    const direction = vec3(0, 0, 1);

    // 只检测 LAYER_OBSTACLE 层，向前 10 米内
    const hits = world.raycast(origin, direction, 10, LAYER_OBSTACLE);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].distance).toBeLessThan(10);
  });

  it('collectCoin 移除金币节点和碰撞体', () => {
    const coin = track.coins[0];
    expect(coin.collected).toBe(false);

    track.collectCoin(coin, world);

    expect(coin.collected).toBe(true);
    expect(coin.node.parent).toBe(null);
    // 移除后 world 中不再有该节点
    const hits = world.raycast(
      vec3(coin.position[0], coin.position[1], coin.position[2] - 5),
      vec3(0, 0, 1),
      20,
      LAYER_COIN,
    );
    const wasHit = hits.some(h => h.node === coin.node);
    expect(wasHit).toBe(false);
  });
});
