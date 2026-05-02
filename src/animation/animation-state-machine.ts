/**
 * AnimationStateMachine — 状态机驱动 AnimationAction 切换
 * @see test/unit/animation/animation-state-machine.test.ts
 *
 * STUB FILE — Phase 55 KR1, 等 Forge 实现。
 */

import type { AnimationAction } from './animation-action';

export const __STUB__ = true;

export interface StateTransition {
  from: string;
  to: string;
  condition: () => boolean;
  duration: number;
}

export class AnimationStateMachine {
  constructor() {
    throw new Error('AnimationStateMachine: stub not implemented (Phase 55 KR1)');
  }

  addState(_name: string, _action: AnimationAction): this {
    throw new Error('Not implemented');
  }

  addTransition(_from: string, _to: string, _condition: () => boolean, _duration: number): this {
    throw new Error('Not implemented');
  }

  setState(_name: string): this {
    throw new Error('Not implemented');
  }

  get currentState(): string | null {
    throw new Error('Not implemented');
  }

  update(_deltaTime: number): void {
    throw new Error('Not implemented');
  }
}
