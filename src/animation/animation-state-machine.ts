/**
 * AnimationStateMachine — 状态机驱动 AnimationAction 切换
 * @see test/unit/animation/animation-state-machine.test.ts
 */

import type { AnimationAction } from './animation-action';

export interface StateTransition {
  from: string;
  to: string;
  condition: () => boolean;
  duration: number;
}

export class AnimationStateMachine {
  private _states: Map<string, AnimationAction> = new Map();
  private _transitions: StateTransition[] = [];
  private _currentState: string | null = null;

  constructor() {}

  addState(name: string, action: AnimationAction): this {
    if (this._states.has(name)) {
      throw new Error(`AnimationStateMachine: 状态 "${name}" 已存在`);
    }
    this._states.set(name, action);
    if (this._currentState === null) {
      this._currentState = name;
      action.play();
    }
    return this;
  }

  addTransition(from: string, to: string, condition: () => boolean, duration: number): this {
    if (!this._states.has(from)) {
      throw new Error(`AnimationStateMachine: 未知状态 "${from}"`);
    }
    if (!this._states.has(to)) {
      throw new Error(`AnimationStateMachine: 未知状态 "${to}"`);
    }
    if (this._transitions.some(t => t.from === from && t.to === to)) {
      throw new Error(`AnimationStateMachine: 转换 "${from}→${to}" 已存在`);
    }
    this._transitions.push({ from, to, condition, duration });
    return this;
  }

  setState(name: string): this {
    if (!this._states.has(name)) {
      throw new Error(`AnimationStateMachine: 未知状态 "${name}"`);
    }
    if (this._currentState === name) return this;

    if (this._currentState !== null) {
      const currentAction = this._states.get(this._currentState)!;
      const targetAction = this._states.get(name)!;
      const transition = this._transitions.find(t => t.from === this._currentState && t.to === name);
      const duration = transition ? transition.duration : 0.3;
      currentAction.crossFadeTo(targetAction, duration);
    } else {
      this._states.get(name)!.play();
    }

    this._currentState = name;
    return this;
  }

  get currentState(): string | null {
    return this._currentState;
  }

  update(deltaTime: number): void {
    for (const action of this._states.values()) {
      if (action.isRunning) {
        action._update(deltaTime);
      }
    }

    if (this._currentState === null) return;

    for (const transition of this._transitions) {
      if (transition.from === this._currentState && transition.condition()) {
        this.setState(transition.to);
        break;
      }
    }
  }
}
