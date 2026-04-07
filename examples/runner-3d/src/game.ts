import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { CollisionWorld } from '../../../src/physics/collision';
import { Player } from './player';
import { Track } from './track';
import { vec3 } from '../../../src/math/vec3';

export class Game {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  private player: Player;
  private input: InputManager;
  private world: CollisionWorld;
  private track: Track;

  // 游戏状态
  private hp = 3;
  private score = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL 不可用');

    this.scene = new Scene({ background: vec3(0.1, 0.15, 0.2) });
    this.camera = new PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 100);
    this.camera.position[1] = 3;
    this.camera.position[2] = -5;
    this.camera.lookAt(vec3(0, 0, 0));
    this.scene.addChild(this.camera);

    this.renderer = new WebGLRenderer(gl);
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
    this.player.update(dt);
    // 推进碰撞检测（触发 hit-obstacle / collect-coin 回调）
    this.world.step();
    // 相机跟随玩家
    this.camera.position[0] = this.player.position[0];
    this.camera.position[1] = this.player.position[1] + 3;
    this.camera.position[2] = this.player.position[2] - 5;
    this.camera.lookAt(vec3(
      this.player.position[0],
      this.player.position[1],
      this.player.position[2],
    ));
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
