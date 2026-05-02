/**
 * Pre-written tests for BlendTree1D — 1D parameter-driven AnimationAction weight blending.
 * AI must implement src/animation/blend-tree-1d.ts
 *
 * BlendTree1D API:
 *   class BlendTree1D {
 *     constructor(entries: { threshold: number; action: AnimationAction }[]);
 *                                          // entries 至少 2 个; threshold 必须严格升序; 否则抛错
 *     setParameter(value: number): this;   // 设置混合参数, 自动 clamp 到 [min, max]
 *     get parameter(): number;
 *     update(dt: number): void;             // 调用每个 action._update(dt) + 设置 weight
 *   }
 *
 * Implementation notes:
 * - 参数 value 在 entries[i].threshold 和 entries[i+1].threshold 之间时:
 *     t = (value - entries[i].threshold) / (entries[i+1].threshold - entries[i].threshold)
 *     entries[i].action.weight = 1 - t
 *     entries[i+1].action.weight = t
 *     其他 entries.action.weight = 0
 * - 参数小于 entries[0].threshold: 第一个 action.weight=1, 其他 0
 * - 参数大于 entries[last].threshold: 最后一个 action.weight=1, 其他 0
 * - 构造期 entries.length < 2 抛错
 * - 构造期 thresholds 非严格升序抛错
 * - update 调每个 action._update(dt), 然后设置 weight (顺序重要; 否则 enabled=false 会清零)
 * - 构造期所有 action.play() (确保 isRunning)
 *
 * Type A — STUB drop-in 级
 */

import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/blend-tree-1d';
import { AnimationAction } from '../../../src/animation/animation-action';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { Skeleton } from '../../../src/animation/skeleton';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

function createAction(name: string): AnimationAction {
  const skeleton = new Skeleton([]);
  const clip = new AnimationClip(name, 1, []);
  return new AnimationAction(clip, skeleton);
}

describeImpl('BlendTree1D', () => {
  it('constructor rejects entries.length < 2', () => {
    expect(() => new (mod as any).BlendTree1D([])).toThrow();
    expect(() => new (mod as any).BlendTree1D([{ threshold: 0, action: createAction('a') }])).toThrow();
  });

  it('constructor rejects non-strictly-ascending thresholds', () => {
    const a = createAction('a');
    const b = createAction('b');
    expect(() => new (mod as any).BlendTree1D([
      { threshold: 1, action: a },
      { threshold: 0, action: b },
    ])).toThrow();

    expect(() => new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 0, action: b },
    ])).toThrow();
  });

  it('constructor plays all actions', () => {
    const a = createAction('a');
    const b = createAction('b');
    new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);
    expect(a.isRunning).toBe(true);
    expect(b.isRunning).toBe(true);
  });

  it('setParameter at exact threshold sets target weight=1', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.setParameter(0);
    tree.update(0);
    expect(a.weight).toBeCloseTo(1, 5);
    expect(b.weight).toBeCloseTo(0, 5);

    tree.setParameter(1);
    tree.update(0);
    expect(a.weight).toBeCloseTo(0, 5);
    expect(b.weight).toBeCloseTo(1, 5);
  });

  it('setParameter at midpoint splits weights evenly', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.setParameter(0.5);
    tree.update(0);
    expect(a.weight).toBeCloseTo(0.5, 5);
    expect(b.weight).toBeCloseTo(0.5, 5);
  });

  it('setParameter below min clamps to first action', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.setParameter(-5);
    tree.update(0);
    expect(a.weight).toBeCloseTo(1, 5);
    expect(b.weight).toBeCloseTo(0, 5);
  });

  it('setParameter above max clamps to last action', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.setParameter(5);
    tree.update(0);
    expect(a.weight).toBeCloseTo(0, 5);
    expect(b.weight).toBeCloseTo(1, 5);
  });

  it('three-entry tree blends within correct segment', () => {
    const idle = createAction('idle');
    const walk = createAction('walk');
    const run = createAction('run');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: idle },
      { threshold: 5, action: walk },
      { threshold: 10, action: run },
    ]);

    tree.setParameter(2.5); // 中点 idle ↔ walk
    tree.update(0);
    expect(idle.weight).toBeCloseTo(0.5, 5);
    expect(walk.weight).toBeCloseTo(0.5, 5);
    expect(run.weight).toBeCloseTo(0, 5);

    tree.setParameter(7.5); // 中点 walk ↔ run
    tree.update(0);
    expect(idle.weight).toBeCloseTo(0, 5);
    expect(walk.weight).toBeCloseTo(0.5, 5);
    expect(run.weight).toBeCloseTo(0.5, 5);
  });

  it('parameter getter returns last set value (after clamp)', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.setParameter(0.7);
    expect(tree.parameter).toBeCloseTo(0.7, 5);

    tree.setParameter(2);
    expect(tree.parameter).toBeCloseTo(1, 5); // clamped
  });

  it('update advances all action time', () => {
    const a = createAction('a');
    const b = createAction('b');
    a.loop = true;
    b.loop = true;
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);

    tree.update(0.5);
    expect(a.time).toBeCloseTo(0.5, 5);
    expect(b.time).toBeCloseTo(0.5, 5);
  });

  it('returns this from setParameter for chaining', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree1D([
      { threshold: 0, action: a },
      { threshold: 1, action: b },
    ]);
    expect(tree.setParameter(0.5)).toBe(tree);
  });
});
