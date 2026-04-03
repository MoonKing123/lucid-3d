/**
 * ObjectPool — 通用泛型对象池
 * 通过 factory + reset 模式复用对象，避免 GC 压力。
 */

export class ObjectPool<T> {
  private _factory: () => T;
  private _reset: (item: T) => void;
  private _pool: T[] = [];
  private _inUse: Set<T> = new Set();

  constructor(factory: () => T, reset: (item: T) => void, initialCapacity = 0) {
    this._factory = factory;
    this._reset = reset;
    if (initialCapacity > 0) {
      this.prewarm(initialCapacity);
    }
  }

  /** 获取一个对象：优先从池中取，池空时调用 factory 新建 */
  acquire(): T {
    let item: T;
    if (this._pool.length > 0) {
      item = this._pool.pop()!;
    } else {
      item = this._factory();
    }
    this._inUse.add(item);
    return item;
  }

  /** 归还对象到池中；重复归还同一对象为 no-op */
  release(item: T): void {
    if (!this._inUse.has(item)) return;
    this._inUse.delete(item);
    this._reset(item);
    this._pool.push(item);
  }

  /** 预创建 count 个对象放入池中 */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this._pool.push(this._factory());
    }
  }

  /** 将所有 in-use 对象归还到池中 */
  releaseAll(): void {
    for (const item of this._inUse) {
      this._reset(item);
      this._pool.push(item);
    }
    this._inUse.clear();
  }

  /** 已创建对象总数 */
  get size(): number {
    return this._pool.length + this._inUse.size;
  }

  /** 池中可用对象数 */
  get available(): number {
    return this._pool.length;
  }

  /** 当前正在使用的对象数 */
  get inUse(): number {
    return this._inUse.size;
  }
}
