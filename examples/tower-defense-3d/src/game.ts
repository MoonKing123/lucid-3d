import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { vec3 } from '../../../src/math/vec3';
import { Map } from './map';
import { CameraRig } from './camera-rig';
import { WaveSpawner, Wave } from './wave-spawner';

export class Game {
  private scene: Scene;
  private cameraRig: CameraRig;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  private input: InputManager;
  private map: Map;
  private waveSpawner: WaveSpawner;
  lives: number = 20;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL 不可用');

    this.scene = new Scene({ background: vec3(0.1, 0.12, 0.15) });
    this.renderer = new WebGLRenderer(gl);
    this.input = new InputManager(canvas);

    this.map = new Map({ width: 12, height: 12, cellSize: 1 });
    this.scene.addChild(this.map.node);

    const waves: Wave[] = [
      { count: 5, interval: 1.0, enemyHealth: 100 },
      { count: 8, interval: 0.8, enemyHealth: 150 },
      { count: 10, interval: 0.5, enemyHealth: 200 },
    ];
    this.waveSpawner = new WaveSpawner(this.map, waves);

    this.cameraRig = new CameraRig({
      aspect: canvas.width / canvas.height,
      input: this.input,
    });
    this.scene.addChild(this.cameraRig.camera);

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
    this.cameraRig.update(dt);
    this.waveSpawner.update(dt);

    // 到达终点的敌人扣血
    for (const enemy of this.waveSpawner.enemies) {
      if (enemy.reachedEnd && this.lives > 0) {
        this.lives--;
        // 标记为 dead 防止重复扣血
        enemy.dead = true;
      }
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}
