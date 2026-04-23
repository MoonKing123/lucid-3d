/**
 * SceneTreeDumper — 场景图 JSON 序列化
 *
 * 把 Node3D 层级序列化为 JSON 友好的纯数据结构（含 transform / mesh refs / 子树），
 * 用于调试运行时场景状态、对比快照、AI Agent 自查场景结构。
 *
 * @see test/unit/debug/scene-dumper.test.ts
 */

import type { Node3D } from '../core/node3d';

export interface SerializedNode {
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  children: SerializedNode[];
  meshInfo?: {
    geometryType: string;
    materialType: string;
  };
}

export interface DumpOptions {
  includeMesh?: boolean;
  maxDepth?: number;
}

export function dumpScene(root: Node3D, options?: DumpOptions): SerializedNode {
  const maxDepth = options?.maxDepth ?? Infinity;
  const includeMesh = options?.includeMesh !== false;

  function serialize(node: Node3D, depth: number): SerializedNode {
    const p = node.position;
    const r = node.rotation;
    const s = node.scale;

    const result: SerializedNode = {
      name: node.name,
      type: node.constructor.name,
      position: [p[0], p[1], p[2]],
      rotation: [r[0], r[1], r[2]],
      scale: [s[0], s[1], s[2]],
      visible: node.visible,
      children: depth < maxDepth
        ? node.children.map(child => serialize(child, depth + 1))
        : [],
    };

    if (includeMesh && isMesh(node)) {
      result.meshInfo = {
        geometryType: (node as MeshLike).geometry?.constructor.name ?? 'unknown',
        materialType: (node as MeshLike).material?.constructor.name ?? 'unknown',
      };
    }

    return result;
  }

  return serialize(root, 0);
}

export function dumpSceneJSON(root: Node3D, options?: DumpOptions, indent?: number): string {
  return JSON.stringify(dumpScene(root, options), null, indent);
}

interface MeshLike {
  geometry?: object;
  material?: object;
}

function isMesh(node: Node3D): node is Node3D & MeshLike {
  return node.constructor.name === 'Mesh' && 'geometry' in node && 'material' in node;
}
