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
import { EventEmitter } from '../../../src/gameplay/event-emitter';
import { vec3 } from '../../../src/math/vec3';
import { FPSCamera } from './fps-camera';
import { Player } from './player';
import { createMap } from './map';
import { createLights } from './lights';
import { bindInput } from './input-binding';
import { Enemy } from './enemy';
import { spawnEnemies } from './enemy-spawner';
import { Weapon } from './weapon';

export type GameInit = HTMLCanvasElement | { headless: true };

/** 游戏全局事件（供 M4.2 武器命中等系统广播） */
export type GameEvents = {
  /** 武器命中事件：target 为被命中的 Node3D，damage 为伤害量 */
  'weapon.hit': (target: import('../../../src/core/node3d').Node3D, damage: number) => void;
  /** 玩家受到伤害 */
  'player.damaged': (damage: number) => void;
};

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
  private readonly _weapon: Weapon;

  /** 游戏全局事件总线 */
  readonly events: EventEmitter<GameEvents>;

  /** 当前存活的敌人列表 */
  private _enemies: Enemy[] = [];

  /** 已运行帧数（供测试读取） */
  frameCount = 0;

  /** 场景中可渲染节点数量的估算（headless 代理 drawCalls） */
  private _drawCallCount = 0;

  constructor(init: GameInit) {
    const headless = (init as any).headless === true;

    // ── 始终创建逻辑对象（headless 也需要） ──
    this._world = new CollisionWorld();
    this._simInput = new SimulatedInput();
    this.events = new EventEmitter<GameEvents>();

    const { sun, ambient } = createLights();
    const map = createMap(this._world);

    this._fpsCamera = new FPSCamera({ aspect: 16 / 9 });
    this._player = new Player({
      collisionWorld: this._world,
      startPosition: [0, 0, 0],
    });
    this._weapon = new Weapon({ world: this._world });

    // 统计地图中可渲染节点（地面 + 墙壁 mesh）
    map.traverse(n => {
      if (n !== map) this._drawCallCount++;
    });

    // 监听武器命中事件（M4.2 广播），转发到对应 Enemy
    this.events.on('weapon.hit', (target, damage) => {
      for (const enemy of this._enemies) {
        if (enemy.node === target) {
          enemy.applyDamage(damage);
          break;
        }
      }
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

  /**
   * 在地图上生成 `count` 个敌人 NPC（默认 11）。
   * 可多次调用（追加敌人）。
   */
  spawnEnemies(count = 11): void {
    const newEnemies = spawnEnemies(
      count,
      this._world,
      this._player.node,
      (damage) => this.events.emit('player.damaged', damage),
    );
    for (const e of newEnemies) {
      this._enemies.push(e);
      this._drawCallCount++;  // 每个 Enemy 节点对应一个 drawCall
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

    // 更新所有敌人，清除已标记移除的
    for (const enemy of this._enemies) {
      enemy.update(dt);
    }
    // 移除已死亡超时的敌人
    const before = this._enemies.length;
    this._enemies = this._enemies.filter(e => !e.isRemoved);
    const removed = before - this._enemies.length;
    this._drawCallCount -= removed;

    // 武器输入：R 键换弹
    if (inputState.isKeyDown('r') || inputState.isKeyDown('R')) {
      this._weapon.reload();
    }
    this._weapon.update(dt);

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

  /**
   * 模拟鼠标左键开火（headless 测试用）。
   * 从当前相机位置向视线方向发射射线。
   */
  simulateShoot(): void {
    const cam = this._fpsCamera.camera;
    const origin = vec3(cam.position[0], cam.position[1], cam.position[2]);
    const dir = this._fpsCamera.getViewDirection();
    this._weapon.fire(origin, dir);
  }

  // ── 只读属性 ──

  get camera() { return this._fpsCamera.camera; }
  get fpsCamera() { return this._fpsCamera; }
  get player() { return this._player; }
  get world() { return this._world; }
  get weapon() { return this._weapon; }

  /** 当前存活的敌人（快照，不可直接修改） */
  get enemies(): readonly Enemy[] { return this._enemies; }

  /**
   * 场景可渲染节点计数（headless 代理 drawCalls）。
   * 包含地图节点 + 敌人节点。
   */
  get drawCallCount() { return this._drawCallCount; }
}
