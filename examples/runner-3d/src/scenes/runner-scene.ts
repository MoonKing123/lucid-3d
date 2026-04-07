/**
 * RunnerScene — 跑酷游戏主场景
 * 集成 Player + Track + HUD + GameAudio + FollowCamera，实现完整 game loop。
 * 撞障碍物扣血，血量归零触发死亡重生，收集金币加分。
 */
import { GameScene } from '../../../../src/core/scene-manager';
import { Node3D } from '../../../../src/core/node3d';
import { CollisionWorld } from '../../../../src/physics/collision';
import { vec3 } from '../../../../src/math/vec3';
import { Player } from '../player';
import { Track, type CoinHandle } from '../track';
import { HUD } from '../hud';
import { GameAudio } from '../audio';
import { createPlayerFollowCamera } from '../camera-rig';
import type { FollowCamera } from '../../../../src/core/follow-camera';

const INITIAL_HEALTH = 100;
const DAMAGE_PER_HIT = 25;
const SCORE_PER_COIN = 10;

const START_POSITION: [number, number, number] = [0, 1, 0];

export class RunnerScene implements GameScene {
  name = 'runner';

  // 公开属性供测试访问
  player!: Player;
  health = INITIAL_HEALTH;
  score = 0;
  highScore = 0;

  private world!: CollisionWorld;
  private track!: Track;
  private hud!: HUD;
  private audio!: GameAudio;
  private camera: FollowCamera | null = null;
  private _root: Node3D | null = null;
  private _dead = false;

  init(root: Node3D): void {
    this._root = root;
    this.health = INITIAL_HEALTH;
    this.score = 0;
    this._dead = false;

    // 创建碰撞世界和跑道
    this.world = new CollisionWorld();
    this.track = new Track(
      { length: 200, width: 4, obstacleCount: 20, coinCount: 30, seed: 1234 },
      this.world,
    );
    root.addChild(this.track.root);

    // 创建玩家（无 InputManager — 测试/服务端环境）
    this.player = new Player({
      startPosition: START_POSITION,
      collisionWorld: this.world,
      track: this.track,
    });
    root.addChild(this.player.node);

    // 注册碰撞事件
    this.player.on('hit-obstacle', () => this.handleObstacleHit());
    this.player.on('collect-coin', (coin) => {
      if (coin) this.handleCoinCollect(coin);
    });

    // 创建相机
    this.camera = createPlayerFollowCamera(this.player);
    root.addChild(this.camera);

    // 创建 HUD（使用固定分辨率）
    this.hud = new HUD(800, 450);

    // 创建音频（无 AudioContext 时自动降级）
    this.audio = new GameAudio();
  }

  update(dt: number): void {
    // 检查死亡
    if (this.health <= 0 && !this._dead) {
      this._dead = true;
      this.onDeath();
      return;
    }

    this.player.update(dt);
    this.world.step();
    this.camera?.update(dt);

    // 更新音频监听器位置（跟随相机）
    if (this.camera) {
      const pos = this.camera.position;
      this.audio.updateListener([pos[0], pos[1], pos[2]]);
    }

    // 更新 HUD
    this.hud.update({
      score: this.score,
      healthMax: INITIAL_HEALTH,
      healthCurrent: this.health,
      paused: false,
    });
  }

  /** 重生逻辑：重置血量和玩家位置，保留最高分 */
  onDeath(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.health = INITIAL_HEALTH;
    this.score = 0;
    this._dead = false;

    // 用 teleport 重置位置并清空速度
    this.player.controller.teleport(vec3(...START_POSITION));
  }

  /**
   * 处理障碍物碰撞：扣血。
   * 也可在测试中直接调用来模拟碰撞。
   */
  handleObstacleHit(): void {
    const pos = this.player.node.position;
    this.audio.playHit([pos[0], pos[1], pos[2]]);
    this.health = Math.max(0, this.health - DAMAGE_PER_HIT);
  }

  /**
   * 处理金币收集：加分并从场景移除金币。
   * 也可在测试中直接调用（不传参数时使用默认加分）。
   */
  handleCoinCollect(coin?: CoinHandle): void {
    if (coin && !coin.collected) {
      this.track.collectCoin(coin, this.world);
      const pos = coin.position;
      this.audio.playCoin(pos);
    } else if (!coin) {
      // 测试用：无具体金币时直接加分
      this.score += SCORE_PER_COIN;
      return;
    }
    this.score += SCORE_PER_COIN;
  }

  cleanup(): void {
    this.audio.dispose();
    this._root = null;
    this.camera = null;
  }
}
