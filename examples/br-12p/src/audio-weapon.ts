/**
 * WeaponAudio — 武器音效管理器。
 * 封装枪声/换弹/空仓音效的播放逻辑。
 * headless 模式下（无 AudioContext）自动降级为无声操作。
 */

export class WeaponAudio {
  private _available: boolean = false;

  constructor() {
    // 运行时检测 Web Audio API 是否可用
    try {
      this._available = typeof AudioContext !== 'undefined' || typeof (globalThis as any).AudioContext !== 'undefined';
    } catch {
      this._available = false;
    }
  }

  /** 播放开枪音效 */
  playFire(): void {
    if (!this._available) return;
    // TODO: 接入 PositionalAudio 播放枪声剪辑
  }

  /** 播放换弹音效 */
  playReload(): void {
    if (!this._available) return;
    // TODO: 接入 PositionalAudio 播放换弹剪辑
  }

  /** 播放空仓音效（枪机空打） */
  playEmpty(): void {
    if (!this._available) return;
    // TODO: 接入 PositionalAudio 播放空仓剪辑
  }

  /** Web Audio API 是否可用 */
  get available(): boolean {
    return this._available;
  }
}
