import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { CollisionWorld } from '../../../src/physics/collision';
import { AmbientLight, DirectionalLight } from '../../../src/core/light';
import { vec3 } from '../../../src/math/vec3';
import { Player } from './player';
import { CameraController } from './camera-controller';
import { createTerrain } from './terrain';
import { EnemyManager } from './enemy-manager';
import { CombatSystem } from './combat';
import { HUD } from './hud';
import type { BitmapFontData, BitmapCharData } from '../../../src/renderer/bitmap-font';

export type GameInit = HTMLCanvasElement | { headless: true };

class SimulatedInput {
  private _keys = new Set<string>();
  press(key: string): void   { this._keys.add(key); }
  release(key: string): void { this._keys.delete(key); }
  isKeyDown(key: string): boolean { return this._keys.has(key); }
}

/** 生成最小可用的 BitmapFontData（ASCII 子集，用于 HUD demo） */
function generateMinimalFont(): BitmapFontData {
  const chars = new Map<number, BitmapCharData>();
  for (let i = 32; i <= 126; i++) {
    chars.set(i, { id: i, x: i * 8, y: 0, width: 7, height: 12, xoffset: 0, yoffset: 2, xadvance: 8 });
  }
  return { lineHeight: 16, base: 12, scaleW: 1024, scaleH: 16, chars };
}

export class Game {
  private _scene:    Scene | null        = null;
  private _renderer: WebGLRenderer | null = null;
  private _loop:     GameLoop | null      = null;
  private _hud:      HUD | null           = null;

  private readonly _world:        CollisionWorld;
  private readonly _player:       Player;
  private readonly _camCtrl:      CameraController;
  private readonly _simInput:     SimulatedInput;
  private readonly _enemyManager: EnemyManager;
  private readonly _combat:       CombatSystem;

  frameCount = 0;
  private _drawCallCount = 0;

  constructor(init: GameInit) {
    const headless = (init as { headless?: boolean }).headless === true;

    this._world    = new CollisionWorld();
    this._simInput = new SimulatedInput();

    const terrain = createTerrain(this._world);
    this._player  = new Player(this._world);
    this._camCtrl = new CameraController({ horizDist: 8, height: 4 });
    this._camCtrl.setTarget(this._player.node);

    this._enemyManager = new EnemyManager(this._player.node);
    this._combat = new CombatSystem(this._player.node, this._enemyManager.enemies);

    // 统计可渲染节点数（地形 mesh 子节点）
    terrain.traverse(n => { if (n !== terrain) this._drawCallCount++; });
    this._drawCallCount++; // player 节点
    this._drawCallCount += this._enemyManager.enemies.length; // enemy 节点

    if (!headless) {
      const canvas = init as HTMLCanvasElement;

      const sun = new DirectionalLight();
      sun.direction = vec3(-0.5, -1, -0.5);
      sun.intensity = 1.2;

      const ambient = new AmbientLight();
      ambient.intensity = 0.4;

      this._scene = new Scene({ background: vec3(0.5, 0.7, 1.0) });
      this._scene.fog = { color: vec3(0.5, 0.7, 1.0), near: 30, far: 100 };
      this._scene.addChild(sun);
      this._scene.addChild(ambient);
      this._scene.addChild(terrain);
      this._scene.addChild(this._player.node);
      for (const node of this._enemyManager.nodes()) {
        this._scene.addChild(node);
      }
      this._scene.addChild(this._camCtrl.camera);

      this._renderer = new WebGLRenderer(canvas);
      this._camCtrl.camera.aspect = canvas.width / canvas.height;

      this._camCtrl.snap();

      // ── HUD 初始化 ──
      this._hud = new HUD({
        width: canvas.width,
        height: canvas.height,
        font: generateMinimalFont(),
        onQuit: () => this.stop(),
        onRespawn: () => this._player.respawn(),
        onQualityChange: (_quality) => {
          // TODO: 切换 PostProcessor pass — blocked on PostProcessor pass-toggle API
        },
        onVolumeChange: (_volume) => {
          // TODO: AudioManager.masterVolume — blocked on AudioManager headless mode
        },
      });
      this._hud.connectPlayer(this._player);

      // ── 键盘事件 ──
      canvas.ownerDocument?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this._hud?.toggleEscMenu();
        } else if (e.key === 'i' || e.key === 'I') {
          this._hud?.toggleInventory();
        } else if (e.key === '1') {
          this._combat.switchWeapon('sword');
          this._hud?.selectSkill(0);
        } else if (e.key === '2') {
          this._combat.switchWeapon('bow');
          this._hud?.selectSkill(1);
        } else if (e.key === '3' || e.key === '4') {
          const slot = parseInt(e.key) - 1;
          this._hud?.selectSkill(slot);
        }
      });

      this._loop = new GameLoop();
      this._loop.onUpdate = (dt) => this.update(dt);
      this._loop.onRender = () => {
        if (this._renderer && this._scene) {
          this._renderer.render(this._scene, this._camCtrl.camera);
        }
      };
    } else {
      this._camCtrl.snap();
    }
  }

  start(): void { this._loop?.start(); }
  stop():  void { this._loop?.stop();  }

  update(dt: number): void {
    // 暂停时跳过游戏逻辑更新
    if (this._hud?.isPaused) {
      this.frameCount++;
      return;
    }

    // 武器切换（headless 模式通过 simulateKey 驱动）
    if (this._simInput.isKeyDown('1')) this._combat.switchWeapon('sword');
    if (this._simInput.isKeyDown('2')) this._combat.switchWeapon('bow');

    this._player.update(dt, this._simInput, this._camCtrl.yaw);

    // 攻击指令：按 F 键时同步触发战斗系统
    if (this._simInput.isKeyDown('f') || this._simInput.isKeyDown('F')) {
      const yaw  = this._camCtrl.yaw;
      const fwdX = -Math.sin(yaw);
      const fwdZ =  Math.cos(yaw);
      this._combat.attack(this._player.position, vec3(fwdX, 0, fwdZ));
    }

    this._combat.update(dt);
    this._world.step();
    this._camCtrl.update(dt);
    this._enemyManager.update(1 / 60);
    this._hud?.update(dt);
    this.frameCount++;
  }

  // ── headless 测试辅助 ──

  simulateKey(key: string): void { this._simInput.press(key); }
  releaseKey(key: string): void  { this._simInput.release(key); }

  applyMouseDelta(dx: number, dy: number): void {
    this._camCtrl.applyMouseDelta(dx, dy);
  }

  // ── 只读属性 ──

  get player()        { return this._player; }
  get camera()        { return this._camCtrl.camera; }
  get followCamera()  { return this._camCtrl.camera; }
  get cameraCtrl()    { return this._camCtrl; }
  get world()         { return this._world; }
  get hud()           { return this._hud; }
  get drawCallCount() { return this._drawCallCount; }
  get enemyManager()  { return this._enemyManager; }
  get combat()        { return this._combat; }
}
