/**
 * StateMachine — 泛型有限状态机。
 * 支持状态进入/退出/更新回调、守卫条件、和帧更新。
 * @see test/unit/gameplay/state-machine.test.ts
 */

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
  private _states: Record<S, StateConfig<S>>;
  private _current: S;
  private _previous: S | null = null;
  private _rules: TransitionRule<S>[] = [];

  constructor(states: Record<S, StateConfig<S>>, initial: S) {
    this._states = states;
    this._current = initial;
    states[initial].onEnter?.();
  }

  get current(): S {
    return this._current;
  }

  get previous(): S | null {
    return this._previous;
  }

  canTransition(to: S): boolean {
    if (to === this._current) return false;
    // 检查当前状态是否有已注册的转换规则
    const rulesFromCurrent = this._rules.filter(r => r.from === this._current);
    if (rulesFromCurrent.length === 0) {
      // 无规则：自由切换
      return true;
    }
    // 有规则：只允许已注册且 guard 通过的转换
    const rule = rulesFromCurrent.find(r => r.to === to);
    if (!rule) return false;
    if (rule.guard && !rule.guard()) return false;
    return true;
  }

  transition(to: S): boolean {
    if (!this.canTransition(to)) return false;
    const from = this._current;
    this._states[from].onExit?.();
    this._previous = from;
    this._current = to;
    this._states[to].onEnter?.();
    return true;
  }

  update(dt: number): void {
    this._states[this._current].onUpdate?.(dt);
  }

  addTransition(from: S, to: S, guard?: () => boolean): void {
    this._rules.push({ from, to, guard });
  }

  isIn(state: S): boolean {
    return this._current === state;
  }
}
