import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { CollisionWorld } from '../../../src/physics/collision';
import { Player } from './player';
import { Track } from './track';
import { HUD } from './hud';
import { createPlayerFollowCamera } from './camera-rig';
import { FollowCamera } from '../../../src/core/follow-camera';
import { UIButton } from '../../../src/ui/ui-button';
import { vec3 } from '../../../src/math/vec3';

export class Game {
  private scene: Scene;
  private camera: FollowCamera;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  player: Player;
  private input: InputManager;
  private world: CollisionWorld;
  private track: Track;
  private hud: HUD;

  // 游戏状态
  private hp = 3;
  private score = 0;
  private paused: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene({ background: vec3(0.1, 0.15, 0.2) });
    this.renderer = new WebGLRenderer(canvas);
    this.input = new InputManager(canvas);

    // 创建碰撞世界和跑道
    this.world = new CollisionWorld();
    this.track = new Track(
      { length: 200, width: 4, obstacleCount: 20, coinCount: 30, seed: 1234 },
      this.world,
    );
    this.scene.addChild(this.track.root);

    // 创建玩家（传入 world 和 track 以启用碰撞回调）
    this.player = new Player({
      input: this.input,
      startPosition: [0, 1, 0],
      collisionWorld: this.world,
      track: this.track,
    });
    this.scene.addChild(this.player.node);

    // 碰撞事件处理
    this.player.on('hit-obstacle', () => {
      this.hp = Math.max(0, this.hp - 1);
    });
    this.player.on('collect-coin', (coin) => {
      if (coin) {
        this.track.collectCoin(coin, this.world);
        this.score += 10;
      }
    });

    this.camera = createPlayerFollowCamera(this.player);
    this.camera.aspect = canvas.width / canvas.height;
    this.scene.addChild(this.camera);

    this.hud = new HUD(canvas.width, canvas.height);
    this.hud.onPauseClicked = () => { this.paused = !this.paused; };

    // 路由指针事件给 HUD 按钮
    this.input.on('pointerdown', (e) => {
      if (e.x !== undefined && e.y !== undefined) {
        const el = this.hud.canvas.hitTest(e.x, e.y);
        if (el instanceof UIButton) el.handlePointerDown(e.x, e.y);
      }
    });
    this.input.on('pointerup', (e) => {
      if (e.x !== undefined && e.y !== undefined) {
        const el = this.hud.canvas.hitTest(e.x, e.y);
        if (el instanceof UIButton) el.handlePointerUp(e.x, e.y);
      }
    });

    this.loop = new GameLoop();
    this.loop.onUpdate = (dt) => this.update(dt);
    this.loop.onRender = () => this.render();
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  /** 手动推进一帧（测试用） */
  step(dt: number): void {
    this.update(dt);
    this.render();
  }

  private update(dt: number): void {
    if (!this.paused) {
      this.player.update(dt);
      // 推进碰撞检测（触发 hit-obstacle / collect-coin 回调）
      this.world.step();
    }
    this.camera.update(dt);
    this.hud.update({
      score: this.score,
      healthMax: 3,
      healthCurrent: this.hp,
      paused: this.paused,
    });
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
