/**
 * BlendTree2D — 2D 参数驱动的 AnimationAction 权重 Gradient Band 混合
 * @see test/unit/animation/blend-tree-2d.test.ts
 *
 * STUB FILE — Phase 55 KR3, 等 Forge 实现。
 */

import type { AnimationAction } from './animation-action';

export const __STUB__ = true;

export interface BlendTree2DEntry {
  position: { x: number; y: number };
  action: AnimationAction;
}

export class BlendTree2D {
  constructor(_entries: BlendTree2DEntry[]) {
    throw new Error('BlendTree2D: stub not implemented (Phase 55 KR3)');
  }

  setParameters(_x: number, _y: number): this {
    throw new Error('Not implemented');
  }

  get parameterX(): number {
    throw new Error('Not implemented');
  }

  get parameterY(): number {
    throw new Error('Not implemented');
  }

  update(_deltaTime: number): void {
    throw new Error('Not implemented');
  }
}
