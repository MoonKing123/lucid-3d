/**
 * SceneManager — 场景生命周期管理器。
 * 注册、加载、卸载游戏场景，委托帧更新给当前活跃场景。
 * @see test/unit/core/scene-manager.test.ts
 */

import { Node3D } from './node3d';

export interface GameScene {
  name: string;
  init(root: Node3D): void;
  update?(dt: number): void;
  cleanup?(): void;
}

export class SceneManager {
  private _scenes: Map<string, GameScene> = new Map();
  private _activeScene: GameScene | null = null;
  private _activeRoot: Node3D | null = null;

  register(scene: GameScene): void {
    if (this._scenes.has(scene.name)) {
      throw new Error(`场景已注册: ${scene.name}`);
    }
    this._scenes.set(scene.name, scene);
  }

  loadScene(name: string): void {
    const scene = this._scenes.get(name);
    if (!scene) {
      throw new Error(`场景未注册: ${name}`);
    }
    // 先卸载当前场景
    if (this._activeScene) {
      this._activeScene.cleanup?.();
    }
    // 创建新 root 并初始化
    const root = new Node3D();
    this._activeScene = scene;
    this._activeRoot = root;
    scene.init(root);
  }

  get activeScene(): GameScene | null {
    return this._activeScene;
  }

  get activeRoot(): Node3D | null {
    return this._activeRoot;
  }

  update(dt: number): void {
    this._activeScene?.update?.(dt);
  }

  unloadCurrent(): void {
    if (!this._activeScene) return;
    this._activeScene.cleanup?.();
    this._activeScene = null;
    this._activeRoot = null;
  }
}
