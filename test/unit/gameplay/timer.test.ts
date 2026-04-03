/**
 * Timer 游戏定时器测试 — 共 20 个测试用例。
 * 测试基于帧更新的 setTimeout / setInterval / cancel / pause / resume 行为。
 *
 * API:
 *   type TimerHandle = number;
 *   class Timer {
 *     constructor(options?: { paused?: boolean });
 *     setTimeout(callback: () => void, delay: number): TimerHandle;
 *     setInterval(callback: () => void, interval: number): TimerHandle;
 *     cancel(handle: TimerHandle): boolean;
 *     cancelAll(): void;
 *     update(dt: number): void;
 *     pause(): void;
 *     resume(): void;
 *     get paused(): boolean;
 *     get activeCount(): number;
 *   }
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/timer';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Timer } = mod as any;

/* ═══════════════════════════════════════════
   构造函数
   ═══════════════════════════════════════════ */

describeImpl('Timer — 构造函数', () => {
  it('默认构造时 paused 为 false', () => {
    const timer = new Timer();
    expect(timer.paused).toBe(false);
  });

  it('可通过 options.paused 初始化为暂停状态', () => {
    const timer = new Timer({ paused: true });
    expect(timer.paused).toBe(true);
  });

  it('初始 activeCount 为 0', () => {
    const timer = new Timer();
    expect(timer.activeCount).toBe(0);
  });
});

/* ═══════════════════════════════════════════
   setTimeout
   ═══════════════════════════════════════════ */

describeImpl('Timer — setTimeout', () => {
  it('setTimeout 返回有效句柄（正整数）', () => {
    const timer = new Timer();
    const handle = timer.setTimeout(() => {}, 1);
    expect(typeof handle).toBe('number');
    expect(handle).toBeGreaterThan(0);
  });

  it('注册后 activeCount 增加 1', () => {
    const timer = new Timer();
    timer.setTimeout(() => {}, 1);
    expect(timer.activeCount).toBe(1);
  });

  it('延迟未到时回调不触发', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.update(0.5);
    expect(cb).not.toHaveBeenCalled();
  });

  it('延迟到达时回调触发一次', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.update(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('触发后自动移除，activeCount 归零', () => {
    const timer = new Timer();
    timer.setTimeout(() => {}, 1);
    timer.update(1);
    expect(timer.activeCount).toBe(0);
  });

  it('超时超过 delay 仍只触发一次', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.update(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('多次 update 累计到达 delay 后触发', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.update(0.4);
    timer.update(0.4);
    expect(cb).not.toHaveBeenCalled();
    timer.update(0.3); // 累计 1.1 > 1
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

/* ═══════════════════════════════════════════
   setInterval
   ═══════════════════════════════════════════ */

describeImpl('Timer — setInterval', () => {
  it('setInterval 返回有效句柄', () => {
    const timer = new Timer();
    const handle = timer.setInterval(() => {}, 1);
    expect(typeof handle).toBe('number');
    expect(handle).toBeGreaterThan(0);
  });

  it('每次 interval 触发一次', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setInterval(cb, 1);
    timer.update(1);
    expect(cb).toHaveBeenCalledTimes(1);
    timer.update(1);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('触发后不自动移除，activeCount 保持 1', () => {
    const timer = new Timer();
    timer.setInterval(() => {}, 1);
    timer.update(1);
    expect(timer.activeCount).toBe(1);
  });

  it('单帧 dt > interval 时该帧触发多次', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setInterval(cb, 0.5);
    timer.update(1.6); // 应触发 3 次（0.5, 1.0, 1.5）
    expect(cb).toHaveBeenCalledTimes(3);
  });
});

/* ═══════════════════════════════════════════
   cancel / cancelAll
   ═══════════════════════════════════════════ */

describeImpl('Timer — cancel / cancelAll', () => {
  it('cancel 已存在的句柄返回 true，activeCount 减 1', () => {
    const timer = new Timer();
    const handle = timer.setTimeout(() => {}, 1);
    const result = timer.cancel(handle);
    expect(result).toBe(true);
    expect(timer.activeCount).toBe(0);
  });

  it('cancel 不存在的句柄返回 false', () => {
    const timer = new Timer();
    const result = timer.cancel(9999);
    expect(result).toBe(false);
  });

  it('cancel 后回调不再触发', () => {
    const timer = new Timer();
    const cb = vi.fn();
    const handle = timer.setTimeout(cb, 1);
    timer.cancel(handle);
    timer.update(2);
    expect(cb).not.toHaveBeenCalled();
  });

  it('cancelAll 清除所有定时器', () => {
    const timer = new Timer();
    timer.setTimeout(() => {}, 1);
    timer.setInterval(() => {}, 0.5);
    timer.cancelAll();
    expect(timer.activeCount).toBe(0);
  });
});

/* ═══════════════════════════════════════════
   pause / resume
   ═══════════════════════════════════════════ */

describeImpl('Timer — pause / resume', () => {
  it('pause 后 update 不推进时间，回调不触发', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.pause();
    timer.update(2);
    expect(cb).not.toHaveBeenCalled();
  });

  it('resume 后时间继续推进', () => {
    const timer = new Timer();
    const cb = vi.fn();
    timer.setTimeout(cb, 1);
    timer.pause();
    timer.update(2);
    timer.resume();
    timer.update(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('pause/resume 状态正确切换', () => {
    const timer = new Timer();
    expect(timer.paused).toBe(false);
    timer.pause();
    expect(timer.paused).toBe(true);
    timer.resume();
    expect(timer.paused).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   回调中新建 timer
   ═══════════════════════════════════════════ */

describeImpl('Timer — 回调中新建 timer', () => {
  it('回调中新建的 timer 不在当前帧触发', () => {
    const timer = new Timer();
    const innerCb = vi.fn();
    timer.setTimeout(() => {
      // 在触发时注册一个立即到期的 timer
      timer.setTimeout(innerCb, 0);
    }, 0.5);

    timer.update(1); // 外层 timer 触发，内层 timer 注册
    // 内层 timer 此时已加入，但当前帧快照已取，不应触发
    expect(innerCb).not.toHaveBeenCalled();

    // 下一帧才触发内层 timer
    timer.update(0.1);
    expect(innerCb).toHaveBeenCalledTimes(1);
  });
});
