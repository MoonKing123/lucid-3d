/**
 * LOD — 基于距离的层级细节切换。
 * 根据到相机的距离自动显示/隐藏不同细节级别的子节点。
 * @see test/unit/core/lod.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

import { Node3D } from './node3d';
import type { Vec3 } from '../math/vec3';

export interface LODLevel {
  /** 此层级对应的场景节点 */
  object: Node3D;
  /** 切换距离阈值：当到相机距离 < distance 时显示此层级 */
  distance: number;
}

export class LOD extends Node3D {
  /** 所有层级（按 distance 升序排列） */
  readonly levels: ReadonlyArray<LODLevel> = [];

  constructor(name = 'lod') {
    super(name);
  }

  /**
   * 添加一个细节层级。
   * @param object   此层级的场景节点（自动成为 LOD 的子节点）
   * @param distance 切换距离（0 = 最高细节）
   */
  addLevel(_object: Node3D, _distance: number): this {
    return this;
  }

  /**
   * 根据相机位置更新可见层级。
   * 只有距离最匹配的层级可见，其余隐藏。
   * @param cameraPosition 相机的世界坐标
   */
  update(_cameraPosition: Vec3): void {
    // stub
  }

  /** 返回当前激活的层级索引，-1 表示无层级 */
  get currentLevel(): number {
    return -1;
  }
}
