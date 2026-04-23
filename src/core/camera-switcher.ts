/**
 * CameraSwitcher — 多相机注册与切换管理器。
 * 注册多个命名相机，按名切换；支持堆栈模式（push/pop）。
 * 典型用途：游戏主视角 / 过场相机 / 调试俯视 / UI 相机 无缝切换。
 * @see test/unit/core/camera-switcher.test.ts
 */

import type { Camera } from './camera';

export class CameraSwitcher {
  private _cameras: Map<string, Camera> = new Map();
  private _activeName: string | null = null;
  private _stack: string[] = [];

  constructor() {}

  register(name: string, camera: Camera): void {
    if (this._cameras.has(name)) {
      throw new Error(`camera name already registered: ${name}`);
    }
    this._cameras.set(name, camera);
    // 首次注册自动激活
    if (this._activeName === null) {
      this._activeName = name;
    }
  }

  unregister(name: string): void {
    this._cameras.delete(name);
    if (this._activeName === name) {
      this._activeName = null;
    }
    // 从堆栈中移除同名条目
    this._stack = this._stack.filter(n => n !== name);
  }

  switchTo(name: string): void {
    if (!this._cameras.has(name)) {
      throw new Error(`camera not registered: ${name}`);
    }
    this._activeName = name;
  }

  push(name: string): void {
    if (this._activeName !== null) {
      this._stack.push(this._activeName);
    }
    this.switchTo(name);
  }

  pop(): string | null {
    if (this._stack.length === 0) return null;
    const prev = this._stack.pop()!;
    this.switchTo(prev);
    return prev;
  }

  get active(): Camera | null {
    if (this._activeName === null) return null;
    return this._cameras.get(this._activeName) ?? null;
  }

  get activeName(): string | null {
    return this._activeName;
  }

  has(name: string): boolean {
    return this._cameras.has(name);
  }

  get names(): string[] {
    return Array.from(this._cameras.keys());
  }

  get stackDepth(): number {
    return this._stack.length;
  }
}
