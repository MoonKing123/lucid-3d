/**
 * CameraShake — 层叠式相机抖动管理器。
 * 支持多层抖动叠加（地震 + 爆炸 + 后坐力），每层独立衰减。
 * 使用伪随机噪声 + 指数衰减，输出 position + rotation offset 应用到相机。
 * @see test/unit/core/camera-shake.test.ts
 */

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

interface ShakeLayer {
  intensity: number;
  duration: number;
  frequency: number;
  decay: 'linear' | 'exponential';
  elapsed: number;
  // 每轴独立相位偏移：[posX, posY, posZ, rotX, rotY, rotZ]
  phases: [number, number, number, number, number, number];
}

// 预定义相位偏移，避免运行时随机但确保各轴独立
const PHASE_TABLE: Array<[number, number, number, number, number, number]> = [
  [0.0,  1.1,  2.3,  3.7,  4.9,  5.5],
  [0.7,  1.8,  3.1,  4.2,  0.3,  1.6],
  [1.4,  2.5,  3.8,  5.1,  0.9,  2.2],
  [2.1,  3.2,  4.5,  5.8,  1.5,  2.8],
  [2.8,  3.9,  5.2,  0.5,  2.1,  3.4],
  [3.5,  4.6,  5.9,  1.2,  2.7,  4.0],
  [4.2,  5.3,  0.6,  1.9,  3.3,  4.6],
  [4.9,  0.0,  1.3,  2.6,  3.9,  5.2],
];

let layerIdCounter = 0;

export class CameraShake {
  private layers: ShakeLayer[] = [];
  private _positionOffset: [number, number, number] = [0, 0, 0];
  private _rotationOffset: [number, number, number] = [0, 0, 0];

  add(options: ShakeLayerOptions): void {
    if (options.intensity <= 0) {
      throw new Error('CameraShake: intensity 必须 > 0');
    }
    if (options.duration <= 0) {
      throw new Error('CameraShake: duration 必须 > 0');
    }
    const phases = PHASE_TABLE[layerIdCounter % PHASE_TABLE.length];
    layerIdCounter++;
    this.layers.push({
      intensity: options.intensity,
      duration: options.duration,
      frequency: options.frequency ?? 30,
      decay: options.decay ?? 'exponential',
      elapsed: 0,
      phases,
    });
  }

  update(dt: number): void {
    for (const layer of this.layers) {
      layer.elapsed += dt;
    }
    // 移除已过期的层
    this.layers = this.layers.filter(l => l.elapsed < l.duration);
    this._recalculate();
  }

  get positionOffset(): [number, number, number] {
    return this._positionOffset;
  }

  get rotationOffset(): [number, number, number] {
    return this._rotationOffset;
  }

  get activeLayerCount(): number {
    return this.layers.length;
  }

  clear(): void {
    this.layers = [];
    this._positionOffset = [0, 0, 0];
    this._rotationOffset = [0, 0, 0];
  }

  private _recalculate(): void {
    if (this.layers.length === 0) {
      this._positionOffset = [0, 0, 0];
      this._rotationOffset = [0, 0, 0];
      return;
    }

    let px = 0, py = 0, pz = 0;
    let rx = 0, ry = 0, rz = 0;
    const TAU = Math.PI * 2;

    for (const layer of this.layers) {
      const t = layer.elapsed;
      const progress = t / layer.duration;
      let decayFactor: number;

      if (layer.decay === 'linear') {
        decayFactor = layer.intensity * (1 - progress);
      } else {
        decayFactor = layer.intensity * Math.exp(-3 * progress);
      }

      const freq = layer.frequency;
      const [p0, p1, p2, p3, p4, p5] = layer.phases;

      px += decayFactor * Math.sin(t * TAU * freq + p0);
      py += decayFactor * Math.sin(t * TAU * freq + p1);
      pz += decayFactor * Math.sin(t * TAU * freq + p2);
      // 旋转偏移量级约为位移的 0.1（弧度）
      rx += decayFactor * 0.1 * Math.sin(t * TAU * freq + p3);
      ry += decayFactor * 0.1 * Math.sin(t * TAU * freq + p4);
      rz += decayFactor * 0.1 * Math.sin(t * TAU * freq + p5);
    }

    this._positionOffset = [px, py, pz];
    this._rotationOffset = [rx, ry, rz];
  }
}
