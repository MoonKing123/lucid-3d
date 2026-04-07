import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { Player } from './player';
import { vec3 } from '../../../src/math/vec3';

export class Game {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  private player: Player;
  private input: InputManager;

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

    this.player = new Player({ input: this.input, startPosition: [0, 1, 0] });
    this.scene.addChild(this.player.node);

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
