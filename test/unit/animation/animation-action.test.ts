/**
 * Pre-written tests for AnimationAction — weight-based blending & fade transitions.
 * AI must implement src/animation/animation-action.ts
 *
 * AnimationAction API:
 *   class AnimationAction {
 *     readonly clip: AnimationClip;
 *     readonly skeleton: Skeleton;
 *
 *     weight: number;              // 0-1, blending weight, default 1
 *     timeScale: number;           // playback speed, default 1
 *     loop: boolean;               // loop playback, default false
 *     enabled: boolean;            // active flag, default true
 *     clampWhenFinished: boolean;  // hold last frame, default false
 *
 *     get time(): number;
 *     set time(v: number);
 *     get isRunning(): boolean;
 *     get effectiveWeight(): number;  // weight * fadeMultiplier * (enabled ? 1 : 0)
 *
 *     play(): this;
 *     stop(): this;                   // stop and reset time to 0
 *     reset(): this;                  // reset time and fade state, keep running state
 *
 *     fadeIn(duration: number): this;    // fade weight from 0 → 1
 *     fadeOut(duration: number): this;   // fade weight from current → 0, stop when done
 *     crossFadeTo(action: AnimationAction, duration: number): this;
 *
 *     _update(deltaTime: number): void; // advance time + fade
 *     _sample(): { positions: Float32Array; rotations: Float32Array; scales: Float32Array };
 *   }
 *
 * Implementation notes:
 * - effectiveWeight = weight * _fadeWeight * (enabled ? 1 : 0)
 * - fadeIn starts _fadeWeight at 0, interpolates linearly to 1 over duration
 * - fadeOut starts _fadeWeight at current value, interpolates to 0, stops action when fade completes
 * - crossFadeTo: this.fadeOut(duration) + action.reset().fadeIn(duration).play()
 * - _update advances time by deltaTime * timeScale
 * - When loop=true, time wraps modulo clip.duration
 * - When loop=false and time >= clip.duration: set time=duration, isRunning=false (unless clampWhenFinished)
 * - _sample reads current clip tracks at this._time, fills per-bone temp arrays
 *   For bones not covered by any track, use skeleton's current localPositions/localRotations/localScales
 */

import { describe, it, expect } from 'vitest';
import * as actionMod from '../../../src/animation/animation-action';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { KeyframeTrack } from '../../../src/animation/keyframe-track';
import { Skeleton } from '../../../src/animation/skeleton';

const isStub = '__STUB__' in actionMod && (actionMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { AnimationAction } = actionMod;

const EPSILON = 1e-5;
function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

function identityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

function createSkeleton(): Skeleton {
  const bones = [
    { name: 'root', parentIndex: -1 },
    { name: 'arm', parentIndex: 0 },
  ];
  const ibm = new Float32Array(32);
  ibm.set(identityMat4(), 0);
  ibm.set(identityMat4(), 16);
  return new Skeleton(bones, ibm);
}

/** bone 0: (0,0,0) → (1,0,0) over 1 second */
function createTranslationClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 1]),
    values: new Float32Array([0, 0, 0, 1, 0, 0]),
  });
  return new AnimationClip('walk', [track]);
}

/** bone 0: (0,0,0) → (0,2,0) over 1 second */
function createJumpClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 1]),
    values: new Float32Array([0, 0, 0, 0, 2, 0]),
  });
  return new AnimationClip('jump', [track]);
}

/* ─── Construction & Initial State ─── */

describeImpl('AnimationAction — construction', () => {
  it('should store clip and skeleton references', () => {
    const sk = createSkeleton();
    const clip = createTranslationClip();
    const action = new AnimationAction(clip, sk);
    expect(action.clip).toBe(clip);
    expect(action.skeleton).toBe(sk);
  });

  it('should have correct defaults', () => {
    const sk = createSkeleton();
    const clip = createTranslationClip();
    const action = new AnimationAction(clip, sk);
    expect(action.weight).toBe(1);
    expect(action.timeScale).toBe(1);
    expect(action.loop).toBe(false);
    expect(action.enabled).toBe(true);
    expect(action.clampWhenFinished).toBe(false);
    expect(action.time).toBe(0);
    expect(action.isRunning).toBe(false);
    expect(action.effectiveWeight).toBe(1);
  });
});

/* ─── Play / Stop / Reset ─── */

describeImpl('AnimationAction — play/stop/reset', () => {
  it('play() should set isRunning to true', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    expect(action.isRunning).toBe(true);
  });

  it('stop() should set isRunning to false and reset time to 0', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action._update(0.5);
    action.stop();
    expect(action.isRunning).toBe(false);
    expect(action.time).toBe(0);
  });

  it('reset() should reset time and fade state, keep running state', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action._update(0.5);
    action.fadeOut(1);
    action.reset();
    expect(action.isRunning).toBe(true); // still running
    expect(action.time).toBe(0);
    expect(action.effectiveWeight).toBe(1); // fade reset
  });

  it('play/stop/reset should return this for chaining', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    expect(action.play()).toBe(action);
    expect(action.stop()).toBe(action);
    expect(action.reset()).toBe(action);
  });
});

/* ─── Time Advancement ─── */

describeImpl('AnimationAction — time advancement', () => {
  it('should advance time by deltaTime * timeScale', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action._update(0.3);
    expect(near(action.time, 0.3)).toBe(true);
  });

  it('should respect timeScale', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.timeScale = 2;
    action.play();
    action._update(0.25);
    expect(near(action.time, 0.5)).toBe(true);
  });

  it('should not advance when not running', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action._update(0.5);
    expect(action.time).toBe(0);
  });

  it('should loop when loop=true', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.loop = true;
    action.play();
    action._update(1.3); // 1.3 % 1.0 = 0.3
    expect(action.isRunning).toBe(true);
    expect(near(action.time, 0.3)).toBe(true);
  });

  it('should stop at clip duration when not looping', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action._update(1.5);
    expect(action.isRunning).toBe(false);
    expect(near(action.time, 1.0)).toBe(true);
  });

  it('should keep running at clip duration when clampWhenFinished=true', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.clampWhenFinished = true;
    action.play();
    action._update(1.5);
    expect(action.isRunning).toBe(true);
    expect(near(action.time, 1.0)).toBe(true);
  });
});

/* ─── Fade ─── */

describeImpl('AnimationAction — fade', () => {
  it('fadeIn should start effectiveWeight at 0 and approach 1', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action.fadeIn(1.0);
    expect(near(action.effectiveWeight, 0)).toBe(true);
    action._update(0.5);
    expect(near(action.effectiveWeight, 0.5)).toBe(true);
    action._update(0.5);
    expect(near(action.effectiveWeight, 1.0)).toBe(true);
  });

  it('fadeOut should approach 0 and stop action when complete', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.play();
    action._update(0.1); // start playing
    action.fadeOut(0.5);
    action._update(0.25);
    expect(near(action.effectiveWeight, 0.5)).toBe(true);
    expect(action.isRunning).toBe(true);
    action._update(0.25);
    expect(near(action.effectiveWeight, 0)).toBe(true);
    expect(action.isRunning).toBe(false);
  });

  it('effectiveWeight should be 0 when enabled=false', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.enabled = false;
    expect(action.effectiveWeight).toBe(0);
  });

  it('effectiveWeight should respect weight property', () => {
    const action = new AnimationAction(createTranslationClip(), createSkeleton());
    action.weight = 0.5;
    expect(near(action.effectiveWeight, 0.5)).toBe(true);
  });
});

/* ─���─ CrossFade ─── */

describeImpl('AnimationAction — crossFade', () => {
  it('crossFadeTo should fade this out and target in', () => {
    const sk = createSkeleton();
    const walkAction = new AnimationAction(createTranslationClip(), sk);
    const jumpAction = new AnimationAction(createJumpClip(), sk);

    walkAction.play();
    walkAction._update(0.5); // playing walk

    walkAction.crossFadeTo(jumpAction, 1.0);

    // jumpAction should now be playing and fading in
    expect(jumpAction.isRunning).toBe(true);

    // After half the fade duration
    walkAction._update(0.5);
    jumpAction._update(0.5);

    // walk fading out: ~0.5 effective weight
    expect(near(walkAction.effectiveWeight, 0.5)).toBe(true);
    // jump fading in: ~0.5 effective weight
    expect(near(jumpAction.effectiveWeight, 0.5)).toBe(true);

    // After full fade
    walkAction._update(0.5);
    jumpAction._update(0.5);

    expect(near(walkAction.effectiveWeight, 0)).toBe(true);
    expect(walkAction.isRunning).toBe(false);
    expect(near(jumpAction.effectiveWeight, 1.0)).toBe(true);
    expect(jumpAction.isRunning).toBe(true);
  });
});

/* ─── Sampling ─── */

describeImpl('AnimationAction — _sample', () => {
  it('should sample clip tracks at current time', () => {
    const sk = createSkeleton();
    const action = new AnimationAction(createTranslationClip(), sk);
    action.play();
    action._update(0.5);
    const result = action._sample();

    // bone 0 at t=0.5: position should be (0.5, 0, 0)
    expect(near(result.positions[0], 0.5)).toBe(true);
    expect(near(result.positions[1], 0)).toBe(true);
    expect(near(result.positions[2], 0)).toBe(true);
  });

  it('should preserve skeleton defaults for bones without tracks', () => {
    const sk = createSkeleton();
    const action = new AnimationAction(createTranslationClip(), sk);
    action.play();
    action._update(0.5);
    const result = action._sample();

    // bone 1 (arm) has no track — should get skeleton's current local rotation
    // Default quaternion = (0, 0, 0, 1)
    expect(near(result.rotations[4], 0)).toBe(true); // arm quat.x
    expect(near(result.rotations[5], 0)).toBe(true); // arm quat.y
    expect(near(result.rotations[6], 0)).toBe(true); // arm quat.z
    expect(near(result.rotations[7], 1)).toBe(true); // arm quat.w
  });

  it('should return correct buffer sizes', () => {
    const sk = createSkeleton(); // 2 bones
    const action = new AnimationAction(createTranslationClip(), sk);
    action.play();
    const result = action._sample();

    expect(result.positions.length).toBe(6);  // 2 bones * 3
    expect(result.rotations.length).toBe(8);  // 2 bones * 4
    expect(result.scales.length).toBe(6);     // 2 bones * 3
  });
});
