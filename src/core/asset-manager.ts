/**
 * AssetManager — 集中式资产加载器，提供 URL 级缓存、进度追踪和生命周期管理。
 * 所有资产通过 key 标识，相同 key 只加载一次。
 * @see test/unit/core/asset-manager.test.ts
 */

export const __STUB__ = true;

export class AssetManager {
  constructor() {
    throw new Error('STUB: AssetManager not implemented');
  }

  /** 加载资产（缓存命中直接返回，否则调用 loader） */
  async load<T>(_key: string, _loader: () => Promise<T>): Promise<T> {
    throw new Error('STUB: AssetManager.load not implemented');
  }

  /** 获取已缓存的资产（未加载返回 undefined） */
  get<T>(_key: string): T | undefined {
    throw new Error('STUB: AssetManager.get not implemented');
  }

  /** 检查资产是否已缓存 */
  has(_key: string): boolean {
    throw new Error('STUB: AssetManager.has not implemented');
  }

  /** 释放指定资产 */
  dispose(_key: string): boolean {
    throw new Error('STUB: AssetManager.dispose not implemented');
  }

  /** 释放所有资产 */
  disposeAll(): void {
    throw new Error('STUB: AssetManager.disposeAll not implemented');
  }

  /** 已缓存资产数量 */
  get size(): number {
    throw new Error('STUB: AssetManager.size not implemented');
  }

  /** 批量加载 + 进度回调 */
  async loadAll(
    _entries: Array<{ key: string; loader: () => Promise<unknown> }>,
    _onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    throw new Error('STUB: AssetManager.loadAll not implemented');
  }
}
