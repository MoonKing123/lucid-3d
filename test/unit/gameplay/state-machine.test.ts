/**
 * StateMachine — pre-written tests (Architect)
 * Validates: states, transitions, guards, enter/exit/update hooks
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/gameplay/state-machine';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'die';

describeImpl('StateMachine', () => {
  function makeSimpleFSM() {
    return new mod.StateMachine<PlayerState>(
      {
        idle: {},
        run: {},
        jump: {},
        fall: {},
        die: {},
      },
      'idle',
    );
  }

  /* ---------- construction ---------- */

  it('should initialize with the given initial state', () => {
    const fsm = makeSimpleFSM();
    expect(fsm.current).toBe('idle');
  });

  it('should have null previous state initially', () => {
    const fsm = makeSimpleFSM();
    expect(fsm.previous).toBeNull();
  });

  it('should call onEnter of initial state on construction', () => {
    const enter = vi.fn();
    new mod.StateMachine<'a' | 'b'>({ a: { onEnter: enter }, b: {} }, 'a');
    expect(enter).toHaveBeenCalledOnce();
  });

  /* ---------- transition ---------- */

  it('should transition to a valid state', () => {
    const fsm = makeSimpleFSM();
    const result = fsm.transition('run');
    expect(result).toBe(true);
    expect(fsm.current).toBe('run');
  });

  it('should update previous state after transition', () => {
    const fsm = makeSimpleFSM();
    fsm.transition('run');
    expect(fsm.previous).toBe('idle');
  });

  it('should return false when transitioning to the same state', () => {
    const fsm = makeSimpleFSM();
    expect(fsm.transition('idle')).toBe(false);
    expect(fsm.current).toBe('idle');
  });

  it('should call onExit of old state and onEnter of new state', () => {
    const exitIdle = vi.fn();
    const enterRun = vi.fn();
    const fsm = new mod.StateMachine<'idle' | 'run'>(
      { idle: { onExit: exitIdle }, run: { onEnter: enterRun } },
      'idle',
    );
    fsm.transition('run');
    expect(exitIdle).toHaveBeenCalledOnce();
    expect(enterRun).toHaveBeenCalledOnce();
    // exit should be called before enter
    expect(exitIdle.mock.invocationCallOrder[0]).toBeLessThan(
      enterRun.mock.invocationCallOrder[0],
    );
  });

  /* ---------- guards / addTransition ---------- */

  it('should allow free transitions when no rules are defined', () => {
    const fsm = makeSimpleFSM();
    expect(fsm.transition('jump')).toBe(true);
    expect(fsm.transition('die')).toBe(true);
  });

  it('should respect addTransition rules when defined', () => {
    const fsm = makeSimpleFSM();
    fsm.addTransition('idle', 'run');
    fsm.addTransition('idle', 'jump');
    // idle → run allowed
    expect(fsm.canTransition('run')).toBe(true);
    // idle → die not allowed (no rule)
    expect(fsm.canTransition('die')).toBe(false);
    expect(fsm.transition('die')).toBe(false);
    expect(fsm.current).toBe('idle');
  });

  it('should reject transition when guard returns false', () => {
    const fsm = makeSimpleFSM();
    fsm.addTransition('idle', 'jump', () => false);
    expect(fsm.canTransition('jump')).toBe(false);
    expect(fsm.transition('jump')).toBe(false);
  });

  it('should allow transition when guard returns true', () => {
    let canJump = false;
    const fsm = makeSimpleFSM();
    fsm.addTransition('idle', 'jump', () => canJump);
    expect(fsm.transition('jump')).toBe(false);
    canJump = true;
    expect(fsm.transition('jump')).toBe(true);
    expect(fsm.current).toBe('jump');
  });

  /* ---------- update ---------- */

  it('should call onUpdate of current state with dt', () => {
    const updateFn = vi.fn();
    const fsm = new mod.StateMachine<'idle' | 'run'>(
      { idle: { onUpdate: updateFn }, run: {} },
      'idle',
    );
    fsm.update(0.016);
    expect(updateFn).toHaveBeenCalledWith(0.016);
  });

  it('should not crash if current state has no onUpdate', () => {
    const fsm = makeSimpleFSM();
    expect(() => fsm.update(0.016)).not.toThrow();
  });

  /* ---------- isIn ---------- */

  it('should return true for current state', () => {
    const fsm = makeSimpleFSM();
    expect(fsm.isIn('idle')).toBe(true);
    expect(fsm.isIn('run')).toBe(false);
  });

  /* ---------- multiple transitions ---------- */

  it('should track previous through multiple transitions', () => {
    const fsm = makeSimpleFSM();
    fsm.transition('run');
    fsm.transition('jump');
    expect(fsm.current).toBe('jump');
    expect(fsm.previous).toBe('run');
  });

  it('should allow multiple transitions from same state', () => {
    const fsm = makeSimpleFSM();
    fsm.addTransition('idle', 'run');
    fsm.addTransition('idle', 'jump');
    fsm.addTransition('run', 'idle');
    expect(fsm.transition('run')).toBe(true);
    expect(fsm.transition('idle')).toBe(true);
    expect(fsm.transition('jump')).toBe(true);
  });
});
