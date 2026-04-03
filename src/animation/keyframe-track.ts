/**
 * KeyframeTrack — 关键帧轨道，支持 LINEAR 和 STEP 插值。
 * @see test/unit/animation/keyframe-track.test.ts
 */

import { slerp } from '../math/quat';

export type InterpolationType = 'LINEAR' | 'STEP';
export type TargetPath = 'translation' | 'rotation' | 'scale';

export class KeyframeTrack {
  readonly targetPath: TargetPath;
  readonly jointIndex: number;
  readonly times: Float32Array;
  readonly values: Float32Array;
  readonly interpolation: InterpolationType;

  constructor(opts: {
    targetPath: TargetPath;
    jointIndex: number;
    times: Float32Array;
    values: Float32Array;
    interpolation?: InterpolationType;
  }) {
    this.targetPath = opts.targetPath;
    this.jointIndex = opts.jointIndex;
    this.times = opts.times;
    this.values = opts.values;
    this.interpolation = opts.interpolation ?? 'LINEAR';
  }

  get duration(): number {
    if (this.times.length === 0) return 0;
    return this.times[this.times.length - 1];
  }

  sample(time: number, out: Float32Array): void {
    const n = this.times.length;
    const stride = this.targetPath === 'rotation' ? 4 : 3;

    // 夹紧到第一帧
    if (time <= this.times[0]) {
      for (let i = 0; i < stride; i++) out[i] = this.values[i];
      return;
    }

    // 夹紧到最后一帧
    if (time >= this.times[n - 1]) {
      const base = (n - 1) * stride;
      for (let i = 0; i < stride; i++) out[i] = this.values[base + i];
      return;
    }

    // 二分查找：找最大的 i 使得 times[i] <= time
    let lo = 0, hi = n - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (this.times[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    const i0 = lo;
    const i1 = i0 + 1;
    const base0 = i0 * stride;
    const base1 = i1 * stride;

    if (this.interpolation === 'STEP') {
      for (let i = 0; i < stride; i++) out[i] = this.values[base0 + i];
      return;
    }

    // LINEAR 插值
    const t = (time - this.times[i0]) / (this.times[i1] - this.times[i0]);

    if (this.targetPath === 'rotation') {
      // 四元数球面线性插值
      const a = this.values.subarray(base0, base0 + 4);
      const b = this.values.subarray(base1, base1 + 4);
      const result = slerp(a, b, t);
      out[0] = result[0]; out[1] = result[1]; out[2] = result[2]; out[3] = result[3];
    } else {
      // vec3 线性插值
      for (let i = 0; i < 3; i++) {
        out[i] = this.values[base0 + i] + t * (this.values[base1 + i] - this.values[base0 + i]);
      }
    }
  }
}
