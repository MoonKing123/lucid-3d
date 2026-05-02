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
import { FollowCamera } from '../../../src/core/follow-camera';

export type GameInit = HTMLCanvasElement | { headless: true };

class SimulatedInput {
  private _keys = new Set<string>();
  press(key: string): void    { this._keys.add(key); }
  release(key: string): void  { this._keys.delete(key); }
  isKeyDown(key: string): boolean { return this._keys.has(key); }
}

export class Game {
  private _scene:    Scene | null        = null;
  private _renderer: WebGLRenderer | null = null;
  private _loop:     GameLoop | null      = null;

  private readonly _world:         CollisionWorld;
  private readonly _player:        Player;
  private readonly _camCtrl:       CameraController;
  private readonly _simInput:      SimulatedInput;
  private readonly _enemyManager:  EnemyManager;

  frameCount = 0;
  private _drawCallCount = 0;

  constructor(init: GameInit) {
    const headless = (init as { headless?: boolean }).headless === true;

    this._world    = new CollisionWorld();
    this._simInput = new SimulatedInput();

    const terrain = createTerrain(this._world);
    this._player       = new Player(this._world);
    this._enemyManager = new EnemyManager(this._player.node);
    this._camCtrl      = new CameraController({ horizDist: 8, height: 4 });
    this._camCtrl.setTarget(this._player.node);

    terrain.traverse(n => { if (n !== terrain) this._drawCallCount++; });
    this._drawCallCount++; // player
    this._drawCallCount += this._enemyManager.enemies.length; // enemies

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
      for (const enemyNode of this._enemyManager.nodes()) {
        this._scene.addChild(enemyNode);
      }
      this._scene.addChild(this._camCtrl.camera);

      this._renderer = new WebGLRenderer(canvas);
      this._camCtrl.camera.aspect = canvas.width / canvas.height;

      this._loop = new GameLoop();
      this._loop.onUpdate = (dt) => this.update(dt);
      this._loop.onRender = () => {
        if (this._renderer && this._scene) {
          this._renderer.render(this._scene, this._camCtrl.camera);
        }
      };
    }

    this._camCtrl.snap();
  }

  start(): void { this._loop?.start(); }
  stop():  void { this._loop?.stop();  }

  update(dt: number): void {
    this._player.update(dt, this._simInput, this._camCtrl.yaw);
    this._enemyManager.update(dt);
    this._world.step();
    this._camCtrl.update(dt);
    this.frameCount++;
  }

  simulateKey(key: string): void  { this._simInput.press(key); }
  releaseKey(key: string): void   { this._simInput.release(key); }

  applyMouseDelta(dx: number, dy: number): void {
    this._camCtrl.applyMouseDelta(dx, dy);
  }

  get player()        { return this._player; }
  get camera()        { return this._camCtrl.camera; }
  get followCamera(): FollowCamera { return this._camCtrl.camera; }
  get cameraCtrl()    { return this._camCtrl; }
  get world()         { return this._world; }
  get enemies()       { return this._enemyManager.enemies; }
  get enemyManager()  { return this._enemyManager; }
  get drawCallCount() { return this._drawCallCount; }
}
