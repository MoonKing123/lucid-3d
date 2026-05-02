/**
 * Pre-written tests for BlendTree2D — 2D parameter-driven AnimationAction Gradient Band blending.
 * AI must implement src/animation/blend-tree-2d.ts
 *
 * BlendTree2D API:
 *   class BlendTree2D {
 *     constructor(entries: { position: { x, y }; action: AnimationAction }[]);
 *                                          // entries 至少 1 个; 不可重复 position; 否则抛错
 *     setParameters(x: number, y: number): this;
 *     get parameterX(): number;
 *     get parameterY(): number;
 *     update(dt: number): void;             // 调用每个 action._update(dt) + 设置 weight
 *   }
 *
 * Implementation notes (Gradient Band 算法 — 简化版 Inverse Distance Weighting):
 * - 输入参数 (px, py) 与每个 entries[i].position 计算欧氏距离 d_i
 * - 若某个 d_i ≤ epsilon (1e-6), 该 action.weight = 1, 其他 = 0 (精确命中)
 * - 否则 weight_i = 1 / (d_i^2), 然后归一化使 sum(weight) = 1
 * - 单 entry 情况: action.weight = 1
 *
 * 验证场景:
 * - 8 方向移动 (forward/back/left/right + 对角线) 的 8 个 action 在原点权重均匀
 * - 单点命中 (d=0) 时其他 entry weight = 0
 * - 远离所有点时按距离平方衰减
 *
 * 构造期所有 action.play() (确保 isRunning)
 *
 * Type A — STUB drop-in 级
 */

import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/blend-tree-2d';
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

describeImpl('BlendTree2D', () => {
  it('constructor rejects empty entries', () => {
    expect(() => new (mod as any).BlendTree2D([])).toThrow();
  });

  it('constructor rejects duplicate positions', () => {
    expect(() => new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: createAction('a') },
      { position: { x: 0, y: 0 }, action: createAction('b') },
    ])).toThrow();
  });

  it('constructor plays all actions', () => {
    const a = createAction('a');
    const b = createAction('b');
    new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
      { position: { x: 1, y: 0 }, action: b },
    ]);
    expect(a.isRunning).toBe(true);
    expect(b.isRunning).toBe(true);
  });

  it('single-entry tree always weight=1', () => {
    const a = createAction('a');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
    ]);
    tree.setParameters(5, 5);
    tree.update(0);
    expect(a.weight).toBeCloseTo(1, 5);
  });

  it('exact hit on entry sets weight=1, others=0', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
      { position: { x: 1, y: 0 }, action: b },
    ]);

    tree.setParameters(0, 0);
    tree.update(0);
    expect(a.weight).toBeCloseTo(1, 5);
    expect(b.weight).toBeCloseTo(0, 5);

    tree.setParameters(1, 0);
    tree.update(0);
    expect(a.weight).toBeCloseTo(0, 5);
    expect(b.weight).toBeCloseTo(1, 5);
  });

  it('midpoint between two entries → equal weights', () => {
    const a = createAction('a');
    const b = createAction('b');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
      { position: { x: 1, y: 0 }, action: b },
    ]);

    tree.setParameters(0.5, 0);
    tree.update(0);
    expect(a.weight).toBeCloseTo(0.5, 5);
    expect(b.weight).toBeCloseTo(0.5, 5);
  });

  it('weights always sum to 1', () => {
    const entries = [
      { position: { x: 0, y: 0 }, action: createAction('idle') },
      { position: { x: 1, y: 0 }, action: createAction('right') },
      { position: { x: -1, y: 0 }, action: createAction('left') },
      { position: { x: 0, y: 1 }, action: createAction('forward') },
      { position: { x: 0, y: -1 }, action: createAction('back') },
    ];
    const tree = new (mod as any).BlendTree2D(entries);

    // sample several params
    const samples = [
      [0.3, 0.4],
      [-0.5, 0.5],
      [0.7, -0.2],
      [2, 2],
    ];
    for (const [x, y] of samples) {
      tree.setParameters(x, y);
      tree.update(0);
      const sum = entries.reduce((s, e) => s + e.action.weight, 0);
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it('closer entries get higher weight (1/d^2 falloff)', () => {
    const close = createAction('close');
    const far = createAction('far');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: close },
      { position: { x: 10, y: 0 }, action: far },
    ]);

    tree.setParameters(1, 0); // close 距 1, far 距 9
    tree.update(0);
    expect(close.weight).toBeGreaterThan(far.weight);
  });

  it('parameterX/Y getter returns last set values', () => {
    const a = createAction('a');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
    ]);

    tree.setParameters(0.7, -0.3);
    expect(tree.parameterX).toBeCloseTo(0.7, 5);
    expect(tree.parameterY).toBeCloseTo(-0.3, 5);
  });

  it('update advances all action time', () => {
    const a = createAction('a');
    const b = createAction('b');
    a.loop = true;
    b.loop = true;
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
      { position: { x: 1, y: 1 }, action: b },
    ]);

    tree.update(0.5);
    expect(a.time).toBeCloseTo(0.5, 5);
    expect(b.time).toBeCloseTo(0.5, 5);
  });

  it('setParameters returns this for chaining', () => {
    const a = createAction('a');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 0, y: 0 }, action: a },
    ]);
    expect(tree.setParameters(1, 2)).toBe(tree);
  });

  it('8-direction setup: 4 cardinal directions equidistant from origin → equal weights', () => {
    const right = createAction('right');
    const left = createAction('left');
    const up = createAction('up');
    const down = createAction('down');
    const tree = new (mod as any).BlendTree2D([
      { position: { x: 1, y: 0 }, action: right },
      { position: { x: -1, y: 0 }, action: left },
      { position: { x: 0, y: 1 }, action: up },
      { position: { x: 0, y: -1 }, action: down },
    ]);

    // 在远离任何点的远点 (3,3): right (距 sqrt(13)) ≠ up (距 sqrt(13)) → 权重相等
    // 测试改为对称点 (0,0): 4 个点等距 1, 权重 0.25 each
    tree.setParameters(0, 0);
    tree.update(0);
    expect(right.weight).toBeCloseTo(0.25, 4);
    expect(left.weight).toBeCloseTo(0.25, 4);
    expect(up.weight).toBeCloseTo(0.25, 4);
    expect(down.weight).toBeCloseTo(0.25, 4);
  });
});
