/**
 * StateMachine — 泛型有限状态机。
 * 支持状态进入/退出/更新回调、守卫条件、和帧更新。
 * @see test/unit/gameplay/state-machine.test.ts
 */

export const __STUB__ = true;

export interface StateConfig<S extends string> {
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (dt: number) => void;
}

export interface TransitionRule<S extends string> {
  from: S;
  to: S;
  guard?: () => boolean;
}

export class StateMachine<S extends string> {
  constructor(_states: Record<S, StateConfig<S>>, _initial: S) {
    throw new Error('STUB');
  }
  get current(): S { throw new Error('STUB'); }
  get previous(): S | null { throw new Error('STUB'); }
  transition(_to: S): boolean { throw new Error('STUB'); }
  canTransition(_to: S): boolean { throw new Error('STUB'); }
  update(_dt: number): void { throw new Error('STUB'); }
  addTransition(_from: S, _to: S, _guard?: () => boolean): void { throw new Error('STUB'); }
  isIn(_state: S): boolean { throw new Error('STUB'); }
}
