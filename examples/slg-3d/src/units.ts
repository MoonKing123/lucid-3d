/**
 * UnitManager — 批量单位渲染（InstancedMesh）+ 阵营 + 选中高亮。
 *
 * 120 个单位：40 我方（蓝色）+ 40 敌方（红色）+ 40 中立（黄色）。
 * 选中单位变为亮黄色高亮。
 */
import { InstancedMesh } from '../../../src/renderer/instanced-mesh';
import { createCylinderGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { vec3 } from '../../../src/math/vec3';
import {
  identity,
  translate,
  rotateY,
  multiply,
  type Mat4,
} from '../../../src/math/mat4';
import { TERRAIN_SIZE } from './terrain';

export type Faction = 'ally' | 'enemy' | 'neutral';

export interface UnitData {
  id: number;
  /** 世界空间位置 */
  x: number;
  y: number;
  z: number;
  /** Y 轴旋转（弧度） */
  rotationY: number;
  faction: Faction;
  selected: boolean;
}

/** 单位尺寸 */
const UNIT_RADIUS = 0.5;
const UNIT_HEIGHT = 2.0;

/** 阵营基础颜色 */
const COLOR_ALLY    = vec3(0.2, 0.5, 1.0);   // 蓝色
const COLOR_ENEMY   = vec3(1.0, 0.3, 0.2);   // 红色
const COLOR_NEUTRAL = vec3(0.8, 0.8, 0.2);   // 黄色
const COLOR_SELECTED = vec3(1.0, 1.0, 0.0);  // 亮黄高亮

/** 每个阵营的单位数量 */
const UNITS_PER_FACTION = 40;
export const TOTAL_UNITS = UNITS_PER_FACTION * 3; // 120

/** 随机种子生成器（确定性，用于测试） */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export class UnitManager {
  readonly mesh: InstancedMesh;
  readonly units: UnitData[];

  constructor() {
    // 单位几何体：圆柱体（兵种外形）
    const geo = createCylinderGeometry({
      radiusTop: UNIT_RADIUS,
      radiusBottom: UNIT_RADIUS,
      height: UNIT_HEIGHT,
      radialSegments: 8,
    });
    const mat = new PhongMaterial({
      diffuse: vec3(1, 1, 1),      // 由 instanceColor 覆盖
      ambient: vec3(0.3, 0.3, 0.3),
      specular: vec3(0.3, 0.3, 0.3),
      shininess: 8,
    });

    this.mesh = new InstancedMesh(geo, mat, TOTAL_UNITS);
    this.mesh.name = 'units';

    // 初始化单位数据
    this.units = [];
    const rand = seededRandom(42);
    const half = TERRAIN_SIZE / 2 - 8; // 留出边距

    const factions: Faction[] = ['ally', 'enemy', 'neutral'];
    for (let f = 0; f < factions.length; f++) {
      const faction = factions[f];
      // 区域划分：我方左侧、敌方右侧、中立中间
      for (let i = 0; i < UNITS_PER_FACTION; i++) {
        const id = f * UNITS_PER_FACTION + i;

        let x: number, z: number;
        if (faction === 'ally') {
          x = -half + rand() * (half * 0.6);
          z = -half + rand() * (half * 2);
        } else if (faction === 'enemy') {
          x = half * 0.4 + rand() * (half * 0.6);
          z = -half + rand() * (half * 2);
        } else {
          x = -half * 0.3 + rand() * (half * 0.6);
          z = -half + rand() * (half * 2);
        }

        const rotY = rand() * Math.PI * 2;

        this.units.push({
          id,
          x,
          y: UNIT_HEIGHT / 2, // 底部贴地
          z,
          rotationY: rotY,
          faction,
          selected: false,
        });
      }
    }

    // 同步到 InstancedMesh
    this._syncAll();
  }

  /** 获取单位包围球半径（用于射线检测） */
  get boundRadius(): number {
    return Math.sqrt(UNIT_RADIUS * UNIT_RADIUS + (UNIT_HEIGHT / 2) * (UNIT_HEIGHT / 2));
  }

  /** 设置单位选中状态 */
  setSelected(unitId: number, selected: boolean): void {
    if (unitId < 0 || unitId >= TOTAL_UNITS) return;
    const unit = this.units[unitId];
    unit.selected = selected;
    this._syncColor(unitId);
  }

  /** 清空所有选中 */
  clearSelection(): void {
    for (const unit of this.units) {
      if (unit.selected) {
        unit.selected = false;
        this._syncColor(unit.id);
      }
    }
  }

  /** 同步所有实例矩阵和颜色 */
  private _syncAll(): void {
    for (const unit of this.units) {
      this._syncMatrix(unit.id);
      this._syncColor(unit.id);
    }
  }

  /** 同步单个实例的变换矩阵 */
  private _syncMatrix(id: number): void {
    const unit = this.units[id];
    // T * Ry 矩阵
    const t = translate(identity(), vec3(unit.x, unit.y, unit.z));
    const m = rotateY(t, unit.rotationY);
    this.mesh.setMatrixAt(id, m as Mat4);
  }

  /** 同步单个实例的颜色 */
  private _syncColor(id: number): void {
    const unit = this.units[id];
    if (unit.selected) {
      this.mesh.setColorAt(id, COLOR_SELECTED);
    } else {
      switch (unit.faction) {
        case 'ally':    this.mesh.setColorAt(id, COLOR_ALLY);    break;
        case 'enemy':   this.mesh.setColorAt(id, COLOR_ENEMY);   break;
        case 'neutral': this.mesh.setColorAt(id, COLOR_NEUTRAL); break;
      }
    }
  }
}
