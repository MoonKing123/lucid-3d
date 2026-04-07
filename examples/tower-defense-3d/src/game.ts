import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { vec3 } from '../../../src/math/vec3';
import { Map } from './map';
import { CameraRig } from './camera-rig';

export class Game {
  private scene: Scene;
  private cameraRig: CameraRig;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  private input: InputManager;
  private map: Map;

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
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}
