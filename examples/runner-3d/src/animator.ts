/**
 * PlayerAnimator — 骨骼动画状态机，包装 AnimationMixer 实现 idle/run/jump 平滑切换。
 */

import { AnimationMixer } from '../../../src/animation/animation-mixer';
import type { AnimationAction } from '../../../src/animation/animation-action';
import type { AnimationClip } from '../../../src/animation/animation-clip';
import type { Skeleton } from '../../../src/animation/skeleton';

export type PlayerAnimState = 'idle' | 'run' | 'jump';

export class PlayerAnimator {
  readonly mixer: AnimationMixer;
  private actions: Record<PlayerAnimState, AnimationAction>;
  private current: PlayerAnimState = 'idle';

  constructor(
    skeleton: Skeleton,
    clips: { idle: AnimationClip; run: AnimationClip; jump: AnimationClip },
  ) {
    this.mixer = new AnimationMixer(skeleton);
    this.actions = {
      idle: this.mixer.clipAction(clips.idle),
      run: this.mixer.clipAction(clips.run),
      jump: this.mixer.clipAction(clips.jump),
    };

    this.actions.idle.loop = true;
    this.actions.run.loop = true;
    this.actions.jump.loop = false;

    // idle 为初始激活状态
    this.actions.idle.weight = 1;
    this.actions.idle.play();

    // run / jump 初始不激活（weight=0 使 effectiveWeight=0）
    this.actions.run.weight = 0;
    this.actions.jump.weight = 0;
  }

  /**
   * 切换到目标状态，使用 crossFadeTo 平滑过渡。
   * 必须先激活目标 action 的 weight，否则 fadeIn 无效。
   */
  setState(state: PlayerAnimState, fadeDuration = 0.2): void {
    if (state === this.current) return;

    const from = this.actions[this.current];
    const to = this.actions[state];

    // 激活目标权重，使 crossFade 的 fadeIn 能产生 effectiveWeight > 0
    to.weight = 1;
    from.crossFadeTo(to, fadeDuration);

    this.current = state;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** 获取指定状态的有效权重（用于测试验证 crossFade 过渡过程） */
  getEffectiveWeight(state: PlayerAnimState): number {
    return this.actions[state].effectiveWeight;
  }

  get state(): PlayerAnimState {
    return this.current;
  }
}
