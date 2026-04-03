/**
 * AssetManager — 集中式资产加载、缓存、进度追踪预写测试（Architect）
 * AI 必须实现 src/core/asset-manager.ts 使这些测试通过。
 *
 * API:
 *   class AssetManager {
 *     constructor();
 *     load<T>(key: string, loader: () => Promise<T>): Promise<T>;
 *     get<T>(key: string): T | undefined;
 *     has(key: string): boolean;
 *     dispose(key: string): boolean;
 *     disposeAll(): void;
 *     get size(): number;
 *     loadAll(
 *       entries: Array<{ key: string; loader: () => Promise<unknown> }>,
 *       onProgress?: (loaded: number, total: number) => void,
 *     ): Promise<void>;
 *   }
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../src/core/asset-manager';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { AssetManager } = mod as any;

/* ═══════════════════════════════════════════
   load — 单资产加载与缓存
   ═══════════════════════════════════════════ */

describeImpl('AssetManager.load', () => {
  it('首次加载调用 loader 并缓存结果', async () => {
    const mgr = new AssetManager();
    const loader = vi.fn(async () => 'texture-data');
    const result = await mgr.load('tex1', loader);
    expect(result).toBe('texture-data');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mgr.has('tex1')).toBe(true);
  });

  it('二次加载同一 key 直接返回缓存，不再调用 loader', async () => {
    const mgr = new AssetManager();
    const loader = vi.fn(async () => ({ id: 42 }));
    const a = await mgr.load('obj', loader);
    const b = await mgr.load('obj', loader);
    expect(a).toBe(b); // 同一引用
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('loader 抛错时 Promise reject，且不缓存', async () => {
    const mgr = new AssetManager();
    const loader = vi.fn(async () => { throw new Error('network'); });
    await expect(mgr.load('fail', loader)).rejects.toThrow('network');
    expect(mgr.has('fail')).toBe(false);
  });

  it('并发加载同一 key 只触发一次 loader', async () => {
    const mgr = new AssetManager();
    let resolveLoader!: (v: string) => void;
    const loader = vi.fn(() => new Promise<string>((r) => { resolveLoader = r; }));
    const p1 = mgr.load('shared', loader);
    const p2 = mgr.load('shared', loader);
    resolveLoader('done');
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('done');
    expect(r2).toBe('done');
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════
   get / has / size — 缓存查询
   ═══════════════════════════════════════════ */

describeImpl('AssetManager cache query', () => {
  it('get 返回已缓存的资产', async () => {
    const mgr = new AssetManager();
    await mgr.load('a', async () => 123);
    expect(mgr.get('a')).toBe(123);
  });

  it('get 未缓存时返回 undefined', () => {
    const mgr = new AssetManager();
    expect(mgr.get('none')).toBeUndefined();
  });

  it('has 对已缓存的 key 返回 true', async () => {
    const mgr = new AssetManager();
    await mgr.load('x', async () => 'v');
    expect(mgr.has('x')).toBe(true);
    expect(mgr.has('y')).toBe(false);
  });

  it('size 返回缓存数量', async () => {
    const mgr = new AssetManager();
    expect(mgr.size).toBe(0);
    await mgr.load('a', async () => 1);
    await mgr.load('b', async () => 2);
    expect(mgr.size).toBe(2);
  });
});

/* ═══════════════════════════════════════════
   dispose — 释放资产
   ═══════════════════════════════════════════ */

describeImpl('AssetManager.dispose', () => {
  it('dispose 移除缓存并返回 true', async () => {
    const mgr = new AssetManager();
    await mgr.load('t', async () => 'val');
    expect(mgr.dispose('t')).toBe(true);
    expect(mgr.has('t')).toBe(false);
    expect(mgr.size).toBe(0);
  });

  it('dispose 不存在的 key 返回 false', () => {
    const mgr = new AssetManager();
    expect(mgr.dispose('nope')).toBe(false);
  });

  it('disposeAll 清空全部缓存', async () => {
    const mgr = new AssetManager();
    await mgr.load('a', async () => 1);
    await mgr.load('b', async () => 2);
    await mgr.load('c', async () => 3);
    mgr.disposeAll();
    expect(mgr.size).toBe(0);
    expect(mgr.has('a')).toBe(false);
  });

  it('dispose 后重新 load 同一 key 会再次调用 loader', async () => {
    const mgr = new AssetManager();
    const loader = vi.fn(async () => 'fresh');
    await mgr.load('k', loader);
    mgr.dispose('k');
    await mgr.load('k', loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

/* ═══════════════════════════════════════════
   loadAll — 批量加载 + 进度回调
   ═══════════════════════════════════════════ */

describeImpl('AssetManager.loadAll', () => {
  it('批量加载所有资产', async () => {
    const mgr = new AssetManager();
    const entries = [
      { key: 'a', loader: async () => 'A' },
      { key: 'b', loader: async () => 'B' },
      { key: 'c', loader: async () => 'C' },
    ];
    await mgr.loadAll(entries);
    expect(mgr.get('a')).toBe('A');
    expect(mgr.get('b')).toBe('B');
    expect(mgr.get('c')).toBe('C');
    expect(mgr.size).toBe(3);
  });

  it('进度回调被正确调用', async () => {
    const mgr = new AssetManager();
    const progress = vi.fn();
    const entries = [
      { key: 'x', loader: async () => 1 },
      { key: 'y', loader: async () => 2 },
    ];
    await mgr.loadAll(entries, progress);
    // 至少被调用 entries.length 次
    expect(progress).toHaveBeenCalledTimes(2);
    // 最后一次调用应为 (2, 2)
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('部分 loader 失败时仍加载其余资产', async () => {
    const mgr = new AssetManager();
    const entries = [
      { key: 'ok1', loader: async () => 'good' },
      { key: 'bad', loader: async () => { throw new Error('fail'); } },
      { key: 'ok2', loader: async () => 'also good' },
    ];
    // loadAll 应在所有任务完成后 resolve（不因单个失败 reject）
    await mgr.loadAll(entries);
    expect(mgr.has('ok1')).toBe(true);
    expect(mgr.has('bad')).toBe(false);
    expect(mgr.has('ok2')).toBe(true);
  });
});
