import { Scene } from '../../../src/core/scene';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { GameLoop } from '../../../src/core/game-loop';
import { InputManager } from '../../../src/core/input';
import { CubeTexture, CubeTextureFace } from '../../../src/renderer/cube-texture';
import { vec3 } from '../../../src/math/vec3';
import { createTerrain } from './terrain';
import { createLights } from './lights';
import { CameraRig } from './camera-rig';
import { UnitManager } from './units';
import { SelectionSystem } from './selection';
import { InputSelectHandler } from './input-select';
import { buildNavMap, type NavMap } from './nav';
import { UnitMovementSystem } from './unit-movement';
import { HarvestSystem } from './harvest';
import { ResourceState } from './resource-state';
import { createBase, createResourceNodes, type ResourceNode, type BaseBuilding } from './buildings';
import { ResourceBar } from './hud/resource-bar';
import { PauseMenu } from './hud/pause-menu';

export type GameInit = HTMLCanvasElement | { headless: true };

/** 生成单色纯色立方体贴图（6 面同色） */
function makeSolidSkybox(faceSize: number, r: number, g: number, b: number): CubeTexture {
  const tex = new CubeTexture(faceSize);
  const data = new Uint8Array(faceSize * faceSize * 4);
  for (let i = 0; i < faceSize * faceSize; i++) {
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  // 顶面：天蓝色
  const topData = new Uint8Array(faceSize * faceSize * 4);
  for (let i = 0; i < faceSize * faceSize; i++) {
    topData[i * 4]     = 100;
    topData[i * 4 + 1] = 150;
    topData[i * 4 + 2] = 220;
    topData[i * 4 + 3] = 255;
  }
  // 底面：深灰色（地面以下）
  const botData = new Uint8Array(faceSize * faceSize * 4);
  for (let i = 0; i < faceSize * faceSize; i++) {
    botData[i * 4]     = 40;
    botData[i * 4 + 1] = 40;
    botData[i * 4 + 2] = 40;
    botData[i * 4 + 3] = 255;
  }
  tex.setFace(CubeTextureFace.PositiveX, new Uint8Array(data));
  tex.setFace(CubeTextureFace.NegativeX, new Uint8Array(data));
  tex.setFace(CubeTextureFace.PositiveY, topData);
  tex.setFace(CubeTextureFace.NegativeY, botData);
  tex.setFace(CubeTextureFace.PositiveZ, new Uint8Array(data));
  tex.setFace(CubeTextureFace.NegativeZ, new Uint8Array(data));
  return tex;
}

export class Game {
  // headless 模式下渲染器为 null
  private scene: Scene | null = null;
  private renderer: WebGLRenderer | null = null;
  private loop: GameLoop | null = null;
  private input: InputManager | null = null;
  private cameraRig: CameraRig | null = null;
  private _unitManager: UnitManager;
  private selection: SelectionSystem | null = null;
  private inputSelect: InputSelectHandler | null = null;
  private _navMap: NavMap;
  private _movementSystem: UnitMovementSystem;
  private _harvestSystem: HarvestSystem;
  private _resourceState: ResourceState;
  private _resourceNodes: ResourceNode[];
  private _base: BaseBuilding;
  private _resourceBar: ResourceBar;
  private _pauseMenu: PauseMenu;

  /** 已运行的帧数（供测试读取） */
  frameCount = 0;

  constructor(init: GameInit) {
    const headless = (init as any).headless === true;

    const { sun, ambient } = createLights();
    const terrain = createTerrain();
    this._unitManager = new UnitManager();
    this._navMap = buildNavMap();
    this._movementSystem = new UnitMovementSystem(this._unitManager, this._navMap);
    this._resourceState = new ResourceState();
    this._base = createBase();
    this._resourceNodes = createResourceNodes();
    this._harvestSystem = new HarvestSystem(
      this._unitManager,
      this._navMap,
      this._resourceState,
      this._base,
      this._resourceNodes,
    );
    this._resourceBar = new ResourceBar({ width: 800, height: 600 });
    this._pauseMenu = new PauseMenu({ width: 800, height: 600 });

    // 资源变化时同步到 HUD
    this._resourceState.events.on('resource.changed', (res) => {
      this._resourceBar.setGold(res.gold);
      this._resourceBar.setWood(res.wood);
    });

    if (!headless) {
      const canvas = init as HTMLCanvasElement;
      if (!canvas.getContext('webgl')) throw new Error('WebGL 不可用');

      // 天空盒：水平面用浅蓝灰色
      const skybox = makeSolidSkybox(64, 160, 185, 210);

      this.scene = new Scene({ background: skybox });
      this.scene.addChild(sun);
      this.scene.addChild(ambient);
      this.scene.addChild(terrain);
      this.scene.addChild(this._unitManager.mesh);

      this.renderer = new WebGLRenderer(canvas);
      this.input = new InputManager(canvas);

      this.cameraRig = new CameraRig({
        aspect: canvas.width / canvas.height,
        input: this.input,
        canvas,
      });
      this.scene.addChild(this.cameraRig.camera);

      // 选择系统
      this.selection = new SelectionSystem(this._unitManager);
      this.inputSelect = new InputSelectHandler(canvas, this.selection, this.cameraRig.camera);

      this.loop = new GameLoop();
      this.loop.onUpdate = (dt) => this.update(dt);
      this.loop.onRender = () => this.render();
    } else {
      // headless：只创建逻辑对象，不涉及 WebGL
      this.cameraRig = new CameraRig({ aspect: 16 / 9 });
      this.selection = new SelectionSystem(this._unitManager);
    }
  }

  start(): void {
    this.loop?.start();
  }

  stop(): void {
    this.loop?.stop();
  }

  update(dt: number): void {
    this.cameraRig?.update(dt, this.input ?? undefined);
    this._movementSystem.update(dt);
    this._harvestSystem.update(dt);
    this.frameCount++;
  }

  private render(): void {
    if (this.renderer && this.scene && this.cameraRig) {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }
  }

  get camera() {
    return this.cameraRig?.camera ?? null;
  }

  get unitManager(): UnitManager { return this._unitManager; }
  get navMap(): NavMap { return this._navMap; }
  get movementSystem(): UnitMovementSystem { return this._movementSystem; }
  get harvestSystem(): HarvestSystem { return this._harvestSystem; }
  get resourceState(): ResourceState { return this._resourceState; }
  get resourceNodes(): ResourceNode[] { return this._resourceNodes; }
  get base(): BaseBuilding { return this._base; }
  get resourceBar(): ResourceBar { return this._resourceBar; }
  get pauseMenu(): PauseMenu { return this._pauseMenu; }
  get selectionSystem(): SelectionSystem | null { return this.selection; }
}
