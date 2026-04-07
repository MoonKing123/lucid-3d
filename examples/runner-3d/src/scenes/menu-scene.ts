/**
 * MenuScene — 游戏主菜单场景
 * 显示 "Press Space to Start"，监听空格键切换到 runner 场景。
 */
import { GameScene } from '../../../../src/core/scene-manager';
import { Node3D } from '../../../../src/core/node3d';

export class MenuScene implements GameScene {
  name = 'menu';

  /** 外部注册：空格键按下时的回调（切换到 runner） */
  onStart: (() => void) | null = null;

  private root: Node3D | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  init(root: Node3D): void {
    this.root = root;
    // 创建 "Press Space to Start" UI 节点（纯逻辑标记，无需实际渲染）
    const uiNode = new Node3D('menu-ui');
    root.addChild(uiNode);

    // 监听键盘（浏览器环境可用，Node 环境跳过）
    if (typeof globalThis.addEventListener === 'function') {
      this._keyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space') this.onStart?.();
      };
      globalThis.addEventListener('keydown', this._keyHandler);
    }
  }

  update(_dt: number): void {
    // 逻辑已在键盘监听回调中处理
  }

  cleanup(): void {
    if (this._keyHandler && typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this.root = null;
  }
}
