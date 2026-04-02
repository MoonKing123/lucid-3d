/**
 * Pre-written tests for Skeleton & Bone system.
 * AI must implement src/animation/skeleton.ts to make these pass.
 *
 * API:
 *   interface BoneData { name: string; parentIndex: number; }
 *
 *   class Skeleton {
 *     readonly bones: ReadonlyArray<BoneData>;
 *     readonly boneCount: number;
 *     readonly inverseBindMatrices: Float32Array;  // boneCount * 16
 *     readonly boneMatrices: Float32Array;          // boneCount * 16
 *     readonly localPositions: Float32Array;        // boneCount * 3
 *     readonly localRotations: Float32Array;        // boneCount * 4 (quat xyzw)
 *     readonly localScales: Float32Array;           // boneCount * 3
 *
 *     constructor(bones: BoneData[], inverseBindMatrices: Float32Array);
 *     update(): void;
 *     getBoneIndex(name: string): number;
 *     setRestPose(): void;
 *     resetToRestPose(): void;
 *   }
 *
 * Implementation notes:
 * - inverseBindMatrices: column-major Mat4 array, one per bone
 * - boneMatrices: output buffer, boneMatrices[i] = worldMatrix[i] * inverseBindMatrix[i]
 * - localPositions/Rotations/Scales: per-bone local transforms, default to identity
 *   (position=[0,0,0], rotation=[0,0,0,1] identity quat, scale=[1,1,1])
 * - update() walks the bone hierarchy (breadth-first or parent-first order):
 *   worldMatrix[i] = parentWorld * compose(position[i], rotation[i], scale[i])
 *   boneMatrices[i] = worldMatrix[i] * inverseBindMatrices[i]
 * - Bones are ordered so that parentIndex < childIndex (topological order)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/skeleton';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Skeleton } = mod;

const EPSILON = 1e-5;

function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/** Create identity Mat4 (column-major) */
function identityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

/** Multiply two column-major 4x4 matrices */
function mulMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Create a translation Mat4 */
function translationMat4(x: number, y: number, z: number): Float32Array {
  const m = identityMat4();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

// ── Simple skeleton: 2 bones in a chain ──
// Bone 0 (root): parentIndex = -1
// Bone 1 (child): parentIndex = 0

function createSimpleSkeleton(): InstanceType<typeof Skeleton> {
  const bones = [
    { name: 'root', parentIndex: -1 },
    { name: 'child', parentIndex: 0 },
  ];
  // Both use identity as inverse bind matrix
  const ibm = new Float32Array(32); // 2 * 16
  const id = identityMat4();
  ibm.set(id, 0);
  ibm.set(id, 16);
  return new Skeleton(bones, ibm);
}

// ── 3-bone hierarchy: root → spine → head ──
function createThreeBoneSkeleton(): InstanceType<typeof Skeleton> {
  const bones = [
    { name: 'root', parentIndex: -1 },
    { name: 'spine', parentIndex: 0 },
    { name: 'head', parentIndex: 1 },
  ];
  const ibm = new Float32Array(48); // 3 * 16
  const id = identityMat4();
  ibm.set(id, 0);
  ibm.set(id, 16);
  ibm.set(id, 32);
  return new Skeleton(bones, ibm);
}

/* ───────────── Construction ───────────── */

describeImpl('Skeleton — construction', () => {
  it('should store bones and boneCount', () => {
    const sk = createSimpleSkeleton();
    expect(sk.boneCount).toBe(2);
    expect(sk.bones.length).toBe(2);
    expect(sk.bones[0].name).toBe('root');
    expect(sk.bones[1].name).toBe('child');
  });

  it('should allocate boneMatrices buffer (boneCount * 16)', () => {
    const sk = createSimpleSkeleton();
    expect(sk.boneMatrices.length).toBe(32);
  });

  it('should initialize localPositions to [0,0,0] per bone', () => {
    const sk = createSimpleSkeleton();
    expect(sk.localPositions.length).toBe(6); // 2 * 3
    for (let i = 0; i < 6; i++) {
      expect(sk.localPositions[i]).toBe(0);
    }
  });

  it('should initialize localRotations to identity quaternion [0,0,0,1] per bone', () => {
    const sk = createSimpleSkeleton();
    expect(sk.localRotations.length).toBe(8); // 2 * 4
    // Bone 0: [0, 0, 0, 1]
    expect(sk.localRotations[0]).toBe(0);
    expect(sk.localRotations[1]).toBe(0);
    expect(sk.localRotations[2]).toBe(0);
    expect(sk.localRotations[3]).toBe(1);
    // Bone 1: [0, 0, 0, 1]
    expect(sk.localRotations[4]).toBe(0);
    expect(sk.localRotations[5]).toBe(0);
    expect(sk.localRotations[6]).toBe(0);
    expect(sk.localRotations[7]).toBe(1);
  });

  it('should initialize localScales to [1,1,1] per bone', () => {
    const sk = createSimpleSkeleton();
    expect(sk.localScales.length).toBe(6); // 2 * 3
    for (let i = 0; i < 6; i++) {
      expect(sk.localScales[i]).toBe(1);
    }
  });
});

/* ───────────── getBoneIndex ───────────── */

describeImpl('Skeleton — getBoneIndex', () => {
  it('should return correct index for existing bone', () => {
    const sk = createSimpleSkeleton();
    expect(sk.getBoneIndex('root')).toBe(0);
    expect(sk.getBoneIndex('child')).toBe(1);
  });

  it('should return -1 for non-existent bone', () => {
    const sk = createSimpleSkeleton();
    expect(sk.getBoneIndex('nonexistent')).toBe(-1);
  });
});

/* ───────────── update() — bone matrix computation ───────────── */

describeImpl('Skeleton — update()', () => {
  it('should produce identity boneMatrices when all transforms are default (identity IBM)', () => {
    const sk = createSimpleSkeleton();
    sk.update();
    // worldMatrix[0] = identity (root, no parent)
    // boneMatrix[0] = worldMatrix[0] * IBM[0] = identity * identity = identity
    const id = identityMat4();
    for (let i = 0; i < 16; i++) {
      expect(near(sk.boneMatrices[i], id[i])).toBe(true);
    }
  });

  it('should propagate root translation to child', () => {
    const sk = createSimpleSkeleton();
    // Move root to (1, 0, 0)
    sk.localPositions[0] = 1; // root.x
    sk.update();
    // worldMatrix[0] = translate(1,0,0)
    // worldMatrix[1] = worldMatrix[0] * identity = translate(1,0,0)
    // boneMatrix[1][12] (tx) should be 1
    expect(near(sk.boneMatrices[16 + 12], 1)).toBe(true);
  });

  it('should accumulate translations in a chain', () => {
    const sk = createSimpleSkeleton();
    // Root at (1, 0, 0), child at local (0, 2, 0)
    sk.localPositions[0] = 1; // root.x
    sk.localPositions[4] = 2; // child.y
    sk.update();
    // worldMatrix[1] = translate(1,0,0) * translate(0,2,0) = translate(1,2,0)
    expect(near(sk.boneMatrices[16 + 12], 1)).toBe(true); // tx
    expect(near(sk.boneMatrices[16 + 13], 2)).toBe(true); // ty
  });

  it('should apply non-identity inverse bind matrices', () => {
    const bones = [{ name: 'root', parentIndex: -1 }];
    // IBM is translate(-1, 0, 0) — bone was at (1,0,0) in bind pose
    const ibm = translationMat4(-1, 0, 0);
    const sk = new Skeleton(bones, ibm);
    // Root at (1, 0, 0) in current pose
    sk.localPositions[0] = 1;
    sk.update();
    // boneMatrix = worldMatrix * IBM = translate(1,0,0) * translate(-1,0,0) = identity
    const id = identityMat4();
    for (let i = 0; i < 16; i++) {
      expect(near(sk.boneMatrices[i], id[i])).toBe(true);
    }
  });

  it('should handle 3-bone chain correctly', () => {
    const sk = createThreeBoneSkeleton();
    // root at (0,1,0), spine at local (0,1,0), head at local (0,1,0)
    sk.localPositions[1] = 1; // root.y
    sk.localPositions[4] = 1; // spine.y
    sk.localPositions[7] = 1; // head.y
    sk.update();
    // worldMatrix[head] = translate(0,3,0)
    expect(near(sk.boneMatrices[32 + 13], 3)).toBe(true); // head.ty
  });
});

/* ───────────── Rest pose ───────────── */

describeImpl('Skeleton — rest pose', () => {
  it('setRestPose() + resetToRestPose() should restore original transforms', () => {
    const sk = createSimpleSkeleton();
    // Set custom position
    sk.localPositions[0] = 5;
    sk.localPositions[1] = 10;
    sk.setRestPose();

    // Modify transforms
    sk.localPositions[0] = 99;
    sk.localPositions[1] = 99;

    // Reset should restore
    sk.resetToRestPose();
    expect(sk.localPositions[0]).toBe(5);
    expect(sk.localPositions[1]).toBe(10);
  });

  it('resetToRestPose() should also reset rotations and scales', () => {
    const sk = createSimpleSkeleton();
    sk.localRotations[0] = 0.5; // modify rotation
    sk.localScales[0] = 2;      // modify scale
    sk.setRestPose();

    sk.localRotations[0] = 99;
    sk.localScales[0] = 99;
    sk.resetToRestPose();

    expect(near(sk.localRotations[0], 0.5)).toBe(true);
    expect(near(sk.localScales[0], 2)).toBe(true);
  });
});
