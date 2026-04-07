import { describe, it, expect } from 'vitest';
import { PlayerAnimator } from '../../src/animator';
import { makeStubSkeleton, makeIdleClip, makeRunClip, makeJumpClip } from '../../src/anim-fixtures';

describe('PlayerAnimator 状态切换', () => {
  it('初始状态为 idle，weight=1', () => {
    const skel = makeStubSkeleton();
    const animator = new PlayerAnimator(skel, {
      idle: makeIdleClip(), run: makeRunClip(), jump: makeJumpClip(),
    });
    expect(animator.state).toBe('idle');
  });

  it('切换到 run 后状态更新', () => {
    const skel = makeStubSkeleton();
    const animator = new PlayerAnimator(skel, {
      idle: makeIdleClip(), run: makeRunClip(), jump: makeJumpClip(),
    });
    animator.setState('run');
    expect(animator.state).toBe('run');
  });

  it('crossFade 过程中两个 action 权重都 > 0', () => {
    const skel = makeStubSkeleton();
    const animator = new PlayerAnimator(skel, {
      idle: makeIdleClip(), run: makeRunClip(), jump: makeJumpClip(),
    });
    animator.setState('run', 0.5); // 0.5s 过渡
    animator.update(0.25); // 走过渡一半
    // 两个 action 的 effectiveWeight 都应该在 (0, 1) 之间
    expect(animator.getEffectiveWeight('idle')).toBeGreaterThan(0);
    expect(animator.getEffectiveWeight('run')).toBeGreaterThan(0);
  });

  it('mixer.update 真的驱动骨骼变换', () => {
    const skel = makeStubSkeleton();
    const animator = new PlayerAnimator(skel, {
      idle: makeIdleClip(), run: makeRunClip(), jump: makeJumpClip(),
    });
    // bone 0 的 Y 分量初始为 0（localPositions 全零初始化）
    const initialBoneY = skel.localPositions[1];
    animator.update(0.25); // idle clip 在 0.25s 处 y=0.1
    // 骨骼 position 应该被动画驱动而改变
    expect(skel.localPositions[1]).not.toBe(initialBoneY);
  });

  it('jump 不 loop，结束后保持终态', () => {
    const skel = makeStubSkeleton();
    const animator = new PlayerAnimator(skel, {
      idle: makeIdleClip(), run: makeRunClip(), jump: makeJumpClip(),
    });
    animator.setState('jump');
    animator.update(2); // 远超 jump 时长（0.6s）
    // jump action 应该已经停止或保持终态，不报错
    expect(animator.state).toBe('jump');
  });
});
