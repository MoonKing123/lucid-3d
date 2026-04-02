/**
 * Pre-written tests for KeyframeTrack.
 * AI must implement src/animation/keyframe-track.ts to make these pass.
 *
 * API:
 *   type InterpolationType = 'LINEAR' | 'STEP';
 *   type TargetPath = 'translation' | 'rotation' | 'scale';
 *
 *   class KeyframeTrack {
 *     readonly targetPath: TargetPath;
 *     readonly jointIndex: number;
 *     readonly times: Float32Array;
 *     readonly values: Float32Array;
 *     readonly interpolation: InterpolationType;
 *
 *     constructor(opts: { targetPath, jointIndex, times, values, interpolation? });
 *     sample(time: number, out: Float32Array): void;
 *     get duration(): number;
 *   }
 *
 * Implementation notes:
 * - times: sorted ascending keyframe timestamps (seconds)
 * - values: interleaved components per keyframe
 *   - translation/scale: 3 floats per keyframe (vec3)
 *   - rotation: 4 floats per keyframe (quaternion xyzw)
 * - sample() writes interpolated value into `out` array
 *   - LINEAR: lerp for translation/scale, slerp for rotation
 *   - STEP: use previous keyframe's value
 *   - Before first keyframe: use first keyframe value
 *   - After last keyframe: use last keyframe value
 *   - Between keyframes: interpolate based on type
 * - Default interpolation is 'LINEAR'
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/keyframe-track';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { KeyframeTrack } = mod;

const EPSILON = 1e-5;

function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/* ───────────── Construction ───────────── */

describeImpl('KeyframeTrack — construction', () => {
  it('should store target path and joint index', () => {
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 2,
      times: new Float32Array([0, 1]),
      values: new Float32Array([0, 0, 0, 1, 0, 0]),
    });
    expect(track.targetPath).toBe('translation');
    expect(track.jointIndex).toBe(2);
  });

  it('should default interpolation to LINEAR', () => {
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([0, 0, 0, 1, 0, 0]),
    });
    expect(track.interpolation).toBe('LINEAR');
  });

  it('should accept explicit STEP interpolation', () => {
    const track = new KeyframeTrack({
      targetPath: 'scale',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([1, 1, 1, 2, 2, 2]),
      interpolation: 'STEP',
    });
    expect(track.interpolation).toBe('STEP');
  });
});

/* ───────────── duration ───────────── */

describeImpl('KeyframeTrack — duration', () => {
  it('should return last keyframe time', () => {
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 0.5, 1.5]),
      values: new Float32Array([0,0,0, 1,0,0, 2,0,0]),
    });
    expect(track.duration).toBe(1.5);
  });

  it('should return 0 for single keyframe', () => {
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0]),
      values: new Float32Array([1, 2, 3]),
    });
    expect(track.duration).toBe(0);
  });
});

/* ───────────── sample() — LINEAR translation ───────────── */

describeImpl('KeyframeTrack — sample LINEAR translation', () => {
  const track = () => new KeyframeTrack({
    targetPath: 'translation',
    jointIndex: 0,
    times: new Float32Array([0, 1]),
    values: new Float32Array([0, 0, 0, 2, 4, 6]),
  });

  it('should return first keyframe at t=0', () => {
    const out = new Float32Array(3);
    track().sample(0, out);
    expect(near(out[0], 0)).toBe(true);
    expect(near(out[1], 0)).toBe(true);
    expect(near(out[2], 0)).toBe(true);
  });

  it('should return last keyframe at t=1', () => {
    const out = new Float32Array(3);
    track().sample(1, out);
    expect(near(out[0], 2)).toBe(true);
    expect(near(out[1], 4)).toBe(true);
    expect(near(out[2], 6)).toBe(true);
  });

  it('should interpolate at t=0.5', () => {
    const out = new Float32Array(3);
    track().sample(0.5, out);
    expect(near(out[0], 1)).toBe(true);
    expect(near(out[1], 2)).toBe(true);
    expect(near(out[2], 3)).toBe(true);
  });

  it('should clamp before first keyframe', () => {
    const out = new Float32Array(3);
    track().sample(-1, out);
    expect(near(out[0], 0)).toBe(true);
    expect(near(out[1], 0)).toBe(true);
    expect(near(out[2], 0)).toBe(true);
  });

  it('should clamp after last keyframe', () => {
    const out = new Float32Array(3);
    track().sample(5, out);
    expect(near(out[0], 2)).toBe(true);
    expect(near(out[1], 4)).toBe(true);
    expect(near(out[2], 6)).toBe(true);
  });
});

/* ───────────── sample() — STEP ───────────── */

describeImpl('KeyframeTrack — sample STEP', () => {
  it('should use previous keyframe value (no interpolation)', () => {
    const track = new KeyframeTrack({
      targetPath: 'scale',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([1, 1, 1, 2, 2, 2]),
      interpolation: 'STEP',
    });
    const out = new Float32Array(3);

    // At t=0.5, should still use keyframe 0's value
    track.sample(0.5, out);
    expect(near(out[0], 1)).toBe(true);
    expect(near(out[1], 1)).toBe(true);
    expect(near(out[2], 1)).toBe(true);

    // At t=1, should use keyframe 1's value
    track.sample(1, out);
    expect(near(out[0], 2)).toBe(true);
  });
});

/* ───────────── sample() — LINEAR rotation (slerp) ───────────── */

describeImpl('KeyframeTrack — sample LINEAR rotation', () => {
  it('should slerp between quaternion keyframes', () => {
    // Identity quat → 90° around Y
    const halfAngle = Math.PI / 4; // half of 90°
    const track = new KeyframeTrack({
      targetPath: 'rotation',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([
        0, 0, 0, 1,                                // identity
        0, Math.sin(halfAngle), 0, Math.cos(halfAngle), // 90° Y
      ]),
    });
    const out = new Float32Array(4);
    track.sample(0.5, out);

    // At midpoint, should be 45° around Y
    const halfOf45 = Math.PI / 8;
    expect(near(out[0], 0)).toBe(true);
    expect(near(out[1], Math.sin(halfOf45), 1e-4)).toBe(true);
    expect(near(out[2], 0)).toBe(true);
    expect(near(out[3], Math.cos(halfOf45), 1e-4)).toBe(true);
  });
});

/* ───────────── sample() with 3+ keyframes ───────────── */

describeImpl('KeyframeTrack — multi-keyframe', () => {
  it('should find correct keyframe segment', () => {
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 1, 2, 3]),
      values: new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        1, 1, 1,
      ]),
    });
    const out = new Float32Array(3);

    // t=1.5: between keyframe 1 (1,0,0) and keyframe 2 (1,1,0)
    track.sample(1.5, out);
    expect(near(out[0], 1)).toBe(true);
    expect(near(out[1], 0.5)).toBe(true);
    expect(near(out[2], 0)).toBe(true);
  });
});
