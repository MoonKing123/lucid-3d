/**
 * EventEmitter — 通用事件发射器
 * Lightweight typed event emitter for game objects.
 */

/** Event map: event name → callback signature */
export type EventMap = Record<string, (...args: any[]) => void>;

/**
 * Generic typed event emitter.
 * Usage:
 *   type MyEvents = { hit: (damage: number) => void; die: () => void };
 *   const emitter = new EventEmitter<MyEvents>();
 *   emitter.on('hit', (d) => console.log(d));
 *   emitter.emit('hit', 10);
 */
export class EventEmitter<T extends EventMap = EventMap> {
  private _listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  // 映射 once 原始监听器 -> wrapper，用于 off 时能移除 wrapper
  private _onceWrappers: Map<(...args: any[]) => void, (...args: any[]) => void> = new Map();

  on<K extends keyof T & string>(event: K, listener: T[K]): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(listener);
    return this;
  }

  once<K extends keyof T & string>(event: K, listener: T[K]): this {
    const wrapper = (...args: Parameters<T[K]>) => {
      this.off(event, listener);
      listener(...args);
    };
    // 记录 wrapper 对应的原始 listener，以便 off(listener) 时能找到 wrapper
    this._onceWrappers.set(listener, wrapper);
    this.on(event, wrapper as T[K]);
    return this;
  }

  off<K extends keyof T & string>(event: K, listener: T[K]): this {
    const listeners = this._listeners.get(event);
    if (!listeners) return this;

    // 检查是否是 once 注册的（通过原始 listener 找 wrapper）
    const wrapper = this._onceWrappers.get(listener);
    const target = wrapper ?? listener;

    const idx = listeners.indexOf(target);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }

    // 清理 once wrapper 映射
    if (wrapper) {
      this._onceWrappers.delete(listener);
    }

    return this;
  }

  emit<K extends keyof T & string>(event: K, ...args: Parameters<T[K]>): boolean {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.length === 0) return false;

    // snapshot 迭代：拷贝一份，避免遍历中 off 导致跳过
    const snapshot = listeners.slice();
    for (const listener of snapshot) {
      listener(...args);
    }
    return true;
  }

  removeAllListeners(event?: keyof T & string): this {
    if (event === undefined) {
      this._listeners.clear();
      this._onceWrappers.clear();
    } else {
      this._listeners.delete(event);
    }
    return this;
  }

  listenerCount(event: keyof T & string): number {
    return this._listeners.get(event)?.length ?? 0;
  }
}
