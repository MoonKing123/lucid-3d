import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { vec3 } from '../../../src/math/vec3';
import { Map } from './map';
import { CameraRig } from './camera-rig';
import { WaveSpawner, Wave } from './wave-spawner';
import { TowerManager } from './tower-manager';
import { Picker } from './picker';
import { HUD } from './hud';
import { TowerPalette } from './tower-palette';
import { GameOverMenu } from './game-over-menu';

const TOWER_COST: Record<string, number> = {
  arrow: 50,
  cannon: 100,
};

const INITIAL_GOLD = 200;
const MAX_LIVES = 20;
const KILL_GOLD = 10;

export class Game {
  private scene: Scene;
  private cameraRig: CameraRig;
  private renderer: WebGLRenderer;
  private loop: GameLoop;
  private input: InputManager;
  private map: Map;
  private waveSpawner: WaveSpawner;
  private towerManager: TowerManager;
  private picker: Picker;
  private hud: HUD;
  private palette: TowerPalette;
  private gameOverMenu: GameOverMenu;
  lives: number = MAX_LIVES;
  gold: number = INITIAL_GOLD;

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
    this.towerManager = new TowerManager(this.map);

    this.cameraRig = new CameraRig({
      aspect: canvas.width / canvas.height,
      input: this.input,
    });
    this.scene.addChild(this.cameraRig.camera);

    this.picker = new Picker(this.cameraRig.camera, this.map);

    // UI 初始化
    const w = canvas.width;
    const h = canvas.height;
    this.hud = new HUD({ width: w, height: h, maxLives: MAX_LIVES });
    this.hud.setGold(INITIAL_GOLD);
    this.hud.setLives(MAX_LIVES);

    this.palette = new TowerPalette({ x: w / 2 - 72, y: h - 96 });

    this.gameOverMenu = new GameOverMenu({ width: w, height: h });
    this.gameOverMenu.onRestart = () => this.restart();

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

  private restart(): void {
    this.lives = MAX_LIVES;
    this.gold = INITIAL_GOLD;
    this.hud.setLives(MAX_LIVES);
    this.hud.setGold(INITIAL_GOLD);
    this.hud.setWave(0);
    this.gameOverMenu.hide();
  }

  private update(dt: number): void {
    if (this.gameOverMenu.visible) return;

    this.cameraRig.update(dt);
    this.waveSpawner.update(dt);

    // 同步当前波次到 HUD
    this.hud.setWave((this.waveSpawner as any).currentWave);

    // 到达终点的敌人扣 lives
    for (const enemy of this.waveSpawner.enemies) {
      if (enemy.reachedEnd && !enemy.dead) {
        if (this.lives > 0) {
          this.lives--;
          this.hud.setLives(this.lives);
        }
        enemy.dead = true;
      }
      // 被击杀的敌人奖励金币（已 dead 且 health <= 0）
      if (enemy.dead && enemy.health <= 0 && !(enemy as any)._goldAwarded) {
        (enemy as any)._goldAwarded = true;
        this.gold += KILL_GOLD;
        this.hud.setGold(this.gold);
      }
    }

    // lives 归零显示 Game Over
    if (this.lives <= 0) {
      this.gameOverMenu.show();
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  /** 通过 NDC 坐标放置当前选中类型的塔（如金币不足则忽略） */
  tryPlaceTower(ndcX: number, ndcY: number): boolean {
    const hit = this.picker.pickAtNDC(ndcX, ndcY);
    if (!hit) return false;

    const type = this.palette.selectedType;
    const cost = TOWER_COST[type] ?? 50;
    if (this.gold < cost) return false;

    const tower = this.towerManager.place(hit.gridX, hit.gridY, type);
    if (!tower) return false;

    this.gold -= cost;
    this.hud.setGold(this.gold);
    this.scene.addChild(tower.node);
    return true;
  }
}
