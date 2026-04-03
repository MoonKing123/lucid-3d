/**
 * Timer — 基于帧更新的游戏定时器系统。
 * 支持 setTimeout（延迟执行）和 setInterval（重复执行）。
 * 通过 update(dt) 驱动，无需依赖 Web API。
 */

/** 定时器句柄，用于 cancel 操作 */
export type TimerHandle = number;

/** 内部定时器条目 */
interface TimerEntry {
  handle: TimerHandle;
  callback: () => void;
  /** 下次触发的剩余时间（秒） */
  remaining: number;
  /** 重复间隔（秒），0 表示一次性 */
  interval: number;
  /** 是否为重复定时器 */
  repeating: boolean;
}

export class Timer {
  private _paused: boolean;
  private _entries: Map<TimerHandle, TimerEntry>;
  private _nextHandle: TimerHandle;

  constructor(options?: { paused?: boolean }) {
    this._paused = options?.paused ?? false;
    this._entries = new Map();
    this._nextHandle = 1;
  }

  /**
   * 延迟 delay 秒后触发一次回调，触发后自动移除。
   */
  setTimeout(callback: () => void, delay: number): TimerHandle {
    const handle = this._nextHandle++;
    this._entries.set(handle, {
      handle,
      callback,
      remaining: delay,
      interval: 0,
      repeating: false,
    });
    return handle;
  }

  /**
   * 每 interval 秒重复触发回调。
   * 若单帧 dt > interval，该帧内可触发多次。
   */
  setInterval(callback: () => void, interval: number): TimerHandle {
    const handle = this._nextHandle++;
    this._entries.set(handle, {
      handle,
      callback,
      remaining: interval,
      interval,
      repeating: true,
    });
    return handle;
  }

  /**
   * 取消指定句柄的定时器。
   * @returns 若找到并取消返回 true，否则返回 false
   */
  cancel(handle: TimerHandle): boolean {
    return this._entries.delete(handle);
  }

  /** 取消所有活跃定时器 */
  cancelAll(): void {
    this._entries.clear();
  }

  /**
   * 驱动时间推进，应在每帧调用。
   * 暂停时直接返回，不推进时间。
   * 使用快照迭代，回调中新增的定时器不在当前帧触发。
   */
  update(dt: number): void {
    if (this._paused) return;

    // 快照：防止回调中新增/删除条目影响当前帧迭代
    const entries = Array.from(this._entries.values());

    for (const entry of entries) {
      // 条目可能已被之前的回调 cancel 掉
      if (!this._entries.has(entry.handle)) continue;

      entry.remaining -= dt;

      if (entry.repeating) {
        // setInterval：while 循环处理单帧多次触发
        while (entry.remaining <= 0) {
          // 条目在回调期间可能被取消
          if (!this._entries.has(entry.handle)) break;
          entry.callback();
          if (!this._entries.has(entry.handle)) break;
          entry.remaining += entry.interval;
        }
      } else {
        // setTimeout：触发一次后移除
        if (entry.remaining <= 0) {
          this._entries.delete(entry.handle);
          entry.callback();
        }
      }
    }
  }

  /** 暂停所有定时器的时间累积 */
  pause(): void {
    this._paused = true;
  }

  /** 恢复所有定时器的时间累积 */
  resume(): void {
    this._paused = false;
  }

  /** 当前是否处于暂停状态 */
  get paused(): boolean {
    return this._paused;
  }

  /** 当前活跃（未完成/未取消）的定时器数量 */
  get activeCount(): number {
    return this._entries.size;
  }
}
