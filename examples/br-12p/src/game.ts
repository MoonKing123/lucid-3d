/**
 * Game — BR-12P 主游戏类。
 * 组装场景：FPSCamera + Player + Map + Lights + CollisionWorld + GameLoop。
 * 支持 headless 模式（{ headless: true }）用于集成测试，此时不创建 WebGL 渲染器。
 */

import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { CollisionWorld } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';
import { FPSCamera } from './fps-camera';
import { Player } from './player';
import { createMap } from './map';
import { createLights } from './lights';
import { bindInput } from './input-binding';

export type GameInit = HTMLCanvasElement | { headless: true };

/** headless 模式下模拟按键状态的输入实现 */
class SimulatedInput {
  private _keys = new Set<string>();

  press(key: string): void { this._keys.add(key); }
  release(key: string): void { this._keys.delete(key); }
  isKeyDown(key: string): boolean { return this._keys.has(key); }
}

export class Game {
  private _scene: Scene | null = null;
  private _renderer: WebGLRenderer | null = null;
  private _loop: GameLoop | null = null;
  private _input: InputManager | null = null;

  private readonly _fpsCamera: FPSCamera;
  private readonly _player: Player;
  private readonly _world: CollisionWorld;
  private readonly _simInput: SimulatedInput;

  /** 已运行帧数（供测试读取） */
  frameCount = 0;

  /** 场景中可渲染节点数量的估算（headless 代理 drawCalls） */
  private _drawCallCount = 0;

  constructor(init: GameInit) {
    const headless = (init as any).headless === true;

    // ── 始终创建逻辑对象（headless 也需要） ──
    this._world = new CollisionWorld();
    this._simInput = new SimulatedInput();

    const { sun, ambient } = createLights();
    const map = createMap(this._world);

    this._fpsCamera = new FPSCamera({ aspect: 16 / 9 });
    this._player = new Player({
      collisionWorld: this._world,
      startPosition: [0, 0, 0],
    });

    // 统计地图中可渲染节点（地面 + 墙壁 mesh）
    map.traverse(n => {
      if (n !== map) this._drawCallCount++;
    });

    if (!headless) {
      const canvas = init as HTMLCanvasElement;

      this._scene = new Scene({ background: vec3(0.55, 0.75, 0.95) });
      this._scene.addChild(sun);
      this._scene.addChild(ambient);
      this._scene.addChild(map);
      this._scene.addChild(this._player.node);
      this._scene.addChild(this._fpsCamera.camera);

      this._renderer = new WebGLRenderer(canvas);
      this._fpsCamera.camera.aspect = canvas.width / canvas.height;

      this._input = new InputManager(canvas);
      bindInput(this._input, this._fpsCamera);

      this._loop = new GameLoop();
      this._loop.onUpdate = (dt) => this.update(dt);
      this._loop.onRender = () => this._render();
    }
  }

  start(): void {
    this._loop?.start();
  }

  stop(): void {
    this._loop?.stop();
  }

  /**
   * 手动推进一帧（测试用，也是非 headless 的 loop 回调）。
   */
  update(dt: number): void {
    // 合并真实输入和模拟输入
    const inputState = this._input ?? this._simInput;
    this._player.setInput(inputState);
    this._player.update(dt, this._fpsCamera);

    this._world.step();
    this._fpsCamera.update(this._player.position);

    if (this._input) {
      this._input.update();  // 清除 keysPressed
    }

    this.frameCount++;
  }

  private _render(): void {
    if (this._renderer && this._scene) {
      this._renderer.render(this._scene, this._fpsCamera.camera);
    }
  }

  // ── headless 测试辅助 ──

  /** 模拟按键按下（持续生效直到 releaseKey） */
  simulateKey(key: string): void {
    this._simInput.press(key);
  }

  /** 释放模拟按键 */
  releaseKey(key: string): void {
    this._simInput.release(key);
  }

  /** 直接注入鼠标位移到 FPSCamera */
  applyMouseDelta(dx: number, dy: number): void {
    this._fpsCamera.applyMouseDelta(dx, dy);
  }

  // ── 只读属性 ──

  get camera() { return this._fpsCamera.camera; }
  get fpsCamera() { return this._fpsCamera; }
  get player() { return this._player; }
  get world() { return this._world; }

  /**
   * 场景可渲染节点计数（headless 代理 drawCalls）。
   * 等同于实际渲染时的最小 drawCall 数量（地面 + 墙壁）。
   */
  get drawCallCount() { return this._drawCallCount; }
}
