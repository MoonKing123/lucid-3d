/**
 * SceneManager — 场景生命周期管理器。
 * 注册、加载、卸载游戏场景，委托帧更新给当前活跃场景。
 * @see test/unit/core/scene-manager.test.ts
 */

export const __STUB__ = true;

import type { Node3D } from './node3d';

export interface GameScene {
  name: string;
  init(root: Node3D): void;
  update?(dt: number): void;
  cleanup?(): void;
}

export class SceneManager {
  constructor() { throw new Error('STUB'); }
  register(_scene: GameScene): void { throw new Error('STUB'); }
  loadScene(_name: string): void { throw new Error('STUB'); }
  get activeScene(): GameScene | null { throw new Error('STUB'); }
  get activeRoot(): Node3D | null { throw new Error('STUB'); }
  update(_dt: number): void { throw new Error('STUB'); }
  unloadCurrent(): void { throw new Error('STUB'); }
}
