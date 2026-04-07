/**
 * Track — 程序化生成跑道 + 障碍物 + 金币。
 * Issue #212：M1.2 跑道地形 + 障碍物 + 收集品（碰撞集成）
 */
import { Node3D } from '../../../src/core/node3d';
import { CollisionWorld } from '../../../src/physics/collision';
import { BoxCollider } from '../../../src/physics/box-collider';
import { vec3 } from '../../../src/math/vec3';

// 碰撞层（bitmask）
export const LAYER_GROUND = 1 << 0;    // 0b0001 = 1
export const LAYER_OBSTACLE = 1 << 1;  // 0b0010 = 2
export const LAYER_COIN = 1 << 2;      // 0b0100 = 4
export const LAYER_PLAYER = 1 << 3;    // 0b1000 = 8

export interface TrackOptions {
  /** 跑道长度（米，Z 方向） */
  length: number;
  /** 跑道宽度（X 方向） */
  width: number;
  obstacleCount: number;
  coinCount: number;
  /** 确定性种子（用于测试复现） */
  seed?: number;
}

export interface CoinHandle {
  node: Node3D;
  collected: boolean;
  position: [number, number, number];
}

export interface ObstacleHandle {
  node: Node3D;
  position: [number, number, number];
  size: [number, number, number];
}

/** 简单线性同余伪随机数生成器，返回 [0, 1) 范围 */
class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0; // 转为 uint32
  }

  next(): number {
    // LCG 参数（Numerical Recipes）
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  /** 返回 [min, max) 范围内的随机数 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export class Track {
  readonly root: Node3D;
  readonly coins: CoinHandle[] = [];
  readonly obstacles: ObstacleHandle[] = [];

  constructor(opts: TrackOptions, world: CollisionWorld) {
    this.root = new Node3D('track');
    const rng = new SeededRng(opts.seed ?? 0);

    // 1. 生成地面：跑道长度覆盖整个 length，Y 在 0 以下
    const groundNode = new Node3D('ground');
    groundNode.position[0] = 0;
    groundNode.position[1] = -0.1;
    groundNode.position[2] = opts.length / 2;
    const groundCollider = new BoxCollider(
      vec3(opts.width / 2, 0.1, opts.length / 2),
      vec3(0, 0, 0),
    );
    world.addBody(groundNode, {
      shape: groundCollider,
      layer: LAYER_GROUND,
      mask: LAYER_PLAYER,
    });
    this.root.addChild(groundNode);

    // 2. 障碍物：随机分布在 Z [5, length-5]，X [-width/2+0.5, width/2-0.5]
    const obstacleHalfW = 0.5;
    const obstacleHalfH = 0.75;
    const obstacleHalfD = 0.5;
    const marginZ = 5;
    const marginX = obstacleHalfW + 0.1;

    for (let i = 0; i < opts.obstacleCount; i++) {
      const x = rng.range(-opts.width / 2 + marginX, opts.width / 2 - marginX);
      const z = rng.range(marginZ, opts.length - marginZ);
      const pos: [number, number, number] = [
        Math.round(x * 100) / 100,
        obstacleHalfH,        // Y 中心 = 高度一半（放在地面上）
        Math.round(z * 100) / 100,
      ];
      const size: [number, number, number] = [
        obstacleHalfW * 2,
        obstacleHalfH * 2,
        obstacleHalfD * 2,
      ];

      const node = new Node3D(`obstacle-${i}`);
      node.position[0] = pos[0];
      node.position[1] = pos[1];
      node.position[2] = pos[2];

      const collider = new BoxCollider(
        vec3(obstacleHalfW, obstacleHalfH, obstacleHalfD),
        vec3(0, 0, 0),
      );
      world.addBody(node, {
        shape: collider,
        layer: LAYER_OBSTACLE,
        mask: LAYER_PLAYER,
      });

      this.root.addChild(node);
      this.obstacles.push({ node, position: pos, size });
    }

    // 3. 金币：随机分布在 Z [5, length-5]，X 跑道内，Y 略高于地面
    const coinHalfSize = 0.3;
    const coinY = 0.6; // 悬浮在地面上方

    for (let i = 0; i < opts.coinCount; i++) {
      const x = rng.range(-opts.width / 2 + coinHalfSize, opts.width / 2 - coinHalfSize);
      const z = rng.range(marginZ, opts.length - marginZ);
      const pos: [number, number, number] = [
        Math.round(x * 100) / 100,
        coinY,
        Math.round(z * 100) / 100,
      ];

      const node = new Node3D(`coin-${i}`);
      node.position[0] = pos[0];
      node.position[1] = pos[1];
      node.position[2] = pos[2];

      const collider = new BoxCollider(
        vec3(coinHalfSize, coinHalfSize, coinHalfSize),
        vec3(0, 0, 0),
      );
      world.addBody(node, {
        shape: collider,
        layer: LAYER_COIN,
        mask: LAYER_PLAYER,
        isTrigger: true,
      });

      this.root.addChild(node);
      this.coins.push({ node, collected: false, position: pos });
    }
  }

  /**
   * 玩家穿过金币时调用：标记为已收集，从场景和碰撞世界移除。
   */
  collectCoin(handle: CoinHandle, world: CollisionWorld): void {
    handle.collected = true;
    handle.node.parent?.removeChild(handle.node);
    world.removeCollider(handle.node);
  }
}
