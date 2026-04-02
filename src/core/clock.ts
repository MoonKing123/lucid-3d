/**
 * Clock — 游戏循环时间管理。
 * 使用 performance.now() 提供高精度帧间隔和累计时间。
 */
export class Clock {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;

  constructor(autoStart = true) {
    this.autoStart = autoStart;
    this.startTime = 0;
    this.oldTime = 0;
    this.elapsedTime = 0;
    this.running = false;
  }

  /** 重置并开始计时。 */
  start(): void {
    const now = performance.now();
    this.startTime = now;
    this.oldTime = now;
    this.elapsedTime = 0;
    this.running = true;
  }

  /** 暂停计时（保留 elapsedTime）。 */
  stop(): void {
    // 先更新 elapsedTime 再停止
    this.getDelta();
    this.running = false;
  }

  /**
   * 返回自上次调用以来经过的秒数。
   * 首次调用（或未启动时）返回 0。
   * 停止后返回 0。
   */
  getDelta(): number {
    if (!this.running) {
      if (this.autoStart) {
        this.start();
      }
      return 0;
    }

    const now = performance.now();
    const delta = (now - this.oldTime) / 1000;
    this.oldTime = now;
    this.elapsedTime += delta;
    return delta;
  }

  /**
   * 返回自 start() 以来的总秒数。
   * 停止后返回冻结值。
   */
  getElapsed(): number {
    if (!this.running) {
      if (this.autoStart) {
        this.start();
        return 0;
      }
      return this.elapsedTime;
    }

    const now = performance.now();
    const delta = (now - this.oldTime) / 1000;
    this.oldTime = now;
    this.elapsedTime += delta;
    return this.elapsedTime;
  }
}
