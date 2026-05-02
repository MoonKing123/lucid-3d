/**
 * Pre-written tests for AnimationStateMachine — state-driven AnimationAction switching.
 * AI must implement src/animation/animation-state-machine.ts
 *
 * AnimationStateMachine API:
 *   class AnimationStateMachine {
 *     constructor();
 *     addState(name: string, action: AnimationAction): this;       // 注册状态 + 关联 AnimationAction
 *     addTransition(from: string, to: string, condition: () => boolean, duration: number): this;
 *                                                                    // 注册条件转换 + 过渡时长
 *     setState(name: string): this;                                  // 立即切到目标状态(crossFadeTo)
 *     get currentState(): string | null;                             // 当前激活状态名
 *     update(dt: number): void;                                       // 推进 + 检查转换条件
 *   }
 *
 * Implementation notes:
 * - addState: 不重复注册同名状态(抛错). 第一次 addState 设当前状态为该状态, 调 action.play()
 * - addTransition: 不可重复注册相同 from→to 转换(抛错). from/to 必须先 addState
 * - setState: 若 name 不存在抛错. 当前状态 != name 时, 触发 crossFadeTo(currentAction, targetAction, lastTransition.duration || 0.3)
 * - update: 调每个 active action 的 _update(dt)；遍历 transitions; 第一个 from=currentState && condition()=true 触发 crossFadeTo
 *
 * Type A — STUB drop-in 级
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as mod from '../../../src/animation/animation-state-machine';
import { AnimationAction } from '../../../src/animation/animation-action';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { Skeleton } from '../../../src/animation/skeleton';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

function createAction(name: string, duration = 1): AnimationAction {
  const skeleton = new Skeleton([]);
  const clip = new AnimationClip(name, duration, []);
  return new AnimationAction(clip, skeleton);
}

describeImpl('AnimationStateMachine', () => {
  let sm: any;

  beforeEach(() => {
    sm = new (mod as any).AnimationStateMachine();
  });

  it('starts with currentState null', () => {
    expect(sm.currentState).toBe(null);
  });

  it('addState sets first state as current and plays action', () => {
    const idle = createAction('idle');
    sm.addState('idle', idle);
    expect(sm.currentState).toBe('idle');
    expect(idle.isRunning).toBe(true);
  });

  it('addState rejects duplicate name', () => {
    sm.addState('idle', createAction('idle'));
    expect(() => sm.addState('idle', createAction('idle2'))).toThrow();
  });

  it('addTransition rejects unknown from/to states', () => {
    sm.addState('idle', createAction('idle'));
    expect(() => sm.addTransition('unknown', 'idle', () => true, 0.3)).toThrow();
    expect(() => sm.addTransition('idle', 'unknown', () => true, 0.3)).toThrow();
  });

  it('addTransition rejects duplicate from→to', () => {
    sm.addState('idle', createAction('idle'));
    sm.addState('run', createAction('run'));
    sm.addTransition('idle', 'run', () => true, 0.3);
    expect(() => sm.addTransition('idle', 'run', () => true, 0.3)).toThrow();
  });

  it('setState rejects unknown state', () => {
    sm.addState('idle', createAction('idle'));
    expect(() => sm.setState('unknown')).toThrow();
  });

  it('setState triggers crossFade to target', () => {
    const idle = createAction('idle');
    const run = createAction('run');
    sm.addState('idle', idle);
    sm.addState('run', run);
    sm.addTransition('idle', 'run', () => false, 0.5);

    sm.setState('run');
    expect(sm.currentState).toBe('run');
    expect(run.isRunning).toBe(true);
  });

  it('setState same state is a no-op', () => {
    const idle = createAction('idle');
    sm.addState('idle', idle);
    sm.setState('idle'); // already idle
    expect(sm.currentState).toBe('idle');
    expect(idle.isRunning).toBe(true);
  });

  it('update advances current action time', () => {
    const idle = createAction('idle', 2);
    idle.loop = true;
    sm.addState('idle', idle);
    sm.update(0.5);
    expect(idle.time).toBeCloseTo(0.5, 5);
  });

  it('update triggers transition when condition fires', () => {
    const idle = createAction('idle');
    const run = createAction('run');
    sm.addState('idle', idle);
    sm.addState('run', run);
    let cond = false;
    sm.addTransition('idle', 'run', () => cond, 0.3);

    sm.update(0.1);
    expect(sm.currentState).toBe('idle');

    cond = true;
    sm.update(0.1);
    expect(sm.currentState).toBe('run');
  });

  it('multiple transitions: first matching condition wins', () => {
    sm.addState('idle', createAction('idle'));
    sm.addState('walk', createAction('walk'));
    sm.addState('run', createAction('run'));
    sm.addTransition('idle', 'walk', () => true, 0.2);
    sm.addTransition('idle', 'run', () => true, 0.3);

    sm.update(0.01);
    expect(sm.currentState).toBe('walk');
  });

  it('does not transition out of unrelated state', () => {
    sm.addState('idle', createAction('idle'));
    sm.addState('run', createAction('run'));
    sm.addState('jump', createAction('jump'));
    sm.addTransition('idle', 'run', () => true, 0.2);
    sm.setState('jump');

    sm.update(0.1);
    expect(sm.currentState).toBe('jump');
  });
});
