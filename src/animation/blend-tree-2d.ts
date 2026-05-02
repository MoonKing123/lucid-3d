/**
 * BlendTree2D — 2D 参数驱动的 AnimationAction 权重 Gradient Band 混合
 * @see test/unit/animation/blend-tree-2d.test.ts
 *
 * 算法：Inverse Distance Weighting (IDW)，权重 = 1/d^2，归一化使 sum=1
 */

import type { AnimationAction } from './animation-action';

export interface BlendTree2DEntry {
  position: { x: number; y: number };
  action: AnimationAction;
}

const EPSILON = 1e-6;

export class BlendTree2D {
  private readonly _entries: BlendTree2DEntry[];
  private _px: number = 0;
  private _py: number = 0;

  constructor(entries: BlendTree2DEntry[]) {
    if (entries.length === 0) {
      throw new Error('BlendTree2D: entries 不能为空');
    }

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i].position;
        const b = entries[j].position;
        if (Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON) {
          throw new Error(`BlendTree2D: 不允许重复 position (${a.x}, ${a.y})`);
        }
      }
    }

    this._entries = entries;
    for (const entry of entries) {
      entry.action.play();
    }
  }

  setParameters(x: number, y: number): this {
    this._px = x;
    this._py = y;
    return this;
  }

  get parameterX(): number { return this._px; }
  get parameterY(): number { return this._py; }

  update(deltaTime: number): void {
    for (const entry of this._entries) {
      entry.action._update(deltaTime);
    }

    if (this._entries.length === 1) {
      this._entries[0].action.weight = 1;
      return;
    }

    const px = this._px;
    const py = this._py;

    // 检查精确命中
    for (let i = 0; i < this._entries.length; i++) {
      const pos = this._entries[i].position;
      const dx = px - pos.x;
      const dy = py - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= EPSILON) {
        for (let j = 0; j < this._entries.length; j++) {
          this._entries[j].action.weight = j === i ? 1 : 0;
        }
        return;
      }
    }

    // IDW 权重计算
    let total = 0;
    const raws: number[] = new Array(this._entries.length);
    for (let i = 0; i < this._entries.length; i++) {
      const pos = this._entries[i].position;
      const dx = px - pos.x;
      const dy = py - pos.y;
      const d2 = dx * dx + dy * dy;
      raws[i] = 1 / d2;
      total += raws[i];
    }

    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i].action.weight = raws[i] / total;
    }
  }
}
