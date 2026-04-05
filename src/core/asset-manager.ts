/**
 * AssetManager — 集中式资产加载器，提供 URL 级缓存、进度追踪和生命周期管理。
 * 所有资产通过 key 标识，相同 key 只加载一次。
 * @see test/unit/core/asset-manager.test.ts
 */

export class AssetManager {
  private cache = new Map<string, unknown>();
  private pending = new Map<string, Promise<unknown>>();

  /** 加载资产（缓存命中直接返回，否则调用 loader） */
  async load<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // 并发安全：同一 key 共享同一 Promise
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    const promise = loader().then(
      (value) => {
        this.cache.set(key, value);
        this.pending.delete(key);
        return value;
      },
      (err) => {
        // 失败不缓存，允许重试
        this.pending.delete(key);
        throw err;
      },
    );

    this.pending.set(key, promise);
    return promise as Promise<T>;
  }

  /** 获取已缓存的资产（未加载返回 undefined） */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /** 检查资产是否已缓存 */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /** 释放指定资产 */
  dispose(key: string): boolean {
    return this.cache.delete(key);
  }

  /** 释放所有资产 */
  disposeAll(): void {
    this.cache.clear();
  }

  /** 已缓存资产数量 */
  get size(): number {
    return this.cache.size;
  }

  /** 批量加载 + 进度回调（单个失败不影响其余） */
  async loadAll(
    entries: Array<{ key: string; loader: () => Promise<unknown> }>,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const total = entries.length;
    let loaded = 0;

    for (const { key, loader } of entries) {
      try {
        await this.load(key, loader);
      } catch {
        // 跳过失败项，继续加载其余资产
      }
      loaded++;
      onProgress?.(loaded, total);
    }
  }
}
