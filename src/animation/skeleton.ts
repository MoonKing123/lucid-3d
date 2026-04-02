/**
 * STUB — Skeleton & Bone system (not yet implemented).
 * @see test/unit/animation/skeleton.test.ts
 */
export const __STUB__ = true;

export interface BoneData {
  name: string;
  parentIndex: number; // -1 for root bones
}

export class Skeleton {
  readonly bones: ReadonlyArray<BoneData>;
  readonly boneCount: number;
  readonly inverseBindMatrices: Float32Array;
  readonly boneMatrices: Float32Array;
  readonly localPositions: Float32Array;
  readonly localRotations: Float32Array;
  readonly localScales: Float32Array;

  constructor(_bones: BoneData[], _inverseBindMatrices: Float32Array) {
    this.bones = _bones;
    this.boneCount = _bones.length;
    this.inverseBindMatrices = _inverseBindMatrices;
    this.boneMatrices = new Float32Array(0);
    this.localPositions = new Float32Array(0);
    this.localRotations = new Float32Array(0);
    this.localScales = new Float32Array(0);
    throw new Error('Not implemented');
  }

  update(): void {
    throw new Error('Not implemented');
  }

  getBoneIndex(_name: string): number {
    throw new Error('Not implemented');
  }

  setRestPose(): void {
    throw new Error('Not implemented');
  }

  resetToRestPose(): void {
    throw new Error('Not implemented');
  }
}
