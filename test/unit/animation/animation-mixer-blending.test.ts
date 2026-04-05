import { describe, it, expect } from 'vitest';
import { AnimationAction } from '../../../src/animation/animation-action';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { KeyframeTrack } from '../../../src/animation/keyframe-track';
import { Skeleton } from '../../../src/animation/skeleton';

const EPSILON = 1e-4;
function near(a: number, b: number) { return Math.abs(a - b) < EPSILON; }

function identityMat4() {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

function createSkeleton() {
  const bones = [{ name: 'root', parentIndex: -1 }];
  const ibm = new Float32Array(16);
  ibm.set(identityMat4(), 0);
  return new Skeleton(bones, ibm);
}

describe('AnimationMixer — action blending', () => {
  it('clipAction should return an AnimationAction', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [
      new KeyframeTrack({
        targetPath: 'translation', jointIndex: 0,
        times: new Float32Array([0, 1]),
        values: new Float32Array([0,0,0, 1,0,0]),
      }),
    ]);
    const action = mixer.clipAction(clip);
    expect(action).toBeInstanceOf(AnimationAction);
    expect(action.clip).toBe(clip);
  });

  it('should blend two actions by weight into skeleton', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);

    const walkClip = new AnimationClip('walk', [
      new KeyframeTrack({
        targetPath: 'translation', jointIndex: 0,
        times: new Float32Array([0, 1]),
        values: new Float32Array([0,0,0, 2,0,0]),
      }),
    ]);
    const jumpClip = new AnimationClip('jump', [
      new KeyframeTrack({
        targetPath: 'translation', jointIndex: 0,
        times: new Float32Array([0, 1]),
        values: new Float32Array([0,0,0, 0,4,0]),
      }),
    ]);

    const walkAction = mixer.clipAction(walkClip);
    const jumpAction = mixer.clipAction(jumpClip);

    walkAction.weight = 0.5;
    jumpAction.weight = 0.5;
    walkAction.loop = true;
    jumpAction.loop = true;
    walkAction.play();
    jumpAction.play();

    mixer.update(0.5);

    // At t=0.5: walk=(1,0,0), jump=(0,2,0)
    // Blended 50/50: (0.5, 1.0, 0)
    expect(near(sk.localPositions[0], 0.5)).toBe(true);
    expect(near(sk.localPositions[1], 1.0)).toBe(true);
    expect(near(sk.localPositions[2], 0)).toBe(true);
  });
});
