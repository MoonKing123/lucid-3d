/**
 * ObjectPool — 通用泛型对象池预写测试（Architect）
 * AI 必须实现 src/gameplay/object-pool.ts 使这些测试通过。
 *
 * API:
 *   class ObjectPool<T> {
 *     constructor(factory: () => T, reset: (item: T) => void, initialCapacity?: number);
 *     acquire(): T;
 *     release(item: T): void;
 *     prewarm(count: number): void;
 *     releaseAll(): void;
 *     get size(): number;       // total created
 *     get available(): number;  // in pool, ready to acquire
 *     get inUse(): number;      // currently acquired (size - available)
 *   }
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/object-pool';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { ObjectPool } = mod as any;

/* ═══════════════════════════════════════════
   Acquire — 基本获取行为
   ═══════════════════════════════════════════ */

describeImpl('ObjectPool — acquire', () => {
  it('pool 为空时调用 factory 创建新对象', () => {
    const factory = vi.fn(() => ({ val: 0 }));
    const pool = new ObjectPool(factory, () => {});
    const item = pool.acquire();
    expect(item).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('pool 有对象时从池中取而不调用 factory', () => {
    const factory = vi.fn(() => ({ val: 0 }));
    const pool = new ObjectPool(factory, () => {});
    pool.prewarm(1);
    factory.mockClear();
    pool.acquire();
    expect(factory).not.toHaveBeenCalled();
  });

  it('acquire 返回的对象是 factory 创建的对象', () => {
    const obj = { val: 42 };
    const pool = new ObjectPool(() => obj, () => {});
    const item = pool.acquire();
    expect(item).toBe(obj);
  });
});

/* ═══════════════════════════════════════════
   Release — 归还行为
   ═══════════════════════════════════════════ */

describeImpl('ObjectPool — release', () => {
  it('release 将对象归还到池中（available 增加）', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    const item = pool.acquire();
    expect(pool.available).toBe(0);
    pool.release(item);
    expect(pool.available).toBe(1);
  });

  it('release 调用 reset 函数重置对象状态', () => {
    const reset = vi.fn();
    const pool = new ObjectPool(() => ({ val: 0 }), reset);
    const item = pool.acquire();
    pool.release(item);
    expect(reset).toHaveBeenCalledWith(item);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('double-release 同一对象应为 no-op（available 不重复增加）', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    const item = pool.acquire();
    pool.release(item);
    pool.release(item); // 第二次应被忽略
    expect(pool.available).toBe(1);
  });
});

/* ═══════════════════════════════════════════
   Size / Available / InUse — 计数器
   ═══════════════════════════════════════════ */

describeImpl('ObjectPool — size / available / inUse', () => {
  it('size 返回已创建对象的总数', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.prewarm(3);
    expect(pool.size).toBe(3);
    pool.acquire(); // 从池中取，不新建
    expect(pool.size).toBe(3);
    pool.acquire(); // 从池中取
    pool.acquire(); // 从池中取
    pool.acquire(); // 池空，新建
    expect(pool.size).toBe(4);
  });

  it('available 和 inUse 随 acquire/release 正确更新', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.prewarm(2);
    expect(pool.available).toBe(2);
    expect(pool.inUse).toBe(0);

    const a = pool.acquire();
    expect(pool.available).toBe(1);
    expect(pool.inUse).toBe(1);

    pool.acquire();
    expect(pool.available).toBe(0);
    expect(pool.inUse).toBe(2);

    pool.release(a);
    expect(pool.available).toBe(1);
    expect(pool.inUse).toBe(1);
  });

  it('inUse 等于 size - available', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.prewarm(4);
    pool.acquire();
    pool.acquire();
    expect(pool.inUse).toBe(pool.size - pool.available);
  });
});

/* ═══════════════════════════════════════════
   Prewarm — 预热
   ═══════════════════════════════════════════ */

describeImpl('ObjectPool — prewarm', () => {
  it('prewarm(n) 预创建 n 个对象放入池中', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.prewarm(5);
    expect(pool.size).toBe(5);
    expect(pool.available).toBe(5);
    expect(pool.inUse).toBe(0);
  });

  it('constructor 第三参数 initialCapacity 等效于 prewarm', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {}, 3);
    expect(pool.size).toBe(3);
    expect(pool.available).toBe(3);
  });
});

/* ═══════════════════════════════════════════
   ReleaseAll — 全部归还
   ═══════════════════════════════════════════ */

describeImpl('ObjectPool — releaseAll', () => {
  it('releaseAll 将所有 in-use 对象归还到池中', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.acquire();
    pool.acquire();
    pool.acquire();
    expect(pool.inUse).toBe(3);

    pool.releaseAll();
    expect(pool.inUse).toBe(0);
    expect(pool.available).toBe(3);
  });

  it('releaseAll 调用 reset 重置所有 in-use 对象', () => {
    const reset = vi.fn();
    const pool = new ObjectPool(() => ({ val: 0 }), reset);
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('无 in-use 对象时 releaseAll 不应抛出', () => {
    const pool = new ObjectPool(() => ({ val: 0 }), () => {});
    pool.prewarm(2);
    expect(() => pool.releaseAll()).not.toThrow();
    expect(pool.available).toBe(2);
  });
});
