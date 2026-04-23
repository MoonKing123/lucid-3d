/**
 * SceneTreeDumper — 场景图 JSON 序列化
 *
 * 把 Node3D 层级序列化为 JSON 友好的纯数据结构（含 transform / mesh refs / 子树），
 * 用于调试运行时场景状态、对比快照、AI Agent 自查场景结构。
 *
 * @see test/unit/debug/scene-dumper.test.ts
 *
 * STUB — Phase 44 Architect 预写
 */

export const __STUB__ = true;

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

export function dumpScene(_root: Node3D, _options?: DumpOptions): SerializedNode {
  throw new Error('Not implemented');
}

export function dumpSceneJSON(_root: Node3D, _options?: DumpOptions, _indent?: number): string {
  throw new Error('Not implemented');
}
