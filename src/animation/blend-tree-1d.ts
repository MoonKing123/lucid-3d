/**
 * BlendTree1D — 1D 参数驱动的 AnimationAction 权重线性插值混合
 * @see test/unit/animation/blend-tree-1d.test.ts
 */

import type { AnimationAction } from './animation-action';

export interface BlendTree1DEntry {
  threshold: number;
  action: AnimationAction;
}

export class BlendTree1D {
  private readonly _entries: BlendTree1DEntry[];
  private _param: number;

  constructor(entries: BlendTree1DEntry[]) {
    if (entries.length < 2) {
      throw new Error('BlendTree1D: 至少需要 2 个 entry');
    }
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].threshold <= entries[i - 1].threshold) {
        throw new Error('BlendTree1D: threshold 必须严格升序');
      }
    }
    this._entries = entries;
    this._param = entries[0].threshold;
    for (const entry of entries) {
      entry.action.play();
    }
  }

  setParameter(value: number): this {
    const min = this._entries[0].threshold;
    const max = this._entries[this._entries.length - 1].threshold;
    this._param = Math.max(min, Math.min(max, value));
    return this;
  }

  get parameter(): number {
    return this._param;
  }

  update(deltaTime: number): void {
    for (const entry of this._entries) {
      entry.action._update(deltaTime);
    }

    const entries = this._entries;
    const last = entries.length - 1;

    // 找到 _param 所在的区间
    let segIndex = last - 1;
    for (let i = 0; i < last; i++) {
      if (this._param < entries[i + 1].threshold) {
        segIndex = i;
        break;
      }
    }

    const lo = entries[segIndex];
    const hi = entries[segIndex + 1];
    const range = hi.threshold - lo.threshold;
    const t = range > 0 ? (this._param - lo.threshold) / range : 0;

    for (let i = 0; i < entries.length; i++) {
      if (i === segIndex) {
        entries[i].action.weight = 1 - t;
      } else if (i === segIndex + 1) {
        entries[i].action.weight = t;
      } else {
        entries[i].action.weight = 0;
      }
    }
  }
}
