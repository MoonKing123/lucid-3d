/**
 * BlendTree1D — 1D 参数驱动的 AnimationAction 权重线性插值混合
 * @see test/unit/animation/blend-tree-1d.test.ts
 *
 * STUB FILE — Phase 55 KR2, 等 Forge 实现。
 */

import type { AnimationAction } from './animation-action';

export const __STUB__ = true;

export interface BlendTree1DEntry {
  threshold: number;
  action: AnimationAction;
}

export class BlendTree1D {
  constructor(_entries: BlendTree1DEntry[]) {
    throw new Error('BlendTree1D: stub not implemented (Phase 55 KR2)');
  }

  setParameter(_value: number): this {
    throw new Error('Not implemented');
  }

  get parameter(): number {
    throw new Error('Not implemented');
  }

  update(_deltaTime: number): void {
    throw new Error('Not implemented');
  }
}
