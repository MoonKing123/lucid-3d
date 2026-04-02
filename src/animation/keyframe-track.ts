/**
 * STUB — KeyframeTrack (not yet implemented).
 * @see test/unit/animation/keyframe-track.test.ts
 */
export const __STUB__ = true;

export type InterpolationType = 'LINEAR' | 'STEP';
export type TargetPath = 'translation' | 'rotation' | 'scale';

export class KeyframeTrack {
  readonly targetPath: TargetPath;
  readonly jointIndex: number;
  readonly times: Float32Array;
  readonly values: Float32Array;
  readonly interpolation: InterpolationType;

  constructor(_opts: {
    targetPath: TargetPath;
    jointIndex: number;
    times: Float32Array;
    values: Float32Array;
    interpolation?: InterpolationType;
  }) {
    this.targetPath = _opts.targetPath;
    this.jointIndex = _opts.jointIndex;
    this.times = _opts.times;
    this.values = _opts.values;
    this.interpolation = _opts.interpolation ?? 'LINEAR';
    throw new Error('Not implemented');
  }

  sample(_time: number, _out: Float32Array): void {
    throw new Error('Not implemented');
  }

  get duration(): number {
    throw new Error('Not implemented');
  }
}
