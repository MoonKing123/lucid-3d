import { Skeleton, type BoneData } from '../../../src/animation/skeleton';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { KeyframeTrack } from '../../../src/animation/keyframe-track';

const BONES: BoneData[] = [
  { name: 'root',  parentIndex: -1 },
  { name: 'spine', parentIndex: 0  },
];

function makeIdentityIBM(count: number): Float32Array {
  const ibm = new Float32Array(count * 16);
  for (let i = 0; i < count; i++) {
    const b = i * 16;
    ibm[b]      = 1;
    ibm[b + 5]  = 1;
    ibm[b + 10] = 1;
    ibm[b + 15] = 1;
  }
  return ibm;
}

export function createSkeleton(): Skeleton {
  return new Skeleton(BONES, makeIdentityIBM(BONES.length));
}

export function createIdleClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.5, 1.0]),
    values: new Float32Array([
      0, 0,  0.03, 0.9996,
      0, 0, -0.03, 0.9996,
      0, 0,  0.03, 0.9996,
    ]),
  });
  return new AnimationClip('idle', [track]);
}

export function createRunClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.2, 0.4]),
    values: new Float32Array([
      0, 0, -0.1, 0.9950,
      0, 0,  0.1, 0.9950,
      0, 0, -0.1, 0.9950,
    ]),
  });
  return new AnimationClip('run', [track]);
}

// attack 动画 0.5s，不循环
export function createAttackClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.15, 0.5]),
    values: new Float32Array([
      0, 0,  0,    1,
      0, 0, -0.3, 0.9539,
      0, 0,  0,    1,
    ]),
  });
  return new AnimationClip('attack', [track]);
}
