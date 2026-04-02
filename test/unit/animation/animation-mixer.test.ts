/**
 * Pre-written tests for AnimationClip & AnimationMixer.
 * AI must implement:
 *   - src/animation/animation-clip.ts
 *   - src/animation/animation-mixer.ts
 *
 * AnimationClip API:
 *   class AnimationClip {
 *     readonly name: string;
 *     readonly duration: number;
 *     readonly tracks: ReadonlyArray<KeyframeTrack>;
 *     constructor(name: string, tracks: KeyframeTrack[]);
 *   }
 *
 * AnimationMixer API:
 *   class AnimationMixer {
 *     readonly skeleton: Skeleton;
 *     constructor(skeleton: Skeleton);
 *     play(clip: AnimationClip, options?: { loop?: boolean; speed?: number }): void;
 *     stop(): void;
 *     update(deltaTime: number): void;
 *     get isPlaying(): boolean;
 *     get time(): number;
 *   }
 *
 * Implementation notes:
 * - AnimationClip.duration = max of all track durations
 * - AnimationMixer.update(dt) samples all tracks at current time, writes to skeleton
 *   - translation tracks → skeleton.localPositions[jointIndex * 3 .. +3]
 *   - rotation tracks → skeleton.localRotations[jointIndex * 4 .. +4]
 *   - scale tracks → skeleton.localScales[jointIndex * 3 .. +3]
 * - After sampling all tracks, automatically calls skeleton.update()
 * - play() with loop=true wraps time modulo clip.duration
 * - play() with speed multiplies delta by speed factor
 * - Default: loop=false, speed=1.0
 * - When not looping, stops at clip.duration (isPlaying becomes false)
 */
import { describe, it, expect } from 'vitest';
import * as clipMod from '../../../src/animation/animation-clip';
import * as mixerMod from '../../../src/animation/animation-mixer';
import * as trackMod from '../../../src/animation/keyframe-track';
import * as skelMod from '../../../src/animation/skeleton';

const isStub =
  ('__STUB__' in clipMod && (clipMod as any).__STUB__ === true) ||
  ('__STUB__' in mixerMod && (mixerMod as any).__STUB__ === true) ||
  ('__STUB__' in trackMod && (trackMod as any).__STUB__ === true) ||
  ('__STUB__' in skelMod && (skelMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { AnimationClip } = clipMod;
const { AnimationMixer } = mixerMod;
const { KeyframeTrack } = trackMod;
const { Skeleton } = skelMod;

const EPSILON = 1e-5;

function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

function identityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

/** Create a 2-bone skeleton (root + child) with identity IBM */
function createSkeleton(): InstanceType<typeof Skeleton> {
  const bones = [
    { name: 'root', parentIndex: -1 },
    { name: 'arm', parentIndex: 0 },
  ];
  const ibm = new Float32Array(32);
  ibm.set(identityMat4(), 0);
  ibm.set(identityMat4(), 16);
  return new Skeleton(bones, ibm);
}

/** Simple translation track: bone 0 moves from (0,0,0) to (1,0,0) over 1 second */
function createTranslationTrack(): InstanceType<typeof KeyframeTrack> {
  return new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 1]),
    values: new Float32Array([0, 0, 0, 1, 0, 0]),
  });
}

/* ───────────── AnimationClip ───────────── */

describeImpl('AnimationClip', () => {
  it('should store name and tracks', () => {
    const track = createTranslationTrack();
    const clip = new AnimationClip('walk', [track]);
    expect(clip.name).toBe('walk');
    expect(clip.tracks.length).toBe(1);
  });

  it('should compute duration from longest track', () => {
    const track1 = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([0,0,0, 1,0,0]),
    });
    const track2 = new KeyframeTrack({
      targetPath: 'scale',
      jointIndex: 1,
      times: new Float32Array([0, 2]),
      values: new Float32Array([1,1,1, 2,2,2]),
    });
    const clip = new AnimationClip('combo', [track1, track2]);
    expect(clip.duration).toBe(2);
  });

  it('should handle empty tracks', () => {
    const clip = new AnimationClip('empty', []);
    expect(clip.duration).toBe(0);
    expect(clip.tracks.length).toBe(0);
  });
});

/* ───────────── AnimationMixer — basic playback ───────────── */

describeImpl('AnimationMixer — basic playback', () => {
  it('should not be playing initially', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    expect(mixer.isPlaying).toBe(false);
    expect(mixer.time).toBe(0);
  });

  it('should start playing after play()', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    expect(mixer.isPlaying).toBe(true);
  });

  it('should advance time on update()', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(0.5);
    expect(near(mixer.time, 0.5)).toBe(true);
  });

  it('should apply track values to skeleton positions', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(0.5);
    // bone 0 should be at (0.5, 0, 0)
    expect(near(sk.localPositions[0], 0.5)).toBe(true);
    expect(near(sk.localPositions[1], 0)).toBe(true);
    expect(near(sk.localPositions[2], 0)).toBe(true);
  });

  it('should stop at clip duration when not looping', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip); // default: loop=false
    mixer.update(1.5); // past duration (1.0)
    expect(mixer.isPlaying).toBe(false);
    expect(near(mixer.time, 1.0)).toBe(true);
    // Final value should be applied
    expect(near(sk.localPositions[0], 1)).toBe(true);
  });
});

/* ───────────── AnimationMixer — stop ───────────── */

describeImpl('AnimationMixer — stop', () => {
  it('should stop playback', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(0.3);
    mixer.stop();
    expect(mixer.isPlaying).toBe(false);
  });

  it('update() after stop() should not advance time', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(0.3);
    mixer.stop();
    const timeAfterStop = mixer.time;
    mixer.update(0.5);
    expect(mixer.time).toBe(timeAfterStop);
  });
});

/* ───────────── AnimationMixer — looping ───────────── */

describeImpl('AnimationMixer — looping', () => {
  it('should wrap time when looping', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip, { loop: true });
    mixer.update(1.5); // 1.5 % 1.0 = 0.5
    expect(mixer.isPlaying).toBe(true);
    expect(near(mixer.time, 0.5)).toBe(true);
    expect(near(sk.localPositions[0], 0.5)).toBe(true);
  });
});

/* ───────────── AnimationMixer — speed ───────────── */

describeImpl('AnimationMixer — speed', () => {
  it('should respect speed multiplier', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip, { speed: 2 });
    mixer.update(0.25); // effective time = 0.5
    expect(near(mixer.time, 0.5)).toBe(true);
    expect(near(sk.localPositions[0], 0.5)).toBe(true);
  });
});

/* ───────────── AnimationMixer — calls skeleton.update() ───────────── */

describeImpl('AnimationMixer — skeleton integration', () => {
  it('should call skeleton.update() so boneMatrices reflect changes', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(1.0);
    // After animation, root bone at (1,0,0), boneMatrix[0] should reflect translation
    // With identity IBM, boneMatrix[0][12] = 1 (tx)
    expect(near(sk.boneMatrices[12], 1)).toBe(true);
  });

  it('should update child bone matrices through hierarchy', () => {
    const sk = createSkeleton();
    const mixer = new AnimationMixer(sk);
    // Move root to (1,0,0)
    const clip = new AnimationClip('walk', [createTranslationTrack()]);
    mixer.play(clip);
    mixer.update(1.0);
    // Child bone (arm) inherits root's world transform
    // boneMatrix[1][12] = 1 (tx from parent)
    expect(near(sk.boneMatrices[16 + 12], 1)).toBe(true);
  });
});
