/**
 * STUB — glTF 2.0 Loader (not yet implemented).
 *
 * This file exists so that pre-written tests can import without crashing.
 * All functions throw "not implemented" until a Dev worker implements #18.
 *
 * @see test/unit/loader/gltf-loader.test.ts
 */

/** Marker: true if this module is a stub (not yet implemented). */
export const __STUB__ = true;
import type { Node3D } from '../core/node3d';
import type { Geometry } from '../renderer/geometry';

export interface GltfAsset {
  scene: Node3D;
  geometries: Geometry[];
}

export interface GltfJson {
  asset: { version: string };
  buffers?: Array<{ uri?: string; byteLength: number }>;
  bufferViews?: Array<{ buffer: number; byteOffset?: number; byteLength: number }>;
  accessors?: Array<{
    bufferView: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
  }>;
  meshes?: Array<{
    name?: string;
    primitives: Array<{
      attributes: Record<string, number>;
      indices?: number;
    }>;
  }>;
  nodes?: Array<{
    name?: string;
    mesh?: number;
    children?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
  }>;
  scenes?: Array<{ nodes: number[] }>;
  scene?: number;
}

export function parseGltf(_json: GltfJson, _externalBuffers?: Map<number, ArrayBuffer>): GltfAsset {
  throw new Error('Not implemented — waiting for Issue #18');
}

export function decodeDataUri(_uri: string): ArrayBuffer {
  throw new Error('Not implemented — waiting for Issue #18');
}

export function readAccessor(_json: GltfJson, _index: number, _buffers: ArrayBuffer[]): Float32Array | Uint16Array {
  throw new Error('Not implemented — waiting for Issue #18');
}
