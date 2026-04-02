/**
 * Pre-written tests for glTF skin & animation loading extension.
 * AI must extend src/loader/gltf-loader.ts to make these pass.
 *
 * Extended GltfAsset:
 *   interface GltfAsset {
 *     scene: Node3D;
 *     geometries: Geometry[];
 *     skeletons: Skeleton[];         // NEW
 *     animations: AnimationClip[];   // NEW
 *   }
 *
 * Extended GltfJson — must parse these new sections:
 *   - skins[]: { joints: number[], inverseBindMatrices?: number, skeleton?: number }
 *   - animations[]: { channels: Channel[], samplers: Sampler[] }
 *     - Channel: { sampler: number, target: { node: number, path: string } }
 *     - Sampler: { input: number, output: number, interpolation?: string }
 *   - nodes[].skin: number (index into skins[])
 *   - mesh primitives with JOINTS_0 and WEIGHTS_0 attributes
 *
 * Implementation notes:
 * - Each skin → one Skeleton instance
 * - skin.joints maps glTF node indices to bone indices
 * - skin.inverseBindMatrices accessor → Float32Array of Mat4s
 * - Nodes with skin + mesh → SkinnedMesh (not plain Mesh)
 * - Each animation → one AnimationClip
 * - animation.channels map to KeyframeTracks
 * - Node rotation in glTF is quaternion [x,y,z,w], matching our Quat layout
 */
import { describe, it, expect } from 'vitest';
import { parseGltf, type GltfJson } from '../../../src/loader/gltf-loader';
import * as skelMod from '../../../src/animation/skeleton';
import * as clipMod from '../../../src/animation/animation-clip';
import * as skinnedMod from '../../../src/renderer/skinned-mesh';

// Skip if any dependency is still a stub
const isStub =
  ('__STUB__' in skelMod && (skelMod as any).__STUB__ === true) ||
  ('__STUB__' in clipMod && (clipMod as any).__STUB__ === true) ||
  ('__STUB__' in skinnedMod && (skinnedMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

// ── Helper: build a minimal glTF with skin ──

function createFloat32Buffer(...values: number[]): ArrayBuffer {
  const f = new Float32Array(values);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
}

function createUint16Buffer(...values: number[]): ArrayBuffer {
  const u = new Uint16Array(values);
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
}

/**
 * Builds a minimal glTF JSON with:
 * - 2 joint nodes (root + child)
 * - 1 skinned mesh with 4 vertices
 * - 1 simple animation (root translates along Y over 1 second)
 */
function buildSkinnedGltf(): { json: GltfJson; buffers: Map<number, ArrayBuffer> } {
  // Identity mat4
  const id16 = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

  // Buffer 0: positions (4 verts * 3 floats = 12 floats)
  const positions = createFloat32Buffer(
    -1, 0, 0,  1, 0, 0,  1, 2, 0,  -1, 2, 0,
  );
  // Buffer 1: joints (4 verts * 4 = 16 floats, stored as float for simplicity)
  const joints = createFloat32Buffer(
    0, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  );
  // Buffer 2: weights (4 verts * 4 = 16 floats)
  const weights = createFloat32Buffer(
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  );
  // Buffer 3: indices (6 indices)
  const indices = createUint16Buffer(0, 1, 2, 0, 2, 3);
  // Buffer 4: inverse bind matrices (2 * 16 = 32 floats)
  const ibm = createFloat32Buffer(...id16, ...id16);
  // Buffer 5: animation input (time keyframes)
  const animInput = createFloat32Buffer(0, 1);
  // Buffer 6: animation output (translation values: 2 * 3 = 6 floats)
  const animOutput = createFloat32Buffer(0, 0, 0, 0, 3, 0);

  const allBuffers = [positions, joints, weights, indices, ibm, animInput, animOutput];
  let totalLength = 0;
  const offsets: number[] = [];
  for (const buf of allBuffers) {
    offsets.push(totalLength);
    totalLength += buf.byteLength;
  }

  // Merge into single buffer
  const merged = new ArrayBuffer(totalLength);
  const mergedView = new Uint8Array(merged);
  for (let i = 0; i < allBuffers.length; i++) {
    mergedView.set(new Uint8Array(allBuffers[i]), offsets[i]);
  }

  const json: any = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'Root', children: [1, 2] },        // node 0: scene root
      { name: 'Joint0' },                          // node 1: root bone
      { name: 'Joint1' },                          // node 2: child bone
      { name: 'SkinnedBody', mesh: 0, skin: 0 },  // node 3: skinned mesh
    ],
    // Fix: add node 3 as child of root
    meshes: [{
      primitives: [{
        attributes: {
          POSITION: 0,
          JOINTS_0: 1,
          WEIGHTS_0: 2,
        },
        indices: 3,
      }],
    }],
    skins: [{
      joints: [1, 2],
      inverseBindMatrices: 4,
    }],
    animations: [{
      name: 'RootBounce',
      channels: [{
        sampler: 0,
        target: { node: 1, path: 'translation' },
      }],
      samplers: [{
        input: 5,
        output: 6,
        interpolation: 'LINEAR',
      }],
    }],
    accessors: [
      // 0: positions
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3' },
      // 1: joints
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC4' },
      // 2: weights
      { bufferView: 2, componentType: 5126, count: 4, type: 'VEC4' },
      // 3: indices
      { bufferView: 3, componentType: 5123, count: 6, type: 'SCALAR' },
      // 4: inverse bind matrices
      { bufferView: 4, componentType: 5126, count: 2, type: 'MAT4' },
      // 5: animation input (time)
      { bufferView: 5, componentType: 5126, count: 2, type: 'SCALAR' },
      // 6: animation output (translation)
      { bufferView: 6, componentType: 5126, count: 2, type: 'VEC3' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: positions.byteLength },
      { buffer: 0, byteOffset: offsets[1], byteLength: joints.byteLength },
      { buffer: 0, byteOffset: offsets[2], byteLength: weights.byteLength },
      { buffer: 0, byteOffset: offsets[3], byteLength: indices.byteLength },
      { buffer: 0, byteOffset: offsets[4], byteLength: ibm.byteLength },
      { buffer: 0, byteOffset: offsets[5], byteLength: animInput.byteLength },
      { buffer: 0, byteOffset: offsets[6], byteLength: animOutput.byteLength },
    ],
    buffers: [{ byteLength: totalLength }],
  };

  // Patch: node 0 children should include node 3
  json.nodes[0].children = [1, 2, 3];

  return { json: json as GltfJson, buffers: new Map([[0, merged]]) };
}

/* ───────────── Skin parsing ───────────── */

describeImpl('glTF Loader — skin parsing', () => {
  it('should return skeletons array in GltfAsset', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    expect(asset.skeletons).toBeDefined();
    expect(asset.skeletons.length).toBe(1);
  });

  it('should create Skeleton with correct bone count', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    expect(asset.skeletons[0].boneCount).toBe(2);
  });

  it('should create Skeleton with bone names from nodes', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    const sk = asset.skeletons[0];
    expect(sk.getBoneIndex('Joint0')).toBe(0);
    expect(sk.getBoneIndex('Joint1')).toBe(1);
  });

  it('should load inverse bind matrices', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    const sk = asset.skeletons[0];
    // Both are identity
    expect(sk.inverseBindMatrices[0]).toBe(1);
    expect(sk.inverseBindMatrices[5]).toBe(1);
    expect(sk.inverseBindMatrices[10]).toBe(1);
    expect(sk.inverseBindMatrices[15]).toBe(1);
  });
});

/* ───────────── SkinnedMesh creation ───────────── */

describeImpl('glTF Loader — skinned mesh', () => {
  it('should create SkinnedMesh for nodes with skin', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    // Find the skinned mesh node
    let found = false;
    asset.scene.traverse((node) => {
      if (node.name === 'SkinnedBody') {
        expect(node).toBeInstanceOf(skinnedMod.SkinnedMesh);
        found = true;
      }
    });
    expect(found).toBe(true);
  });

  it('should bind skeleton to SkinnedMesh', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    let mesh: any = null;
    asset.scene.traverse((node) => {
      if (node.name === 'SkinnedBody') mesh = node;
    });
    expect(mesh).not.toBeNull();
    expect(mesh.skeleton).toBe(asset.skeletons[0]);
  });
});

/* ───────────── Animation parsing ───────────── */

describeImpl('glTF Loader — animation parsing', () => {
  it('should return animations array in GltfAsset', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    expect(asset.animations).toBeDefined();
    expect(asset.animations.length).toBe(1);
  });

  it('should create AnimationClip with correct name', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    expect(asset.animations[0].name).toBe('RootBounce');
  });

  it('should create AnimationClip with correct duration', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    expect(asset.animations[0].duration).toBe(1);
  });

  it('should map glTF node indices to skeleton bone indices in tracks', () => {
    const { json, buffers } = buildSkinnedGltf();
    const asset = parseGltf(json, buffers);
    const clip = asset.animations[0];
    expect(clip.tracks.length).toBe(1);
    // Channel targets node 1 (Joint0) → bone index 0
    expect(clip.tracks[0].jointIndex).toBe(0);
    expect(clip.tracks[0].targetPath).toBe('translation');
  });
});

/* ───────────── GltfAsset without skin/animation ───────────── */

describeImpl('glTF Loader — backward compatibility', () => {
  it('should return empty skeletons/animations for non-skinned models', () => {
    const json: GltfJson = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ name: 'Cube', mesh: 0 }],
      meshes: [{
        primitives: [{
          attributes: { POSITION: 0 },
          indices: 1,
        }],
      }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
        { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36 },
        { buffer: 0, byteOffset: 36, byteLength: 6 },
      ],
      buffers: [{ byteLength: 42 }],
    };
    const buf = new ArrayBuffer(42);
    new Float32Array(buf, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    new Uint16Array(buf, 36, 3).set([0, 1, 2]);

    const asset = parseGltf(json, new Map([[0, buf]]));
    expect(asset.skeletons).toBeDefined();
    expect(asset.skeletons.length).toBe(0);
    expect(asset.animations).toBeDefined();
    expect(asset.animations.length).toBe(0);
  });
});
