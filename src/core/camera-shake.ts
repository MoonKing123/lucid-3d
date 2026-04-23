/**
 * CameraShake — 层叠式相机抖动管理器。
 * 支持多层抖动叠加（地震 + 爆炸 + 后坐力），每层独立衰减。
 * 使用伪随机噪声 + 指数衰减，输出 position + rotation offset 应用到相机。
 * @see test/unit/core/camera-shake.test.ts
 */

export const __STUB__ = true;

export interface ShakeLayerOptions {
  /** 抖动强度（位移幅度，单位米），必须 > 0 */
  intensity: number;
  /** 持续时长（秒），必须 > 0 */
  duration: number;
  /** 抖动频率（Hz），默认 30 */
  frequency?: number;
  /** 衰减曲线 'linear' | 'exponential'，默认 'exponential' */
  decay?: 'linear' | 'exponential';
}

export class CameraShake {
  constructor() { throw new Error('Not implemented'); }
  add(_options: ShakeLayerOptions): void { throw new Error('Not implemented'); }
  update(_dt: number): void { throw new Error('Not implemented'); }
  get positionOffset(): [number, number, number] { throw new Error('Not implemented'); }
  get rotationOffset(): [number, number, number] { throw new Error('Not implemented'); }
  get activeLayerCount(): number { throw new Error('Not implemented'); }
  clear(): void { throw new Error('Not implemented'); }
}
