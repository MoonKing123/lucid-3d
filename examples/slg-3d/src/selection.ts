/**
 * SelectionSystem — Raycast 单选 + 框选逻辑。
 *
 * 单选：射线与 InstancedMesh 各实例的包围球求交，取最近命中。
 * 框选：将单位世界坐标投影到 NDC，检查是否在屏幕矩形内（仅选我方单位）。
 */
import { Raycaster } from '../../../src/core/ray';
import { type OrbitCamera } from '../../../src/core/orbit-camera';
import { vec3 } from '../../../src/math/vec3';
import { multiply } from '../../../src/math/mat4';
import { UnitManager } from './units';

/** 屏幕空间框选矩形（NDC 坐标，范围 -1..1） */
export interface SelectRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class SelectionSystem {
  private _selectedIds = new Set<number>();

  constructor(private unitManager: UnitManager) {}

  get selectedIds(): ReadonlySet<number> {
    return this._selectedIds;
  }

  /**
   * 射线单选：从 NDC 坐标发射射线，命中最近单位。
   * @param ndcX  屏幕 NDC X（-1..1）
   * @param ndcY  屏幕 NDC Y（-1..1）
   * @param camera OrbitCamera
   * @param additive 是否追加选中（Shift+点击）
   */
  pickAt(
    ndcX: number,
    ndcY: number,
    camera: OrbitCamera,
    additive = false,
  ): number | null {
    const raycaster = new Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const ray = raycaster.ray;

    let bestId = -1;
    let bestDist = Infinity;
    const r = this.unitManager.boundRadius;

    // 对每个实例做射线-球体求交
    for (const unit of this.unitManager.units) {
      // 实例中心（包围球圆心）= instanceMatrix 的平移部分
      const mat = this.unitManager.mesh.getMatrixAt(unit.id);
      // 列优先：平移在 [12, 13, 14]
      const cx = mat[12];
      const cy = mat[13];
      const cz = mat[14];

      // 射线-球体求交
      const oc0 = ray.origin[0] - cx;
      const oc1 = ray.origin[1] - cy;
      const oc2 = ray.origin[2] - cz;
      const b = 2 * (ray.direction[0] * oc0 + ray.direction[1] * oc1 + ray.direction[2] * oc2);
      const c = oc0 * oc0 + oc1 * oc1 + oc2 * oc2 - r * r;
      const disc = b * b - 4 * c;
      if (disc < 0) continue;

      const t = (-b - Math.sqrt(disc)) / 2;
      if (t < 0 || t >= bestDist) continue;

      bestDist = t;
      bestId = unit.id;
    }

    if (!additive) {
      // 清空旧选中
      this._clearAndSync();
    }

    if (bestId >= 0) {
      if (additive && this._selectedIds.has(bestId)) {
        // Shift 再次点击已选中单位 → 取消选中
        this._selectedIds.delete(bestId);
        this.unitManager.setSelected(bestId, false);
      } else {
        this._selectedIds.add(bestId);
        this.unitManager.setSelected(bestId, true);
      }
      return bestId;
    }

    return null;
  }

  /**
   * 框选：NDC 矩形内的**我方**单位全部选中。
   * @param rect  NDC 框选矩形
   * @param camera OrbitCamera
   * @param additive 是否追加（Shift+框选）
   */
  boxSelect(rect: SelectRect, camera: OrbitCamera, additive = false): void {
    const vp = camera.viewProjectionMatrix;

    if (!additive) {
      this._clearAndSync();
    }

    const x0 = Math.min(rect.x0, rect.x1);
    const x1 = Math.max(rect.x0, rect.x1);
    const y0 = Math.min(rect.y0, rect.y1);
    const y1 = Math.max(rect.y0, rect.y1);

    for (const unit of this.unitManager.units) {
      if (unit.faction !== 'ally') continue;

      // 投影单位世界坐标到 NDC
      const mat = this.unitManager.mesh.getMatrixAt(unit.id);
      const wx = mat[12];
      const wy = mat[13];
      const wz = mat[14];

      // MVP 变换（列优先）
      const cx = vp[0] * wx + vp[4] * wy + vp[8]  * wz + vp[12];
      const cy = vp[1] * wx + vp[5] * wy + vp[9]  * wz + vp[13];
      // const cz = vp[2] * wx + vp[6] * wy + vp[10] * wz + vp[14];
      const cw = vp[3] * wx + vp[7] * wy + vp[11] * wz + vp[15];
      if (Math.abs(cw) < 1e-8) continue;

      const ndcX = cx / cw;
      const ndcY = cy / cw;

      if (ndcX >= x0 && ndcX <= x1 && ndcY >= y0 && ndcY <= y1) {
        this._selectedIds.add(unit.id);
        this.unitManager.setSelected(unit.id, true);
      }
    }
  }

  /** 清空选中集合并同步高亮 */
  clearSelection(): void {
    this._clearAndSync();
  }

  private _clearAndSync(): void {
    for (const id of this._selectedIds) {
      this.unitManager.setSelected(id, false);
    }
    this._selectedIds.clear();
  }
}
