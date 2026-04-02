/**
 * glTF 2.0 Loader — 将 glTF JSON + 二进制缓冲区解析为引擎场景图。
 * 支持：网格图元（POSITION/NORMAL/TEXCOORD_0/indices）、节点层次结构、
 * 嵌入式 base64 缓冲区、外部 ArrayBuffer、材质基础颜色 → 顶点颜色。
 */

import { Node3D } from '../core/node3d';
import { Geometry } from '../renderer/geometry';
import { Mesh } from '../renderer/mesh';
import { Material } from '../renderer/material';
import { vec3 } from '../math/vec3';

// ── 类型定义 ──────────────────────────────────────────────────────

export interface GltfJson {
  asset: { version: string };
  scene?: number;
  scenes?: Array<{
    name?: string;
    nodes?: number[];
  }>;
  nodes?: Array<{
    name?: string;
    mesh?: number;
    children?: number[];
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    matrix?: number[];
  }>;
  meshes?: Array<{
    name?: string;
    primitives: Array<{
      attributes: Record<string, number>;
      indices?: number;
      material?: number;
    }>;
  }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
  }>;
  bufferViews?: Array<{
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: number;
  }>;
  buffers?: Array<{
    uri?: string;
    byteLength: number;
  }>;
  materials?: Array<{
    name?: string;
    pbrMetallicRoughness?: {
      baseColorFactor?: [number, number, number, number];
    };
  }>;
}

export interface GltfAsset {
  /** 默认场景的根 Node3D。 */
  scene: Node3D;
  /** 所有从网格图元创建的 Geometry 对象。 */
  geometries: Geometry[];
}

// ── componentType 常量 ────────────────────────────────────────────

const FLOAT = 5126;           // Float32Array
const UNSIGNED_SHORT = 5123;  // Uint16Array
// const UNSIGNED_INT = 5125; // Uint32Array（备用）

// accessor type → 每元素的分量数
const TYPE_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

// ── 公开 API ──────────────────────────────────────────────────────

/**
 * 将 base64 data URI 解码为 ArrayBuffer。非 data URI 时抛出错误。
 */
export function decodeDataUri(uri: string): ArrayBuffer {
  if (!uri.startsWith('data:')) {
    throw new Error(`非 data URI，无法解码: ${uri}`);
  }
  const commaIdx = uri.indexOf(',');
  const base64 = uri.slice(commaIdx + 1);
  const binary = Buffer.from(base64, 'base64');
  const result = new ArrayBuffer(binary.length);
  new Uint8Array(result).set(binary);
  return result;
}

/**
 * 读取 accessor 数据为类型化数组（FLOAT → Float32Array，UNSIGNED_SHORT → Uint16Array）。
 */
export function readAccessor(
  json: GltfJson,
  index: number,
  buffers: ArrayBuffer[],
): Float32Array | Uint16Array {
  const accessor = json.accessors![index];
  const bvIdx = accessor.bufferView!;
  const bufferView = json.bufferViews![bvIdx];
  const buffer = buffers[bufferView.buffer];

  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const components = TYPE_COMPONENTS[accessor.type];
  const elementCount = accessor.count * components;

  if (accessor.componentType === FLOAT) {
    return new Float32Array(buffer, byteOffset, elementCount);
  } else if (accessor.componentType === UNSIGNED_SHORT) {
    return new Uint16Array(buffer, byteOffset, elementCount);
  } else {
    // UNSIGNED_INT (5125) 回退：以 Uint32Array 读取
    const src = new Uint32Array(buffer, byteOffset, elementCount);
    return src as unknown as Float32Array;
  }
}

/**
 * 将 glTF 2.0 JSON + 二进制缓冲区解析为引擎场景图。
 * - 自动解码嵌入式 base64 data URI
 * - 通过 externalBuffers 传入外部 .bin 文件
 * - 非 2.0 版本时抛出错误
 */
export function parseGltf(
  json: GltfJson,
  externalBuffers?: Map<number, ArrayBuffer>,
): GltfAsset {
  if (!json.asset.version.startsWith('2.')) {
    throw new Error(
      `不支持的 glTF 版本: ${json.asset.version}，仅支持 2.x`,
    );
  }

  const buffers = resolveBuffers(json, externalBuffers);

  const sceneIdx = json.scene ?? 0;
  const sceneDef = json.scenes?.[sceneIdx];
  const sceneRoot = new Node3D(sceneDef?.name ?? '');

  const geometries: Geometry[] = [];
  const nodeList = json.nodes ?? [];

  for (const nodeIdx of (sceneDef?.nodes ?? [])) {
    const child = buildNode(json, nodeIdx, nodeList, buffers, geometries);
    sceneRoot.addChild(child);
  }

  return { scene: sceneRoot, geometries };
}

// ── 内部辅助函数 ──────────────────────────────────────────────────

/** 解析所有 buffer：data URI 自动解码，外部缓冲区由调用方提供。 */
function resolveBuffers(
  json: GltfJson,
  externalBuffers?: Map<number, ArrayBuffer>,
): ArrayBuffer[] {
  if (!json.buffers) return [];
  return json.buffers.map((buf, i) => {
    if (buf.uri?.startsWith('data:')) {
      return decodeDataUri(buf.uri);
    }
    if (externalBuffers?.has(i)) {
      return externalBuffers.get(i)!;
    }
    return new ArrayBuffer(buf.byteLength);
  });
}

/** 递归构建节点，有 mesh 引用的返回 Mesh，否则返回 Node3D。 */
function buildNode(
  json: GltfJson,
  nodeIdx: number,
  nodeList: NonNullable<GltfJson['nodes']>,
  buffers: ArrayBuffer[],
  geometries: Geometry[],
): Node3D {
  const def = nodeList[nodeIdx];
  let node: Node3D;

  if (def.mesh !== undefined) {
    const meshDef = json.meshes![def.mesh];
    // 每个图元各生成一个 Geometry
    const primGeos = meshDef.primitives.map((prim) =>
      buildPrimitive(json, prim, buffers),
    );
    geometries.push(...primGeos);
    // Mesh 节点使用第一个图元的 Geometry
    node = new Mesh(primGeos[0], new Material(), def.name ?? '');
  } else {
    node = new Node3D(def.name ?? '');
  }

  // 应用变换
  if (def.translation) {
    node.position = vec3(def.translation[0], def.translation[1], def.translation[2]);
  }
  if (def.scale) {
    node.scale = vec3(def.scale[0], def.scale[1], def.scale[2]);
  }

  // 递归构建子节点
  for (const childIdx of (def.children ?? [])) {
    const child = buildNode(json, childIdx, nodeList, buffers, geometries);
    node.addChild(child);
  }

  return node;
}

/** 从 glTF 图元构建 Geometry。 */
function buildPrimitive(
  json: GltfJson,
  prim: NonNullable<GltfJson['meshes']>[number]['primitives'][number],
  buffers: ArrayBuffer[],
): Geometry {
  const attrs = prim.attributes;

  // POSITION（必须）
  const positions = new Float32Array(readAccessor(json, attrs['POSITION'], buffers));

  let normals: Float32Array | undefined;
  if ('NORMAL' in attrs) {
    normals = new Float32Array(readAccessor(json, attrs['NORMAL'], buffers));
  }

  let uvs: Float32Array | undefined;
  if ('TEXCOORD_0' in attrs) {
    uvs = new Float32Array(readAccessor(json, attrs['TEXCOORD_0'], buffers));
  }

  let indices: Uint16Array | undefined;
  if (prim.indices !== undefined) {
    const raw = readAccessor(json, prim.indices, buffers);
    indices = new Uint16Array(raw as ArrayLike<number>);
  }

  // 材质 baseColorFactor → 顶点颜色（RGB）
  let colors: Float32Array | undefined;
  if (prim.material !== undefined) {
    const matDef = json.materials?.[prim.material];
    const baseColor = matDef?.pbrMetallicRoughness?.baseColorFactor;
    if (baseColor) {
      const vertexCount = positions.length / 3;
      colors = new Float32Array(vertexCount * 3);
      for (let i = 0; i < vertexCount; i++) {
        colors[i * 3]     = baseColor[0]; // R
        colors[i * 3 + 1] = baseColor[1]; // G
        colors[i * 3 + 2] = baseColor[2]; // B
      }
    }
  }

  return new Geometry({ positions, colors, normals, uvs, indices });
}
