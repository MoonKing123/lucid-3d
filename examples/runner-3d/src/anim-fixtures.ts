/**
 * 程序化生成用于测试的最简骨骼和动画片段。
 * 不依赖外部 glTF 文件，仅用于集成测试。
 */

import { Skeleton, type BoneData } from '../../../src/animation/skeleton';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { KeyframeTrack } from '../../../src/animation/keyframe-track';

/** 创建 2 骨骼的 stub 骨架：root + spine */
export function makeStubSkeleton(): Skeleton {
  const bones: BoneData[] = [
    { name: 'root', parentIndex: -1 },
    { name: 'spine', parentIndex: 0 },
  ];
  // 单位逆绑定矩阵（2 根骨骼）
  const ibm = new Float32Array(2 * 16);
  for (let i = 0; i < 2; i++) {
    const b = i * 16;
    ibm[b + 0] = 1; ibm[b + 5] = 1; ibm[b + 10] = 1; ibm[b + 15] = 1;
  }
  return new Skeleton(bones, ibm);
}

/** idle: root 微微上下浮动，0.5s loop */
export function makeIdleClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 0.25, 0.5]),
    values: new Float32Array([0, 0, 0,  0, 0.1, 0,  0, 0, 0]),
  });
  return new AnimationClip('idle', [track]);
}

/** run: spine 来回俯仰，0.4s loop */
export function makeRunClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.2, 0.4]),
    values: new Float32Array([0, 0, 0, 1,  0, 0.1, 0, 0.995,  0, 0, 0, 1]),
  });
  return new AnimationClip('run', [track]);
}

/** jump: root y 跳一下，0.6s 不循环 */
export function makeJumpClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 0.3, 0.6]),
    values: new Float32Array([0, 0, 0,  0, 1, 0,  0, 0, 0]),
  });
  return new AnimationClip('jump', [track]);
}
