/**
 * CameraSwitcher — 多相机注册与切换管理器。
 * 注册多个命名相机，按名切换；支持堆栈模式（push/pop）。
 * 典型用途：游戏主视角 / 过场相机 / 调试俯视 / UI 相机 无缝切换。
 * @see test/unit/core/camera-switcher.test.ts
 */

import type { Camera } from './camera';

export const __STUB__ = true;

export class CameraSwitcher {
  constructor() { throw new Error('Not implemented'); }
  register(_name: string, _camera: Camera): void { throw new Error('Not implemented'); }
  unregister(_name: string): void { throw new Error('Not implemented'); }
  switchTo(_name: string): void { throw new Error('Not implemented'); }
  push(_name: string): void { throw new Error('Not implemented'); }
  pop(): string | null { throw new Error('Not implemented'); }
  get active(): Camera | null { throw new Error('Not implemented'); }
  get activeName(): string | null { throw new Error('Not implemented'); }
  has(_name: string): boolean { throw new Error('Not implemented'); }
  get names(): string[] { throw new Error('Not implemented'); }
  get stackDepth(): number { throw new Error('Not implemented'); }
}
