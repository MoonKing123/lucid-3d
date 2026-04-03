/**
 * LOD — 基于距离的层级细节切换。
 * 根据到相机的距离自动显示/隐藏不同细节级别的子节点。
 * @see test/unit/core/lod.test.ts
 */

import { Node3D } from './node3d';
import type { Vec3 } from '../math/vec3';

export interface LODLevel {
  /** 此层级对应的场景节点 */
  object: Node3D;
  /** 切换距离阈值：当到相机距离 >= distance 时显示此层级 */
  distance: number;
}

export class LOD extends Node3D {
  private _levels: LODLevel[] = [];
  private _currentLevel = -1;

  /** 所有层级（按 distance 升序排列，只读视图） */
  get levels(): ReadonlyArray<LODLevel> {
    return this._levels;
  }

  constructor(name = 'lod') {
    super(name);
  }

  /**
   * 添加一个细节层级，按 distance 升序插入，并将节点加为子节点。
   * @param object   此层级的场景节点
   * @param distance 切换距离阈值（0 = 最高细节）
   */
  addLevel(object: Node3D, distance: number): this {
    this.addChild(object);
    // 按 distance 升序插入（稳定）
    let idx = this._levels.length;
    for (let i = 0; i < this._levels.length; i++) {
      if (distance < this._levels[i].distance) {
        idx = i;
        break;
      }
    }
    this._levels.splice(idx, 0, { object, distance });
    return this;
  }

  /**
   * 根据相机位置更新可见层级。
   * 选择最后一个 distance <= 实际距离的层级，其余隐藏。
   * @param cameraPosition 相机世界坐标
   */
  update(cameraPosition: Vec3): void {
    if (this._levels.length === 0) {
      this._currentLevel = -1;
      return;
    }

    // 使用世界矩阵的平移分量计算 LOD 世界位置
    const wm = this.worldMatrix;
    const dx = wm[12] - cameraPosition[0];
    const dy = wm[13] - cameraPosition[1];
    const dz = wm[14] - cameraPosition[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 找到最后一个 distance <= dist 的层级
    let selected = 0;
    for (let i = 0; i < this._levels.length; i++) {
      if (this._levels[i].distance <= dist) {
        selected = i;
      } else {
        break;
      }
    }

    this._currentLevel = selected;

    // 只有选中的层级可见
    for (let i = 0; i < this._levels.length; i++) {
      this._levels[i].object.visible = i === selected;
    }
  }

  /** 当前激活的层级索引，-1 表示无层级 */
  get currentLevel(): number {
    return this._currentLevel;
  }
}
