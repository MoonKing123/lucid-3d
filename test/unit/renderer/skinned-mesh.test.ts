/**
 * Pre-written tests for SkinnedMesh.
 * AI must implement src/renderer/skinned-mesh.ts to make these pass.
 *
 * API:
 *   class SkinnedMesh extends Mesh {
 *     skeleton: Skeleton;
 *     constructor(geometry: Geometry, material: Material, skeleton: Skeleton, name?: string);
 *   }
 *
 * Also requires Geometry to support optional `joints` and `weights` fields:
 *   - joints: Float32Array (4 per vertex — bone indices)
 *   - weights: Float32Array (4 per vertex — blend weights)
 *
 * Implementation notes:
 * - SkinnedMesh extends Mesh, adding a skeleton reference
 * - Geometry constructor opts should accept `joints?: Float32Array` and `weights?: Float32Array`
 * - Geometry should expose `hasJoints` and `hasWeights` boolean getters
 * - WebGLRenderer must detect SkinnedMesh and use skinning shader path
 *   (uploading boneMatrices as uniform array, binding joints/weights attributes)
 */
import { describe, it, expect } from 'vitest';
import * as skinnedMod from '../../../src/renderer/skinned-mesh';
import * as skelMod from '../../../src/animation/skeleton';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { Mesh } from '../../../src/renderer/mesh';
import { Node3D } from '../../../src/core/node3d';

const isStub =
  ('__STUB__' in skinnedMod && (skinnedMod as any).__STUB__ === true) ||
  ('__STUB__' in skelMod && (skelMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { SkinnedMesh } = skinnedMod;
const { Skeleton } = skelMod;

function identityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

function createTestSkeleton(): InstanceType<typeof Skeleton> {
  const bones = [
    { name: 'root', parentIndex: -1 },
    { name: 'arm', parentIndex: 0 },
  ];
  const ibm = new Float32Array(32);
  ibm.set(identityMat4(), 0);
  ibm.set(identityMat4(), 16);
  return new Skeleton(bones, ibm);
}

function createSkinnedGeometry(): Geometry {
  // Simple quad: 4 vertices
  const positions = new Float32Array([
    -1, 0, 0,
     1, 0, 0,
     1, 2, 0,
    -1, 2, 0,
  ]);
  // Each vertex bound to bone 0 or bone 1
  const joints = new Float32Array([
    0, 0, 0, 0,   // vertex 0: all bone 0
    0, 0, 0, 0,   // vertex 1: all bone 0
    1, 0, 0, 0,   // vertex 2: all bone 1
    1, 0, 0, 0,   // vertex 3: all bone 1
  ]);
  const weights = new Float32Array([
    1, 0, 0, 0,
    1, 0, 0, 0,
    1, 0, 0, 0,
    1, 0, 0, 0,
  ]);
  return new Geometry({ positions, joints, weights } as any);
}

/* ───────────── Construction ───────────── */

describeImpl('SkinnedMesh — construction', () => {
  it('should create with geometry, material, and skeleton', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk);
    expect(sm.skeleton).toBe(sk);
    expect(sm.geometry).toBe(geo);
    expect(sm.material).toBe(mat);
  });

  it('should default name to "skinned-mesh"', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk);
    expect(sm.name).toBe('skinned-mesh');
  });

  it('should accept custom name', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk, 'my-character');
    expect(sm.name).toBe('my-character');
  });
});

/* ───────────── Inheritance ───────────── */

describeImpl('SkinnedMesh — inheritance', () => {
  it('should be instanceof Mesh', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk);
    expect(sm).toBeInstanceOf(Mesh);
  });

  it('should be instanceof Node3D', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk);
    expect(sm).toBeInstanceOf(Node3D);
  });

  it('should participate in scene graph', () => {
    const geo = createSkinnedGeometry();
    const mat = new Material();
    const sk = createTestSkeleton();
    const sm = new SkinnedMesh(geo, mat, sk);
    const parent = new Node3D('scene');
    parent.addChild(sm);
    expect(sm.parent).toBe(parent);
    expect(parent.children).toContain(sm);
  });
});

/* ───────────── Geometry with joints/weights ───────────── */

describeImpl('Geometry — joints & weights support', () => {
  it('should store joints data when provided', () => {
    const geo = createSkinnedGeometry();
    expect((geo as any).joints).toBeDefined();
    expect((geo as any).joints.length).toBe(16); // 4 vertices * 4
  });

  it('should store weights data when provided', () => {
    const geo = createSkinnedGeometry();
    expect((geo as any).weights).toBeDefined();
    expect((geo as any).weights.length).toBe(16); // 4 vertices * 4
  });

  it('should default joints and weights to null when not provided', () => {
    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0]),
    });
    expect((geo as any).joints).toBeNull();
    expect((geo as any).weights).toBeNull();
  });
});
