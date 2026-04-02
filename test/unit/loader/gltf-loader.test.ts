/**
 * Pre-written tests for glTF 2.0 Loader.
 * AI must create src/loader/gltf-loader.ts to make these pass.
 *
 * Depends on: #11 (Geometry normals and UV coordinates)
 *
 * API:
 *   interface GltfAsset {
 *     scene: Node3D;          // root of the default scene
 *     geometries: Geometry[];  // all extracted geometries
 *   }
 *
 *   function parseGltf(json: GltfJson, externalBuffers?: Map<number, ArrayBuffer>): GltfAsset;
 *   function decodeDataUri(uri: string): ArrayBuffer;
 *   function readAccessor(json: GltfJson, index: number, buffers: ArrayBuffer[]): Float32Array | Uint16Array;
 *
 * Type definitions:
 *   interface GltfJson { asset, scenes?, nodes?, meshes?, accessors?, bufferViews?, buffers?, materials? }
 */
import { describe, it, expect } from 'vitest';
import * as gltfModule from '../../../src/loader/gltf-loader';
import type { GltfJson, GltfAsset } from '../../../src/loader/gltf-loader';
import { Geometry } from '../../../src/renderer/geometry';
import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';

// Auto-skip if module is still a stub (not yet implemented)
const isStub = '__STUB__' in gltfModule && (gltfModule as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { parseGltf, decodeDataUri, readAccessor } = gltfModule;

// ── Helpers ─────────────────────────────────────────────────────

/** Encode a typed array as a base64 data URI. */
function toDataUri(...arrays: ArrayBufferView[]): { uri: string; byteLength: number; offsets: number[] } {
  let totalLength = 0;
  const offsets: number[] = [];
  for (const arr of arrays) {
    // Align to 4-byte boundary
    const padding = (4 - (totalLength % 4)) % 4;
    totalLength += padding;
    offsets.push(totalLength);
    totalLength += arr.byteLength;
  }
  const combined = new Uint8Array(totalLength);
  for (let i = 0; i < arrays.length; i++) {
    const arr = arrays[i];
    combined.set(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), offsets[i]);
  }
  const base64 = Buffer.from(combined).toString('base64');
  return {
    uri: `data:application/octet-stream;base64,${base64}`,
    byteLength: totalLength,
    offsets,
  };
}

/** Create a minimal glTF JSON with a single triangle (positions only). */
function makeTriangleGltf(): { json: GltfJson; positions: Float32Array } {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  const buf = toDataUri(positions);

  const json: GltfJson = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
      }],
    }],
    accessors: [{
      bufferView: 0,
      componentType: 5126, // FLOAT
      count: 3,
      type: 'VEC3',
      max: [1, 1, 0],
      min: [0, 0, 0],
    }],
    bufferViews: [{
      buffer: 0,
      byteOffset: buf.offsets[0],
      byteLength: positions.byteLength,
    }],
    buffers: [{
      uri: buf.uri,
      byteLength: buf.byteLength,
    }],
  };

  return { json, positions };
}

/** Create a glTF with indexed triangle + normals + UVs. */
function makeFullTriangleGltf(): {
  json: GltfJson;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
} {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
  const indices = new Uint16Array([0, 1, 2]);

  const buf = toDataUri(indices, positions, normals, uvs);

  const json: GltfJson = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 1, NORMAL: 2, TEXCOORD_0: 3 },
        indices: 0,
      }],
    }],
    accessors: [
      // 0: indices
      { bufferView: 0, componentType: 5123, count: 3, type: 'SCALAR', max: [2], min: [0] },
      // 1: positions
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3', max: [1, 1, 0], min: [0, 0, 0] },
      // 2: normals
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC3', max: [0, 0, 1], min: [0, 0, 1] },
      // 3: uvs
      { bufferView: 3, componentType: 5126, count: 3, type: 'VEC2', max: [1, 1], min: [0, 0] },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: buf.offsets[0], byteLength: indices.byteLength },
      { buffer: 0, byteOffset: buf.offsets[1], byteLength: positions.byteLength },
      { buffer: 0, byteOffset: buf.offsets[2], byteLength: normals.byteLength },
      { buffer: 0, byteOffset: buf.offsets[3], byteLength: uvs.byteLength },
    ],
    buffers: [{ uri: buf.uri, byteLength: buf.byteLength }],
  };

  return { json, positions, normals, uvs, indices };
}

/** Create a glTF with parent-child node hierarchy and transforms. */
function makeHierarchyGltf(): GltfJson {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const buf = toDataUri(positions);

  return {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ name: 'TestScene', nodes: [0] }],
    nodes: [
      { name: 'Root', children: [1, 2], translation: [1, 2, 3] },
      { name: 'ChildA', mesh: 0 },
      { name: 'ChildB', mesh: 0, scale: [2, 2, 2] },
    ],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
      }],
    }],
    accessors: [{
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      max: [1, 1, 0],
      min: [0, 0, 0],
    }],
    bufferViews: [{
      buffer: 0,
      byteOffset: buf.offsets[0],
      byteLength: positions.byteLength,
    }],
    buffers: [{ uri: buf.uri, byteLength: buf.byteLength }],
  };
}

// ── decodeDataUri ───────────────────────────────────────────────

describeImpl('decodeDataUri', () => {
  it('should decode base64 data URI to ArrayBuffer', () => {
    // Encode 4 bytes: [1, 2, 3, 4]
    const base64 = Buffer.from([1, 2, 3, 4]).toString('base64');
    const uri = `data:application/octet-stream;base64,${base64}`;
    const result = decodeDataUri(uri);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(4);
    const view = new Uint8Array(result);
    expect(view[0]).toBe(1);
    expect(view[1]).toBe(2);
    expect(view[2]).toBe(3);
    expect(view[3]).toBe(4);
  });

  it('should handle empty data URI', () => {
    const uri = 'data:application/octet-stream;base64,';
    const result = decodeDataUri(uri);
    expect(result.byteLength).toBe(0);
  });

  it('should throw on non-base64 data URI', () => {
    expect(() => decodeDataUri('https://example.com/file.bin')).toThrow();
  });
});

// ── readAccessor ────────────────────────────────────────────────

describeImpl('readAccessor', () => {
  it('should read VEC3 FLOAT accessor', () => {
    const positions = new Float32Array([1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);
    const buf = toDataUri(positions);
    const buffer = decodeDataUri(buf.uri);

    const json: GltfJson = {
      asset: { version: '2.0' },
      accessors: [{
        bufferView: 0,
        componentType: 5126,
        count: 2,
        type: 'VEC3',
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: buf.offsets[0],
        byteLength: positions.byteLength,
      }],
      buffers: [{ byteLength: buf.byteLength }],
    };

    const result = readAccessor(json, 0, [buffer]);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(6); // 2 × VEC3
    expect(result[0]).toBeCloseTo(1.5);
    expect(result[3]).toBeCloseTo(4.5);
  });

  it('should read VEC2 FLOAT accessor', () => {
    const uvs = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.5, 1.0]);
    const buf = toDataUri(uvs);
    const buffer = decodeDataUri(buf.uri);

    const json: GltfJson = {
      asset: { version: '2.0' },
      accessors: [{
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC2',
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: buf.offsets[0],
        byteLength: uvs.byteLength,
      }],
      buffers: [{ byteLength: buf.byteLength }],
    };

    const result = readAccessor(json, 0, [buffer]);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(6); // 3 × VEC2
    expect(result[4]).toBeCloseTo(0.5);
    expect(result[5]).toBeCloseTo(1.0);
  });

  it('should read SCALAR UNSIGNED_SHORT accessor (indices)', () => {
    const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);
    const buf = toDataUri(indices);
    const buffer = decodeDataUri(buf.uri);

    const json: GltfJson = {
      asset: { version: '2.0' },
      accessors: [{
        bufferView: 0,
        componentType: 5123,
        count: 6,
        type: 'SCALAR',
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: buf.offsets[0],
        byteLength: indices.byteLength,
      }],
      buffers: [{ byteLength: buf.byteLength }],
    };

    const result = readAccessor(json, 0, [buffer]);
    expect(result).toBeInstanceOf(Uint16Array);
    expect(result.length).toBe(6);
    expect(result[0]).toBe(0);
    expect(result[5]).toBe(5);
  });

  it('should handle accessor byteOffset within bufferView', () => {
    // Pad first 12 bytes (3 floats), then actual data starts at offset 12
    const padding = new Float32Array([99, 99, 99]);
    const data = new Float32Array([7.0, 8.0, 9.0]);
    const combined = new Float32Array([...padding, ...data]);
    const buf = toDataUri(combined);
    const buffer = decodeDataUri(buf.uri);

    const json: GltfJson = {
      asset: { version: '2.0' },
      accessors: [{
        bufferView: 0,
        byteOffset: 12, // skip the padding
        componentType: 5126,
        count: 1,
        type: 'VEC3',
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: buf.offsets[0],
        byteLength: combined.byteLength,
      }],
      buffers: [{ byteLength: buf.byteLength }],
    };

    const result = readAccessor(json, 0, [buffer]);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(7.0);
    expect(result[1]).toBeCloseTo(8.0);
    expect(result[2]).toBeCloseTo(9.0);
  });
});

// ── parseGltf — basic mesh ─────────────────────────────────────

describeImpl('parseGltf — basic mesh', () => {
  it('should parse a minimal triangle (positions only)', () => {
    const { json, positions } = makeTriangleGltf();
    const result = parseGltf(json);

    expect(result.scene).toBeInstanceOf(Node3D);
    expect(result.geometries).toHaveLength(1);

    const geo = result.geometries[0];
    expect(geo).toBeInstanceOf(Geometry);
    expect(geo.positions.length).toBe(9); // 3 vertices × 3 components
    // Verify position data matches
    expect(geo.positions[0]).toBeCloseTo(positions[0]);
    expect(geo.positions[3]).toBeCloseTo(positions[3]); // (1, 0, 0) → x=1
    expect(geo.positions[7]).toBeCloseTo(positions[7]); // (0, 1, 0) → y=1
  });

  it('should create a Mesh node in the scene', () => {
    const { json } = makeTriangleGltf();
    const result = parseGltf(json);

    // The scene root should have a child that is a Mesh
    const meshes: Mesh[] = [];
    result.scene.traverse((node) => {
      if (node instanceof Mesh) meshes.push(node);
    });
    expect(meshes).toHaveLength(1);
  });

  it('should parse indexed triangle with normals and UVs', () => {
    const { json, positions, normals, uvs, indices } = makeFullTriangleGltf();
    const result = parseGltf(json);

    expect(result.geometries).toHaveLength(1);
    const geo = result.geometries[0];

    // Positions
    expect(geo.positions.length).toBe(9);
    expect(geo.positions[3]).toBeCloseTo(positions[3]);

    // Normals
    expect(geo.normals).not.toBeNull();
    expect(geo.normals!.length).toBe(9);
    expect(geo.normals![2]).toBeCloseTo(normals[2]); // z = 1

    // UVs
    expect(geo.uvs).not.toBeNull();
    expect(geo.uvs!.length).toBe(6);
    expect(geo.uvs![4]).toBeCloseTo(uvs[4]); // 0.5

    // Indices
    expect(geo.indices).not.toBeNull();
    expect(geo.indices!.length).toBe(3);
    expect(geo.indices![0]).toBe(indices[0]);
    expect(geo.indices![2]).toBe(indices[2]);
  });

  it('should handle non-indexed geometry (no indices accessor)', () => {
    const { json } = makeTriangleGltf();
    const result = parseGltf(json);
    const geo = result.geometries[0];
    // Minimal triangle has no indices accessor → drawArrays
    expect(geo.indices).toBeNull();
  });
});

// ── parseGltf — scene graph hierarchy ──────────────────────────

describeImpl('parseGltf — scene graph', () => {
  it('should build node hierarchy from glTF nodes', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);

    // Root should have 2 children (ChildA, ChildB)
    const root = result.scene;
    expect(root.children.length).toBe(1); // scene root has 1 top-level node ("Root")
    const rootNode = root.children[0];
    expect(rootNode.name).toBe('Root');
    expect(rootNode.children.length).toBe(2);
    expect(rootNode.children[0].name).toBe('ChildA');
    expect(rootNode.children[1].name).toBe('ChildB');
  });

  it('should apply node translation', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);
    const rootNode = result.scene.children[0];

    expect(rootNode.position[0]).toBeCloseTo(1);
    expect(rootNode.position[1]).toBeCloseTo(2);
    expect(rootNode.position[2]).toBeCloseTo(3);
  });

  it('should apply node scale', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);
    const childB = result.scene.children[0].children[1];

    expect(childB.scale[0]).toBeCloseTo(2);
    expect(childB.scale[1]).toBeCloseTo(2);
    expect(childB.scale[2]).toBeCloseTo(2);
  });

  it('should create Mesh nodes for nodes referencing a mesh', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);

    const childA = result.scene.children[0].children[0];
    const childB = result.scene.children[0].children[1];
    const rootNode = result.scene.children[0];

    expect(childA).toBeInstanceOf(Mesh);
    expect(childB).toBeInstanceOf(Mesh);
    expect(rootNode).not.toBeInstanceOf(Mesh); // Root has no mesh
  });

  it('should allow collecting all meshes via traverse', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);

    const meshes: Mesh[] = [];
    result.scene.traverse((node) => {
      if (node instanceof Mesh) meshes.push(node);
    });
    expect(meshes).toHaveLength(2); // ChildA and ChildB both have mesh: 0
  });
});

// ── parseGltf — external buffers ───────────────────────────────

describeImpl('parseGltf — external buffers', () => {
  it('should use externalBuffers when URI is not a data URI', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    // Create external buffer from the positions data
    const externalBuf = new ArrayBuffer(positions.byteLength);
    new Float32Array(externalBuf).set(positions);

    const json: GltfJson = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{
        primitives: [{
          attributes: { POSITION: 0 },
        }],
      }],
      accessors: [{
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        max: [1, 1, 0],
        min: [0, 0, 0],
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: 0,
        byteLength: positions.byteLength,
      }],
      buffers: [{
        uri: 'triangle.bin', // external file — not a data URI
        byteLength: positions.byteLength,
      }],
    };

    const externalBuffers = new Map<number, ArrayBuffer>();
    externalBuffers.set(0, externalBuf);

    const result = parseGltf(json, externalBuffers);
    expect(result.geometries).toHaveLength(1);
    expect(result.geometries[0].positions[3]).toBeCloseTo(1); // x of vertex 1
  });
});

// ── parseGltf — edge cases ─────────────────────────────────────

describeImpl('parseGltf — edge cases', () => {
  it('should handle empty scene (no nodes)', () => {
    const json: GltfJson = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [] }],
    };
    const result = parseGltf(json);
    expect(result.scene).toBeInstanceOf(Node3D);
    expect(result.scene.children).toHaveLength(0);
    expect(result.geometries).toHaveLength(0);
  });

  it('should throw on non-2.0 glTF version', () => {
    const json: GltfJson = {
      asset: { version: '1.0' },
    };
    expect(() => parseGltf(json)).toThrow();
  });

  it('should default to scene 0 when scene property is missing', () => {
    const { json } = makeTriangleGltf();
    delete json.scene;
    // scenes[0] should still be used
    const result = parseGltf(json);
    expect(result.scene).toBeInstanceOf(Node3D);
    expect(result.geometries).toHaveLength(1);
  });

  it('should handle multiple mesh primitives on a single glTF mesh', () => {
    const positions1 = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const positions2 = new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0]);
    const buf = toDataUri(positions1, positions2);

    const json: GltfJson = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{
        primitives: [
          { attributes: { POSITION: 0 } },
          { attributes: { POSITION: 1 } },
        ],
      }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
        { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: buf.offsets[0], byteLength: positions1.byteLength },
        { buffer: 0, byteOffset: buf.offsets[1], byteLength: positions2.byteLength },
      ],
      buffers: [{ uri: buf.uri, byteLength: buf.byteLength }],
    };

    const result = parseGltf(json);
    // Each primitive becomes a separate Geometry
    expect(result.geometries).toHaveLength(2);
    expect(result.geometries[0].positions[0]).toBeCloseTo(0);
    expect(result.geometries[1].positions[0]).toBeCloseTo(2);
  });

  it('should set scene root name from glTF scene name', () => {
    const json = makeHierarchyGltf();
    const result = parseGltf(json);
    // The scene root should carry the scene name
    expect(result.scene.name).toBe('TestScene');
  });
});

// ── parseGltf — material base color ────────────────────────────

describeImpl('parseGltf — materials', () => {
  it('should apply material baseColorFactor as vertex colors when available', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const buf = toDataUri(positions);

    const json: GltfJson = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{
        primitives: [{
          attributes: { POSITION: 0 },
          material: 0,
        }],
      }],
      accessors: [{
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        max: [1, 1, 0],
        min: [0, 0, 0],
      }],
      bufferViews: [{
        buffer: 0,
        byteOffset: buf.offsets[0],
        byteLength: positions.byteLength,
      }],
      buffers: [{ uri: buf.uri, byteLength: buf.byteLength }],
      materials: [{
        name: 'Red',
        pbrMetallicRoughness: {
          baseColorFactor: [1.0, 0.0, 0.0, 1.0],
        },
      }],
    };

    const result = parseGltf(json);
    const geo = result.geometries[0];
    // All 3 vertices should have red color
    expect(geo.colors[0]).toBeCloseTo(1.0); // R
    expect(geo.colors[1]).toBeCloseTo(0.0); // G
    expect(geo.colors[2]).toBeCloseTo(0.0); // B
    // Second vertex same color
    expect(geo.colors[3]).toBeCloseTo(1.0);
    expect(geo.colors[4]).toBeCloseTo(0.0);
    expect(geo.colors[5]).toBeCloseTo(0.0);
  });
});
