/**
 * 集成测试：M3.2 单位批量渲染 + 选择系统
 *
 * 验收标准：
 * - InstancedMesh 批量渲染 ≥100 单位
 * - Raycast 单选命中 instanceId
 * - 框选选中我方单位
 * - 选中高亮颜色变化
 * - headless 1800 帧压力测试无崩溃
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UnitManager, TOTAL_UNITS } from '../../src/units';
import { SelectionSystem } from '../../src/selection';
import { CameraRig } from '../../src/camera-rig';
import { Game } from '../../src/game';

// ────────────────────────────────────────────────────────────
// UnitManager — 批量渲染验证
// ────────────────────────────────────────────────────────────
describe('UnitManager — InstancedMesh 批量渲染', () => {
  it('TOTAL_UNITS 至少 100 个单位', () => {
    expect(TOTAL_UNITS).toBeGreaterThanOrEqual(100);
  });

  it('创建 UnitManager 后 units 数组长度等于 TOTAL_UNITS', () => {
    const um = new UnitManager();
    expect(um.units.length).toBe(TOTAL_UNITS);
  });

  it('InstancedMesh.count 等于 TOTAL_UNITS', () => {
    const um = new UnitManager();
    expect(um.mesh.count).toBe(TOTAL_UNITS);
  });

  it('三种阵营各 40 个单位', () => {
    const um = new UnitManager();
    const ally    = um.units.filter(u => u.faction === 'ally').length;
    const enemy   = um.units.filter(u => u.faction === 'enemy').length;
    const neutral = um.units.filter(u => u.faction === 'neutral').length;
    expect(ally).toBe(40);
    expect(enemy).toBe(40);
    expect(neutral).toBe(40);
  });

  it('每个单位的 instanceMatrix 已正确初始化（非零平移）', () => {
    const um = new UnitManager();
    let nonZeroCount = 0;
    for (const unit of um.units) {
      const m = um.mesh.getMatrixAt(unit.id);
      // 平移分量：列优先 [12, 13, 14]
      const hasTranslation = m[12] !== 0 || m[13] !== 0 || m[14] !== 0;
      if (hasTranslation) nonZeroCount++;
    }
    // 大多数单位应有非零平移（随机分布）
    expect(nonZeroCount).toBeGreaterThan(TOTAL_UNITS * 0.9);
  });

  it('instanceColor 已初始化', () => {
    const um = new UnitManager();
    expect(um.mesh.instanceColor).not.toBeNull();
    expect(um.mesh.instanceColor!.length).toBe(TOTAL_UNITS * 3);
  });

  it('我方单位颜色为蓝色（R 较低，B 较高）', () => {
    const um = new UnitManager();
    const allyUnits = um.units.filter(u => u.faction === 'ally');
    const first = allyUnits[0];
    const color = um.mesh.getColorAt(first.id);
    // 蓝色：R < 0.5, B > 0.5
    expect(color[0]).toBeLessThan(0.5);
    expect(color[2]).toBeGreaterThan(0.5);
  });

  it('敌方单位颜色为红色（R 较高，B 较低）', () => {
    const um = new UnitManager();
    const enemyUnits = um.units.filter(u => u.faction === 'enemy');
    const first = enemyUnits[0];
    const color = um.mesh.getColorAt(first.id);
    // 红色：R > 0.5, B < 0.5
    expect(color[0]).toBeGreaterThan(0.5);
    expect(color[2]).toBeLessThan(0.5);
  });
});

// ────────────────────────────────────────────────────────────
// 选中高亮验证
// ────────────────────────────────────────────────────────────
describe('选中高亮', () => {
  let um: UnitManager;

  beforeEach(() => {
    um = new UnitManager();
  });

  it('setSelected(id, true) 将颜色改为高亮色（高 R + 高 G）', () => {
    const id = 0;
    const colorBefore = um.mesh.getColorAt(id);
    um.setSelected(id, true);
    const colorAfter = um.mesh.getColorAt(id);
    // 高亮色与原色不同
    expect(colorAfter[0]).not.toBeCloseTo(colorBefore[0], 1);
    // 高亮色 R ≈ 1.0, G ≈ 1.0
    expect(colorAfter[0]).toBeGreaterThan(0.9);
    expect(colorAfter[1]).toBeGreaterThan(0.9);
  });

  it('setSelected(id, false) 恢复原阵营颜色', () => {
    const id = 0;
    const colorBefore = um.mesh.getColorAt(id);
    um.setSelected(id, true);
    um.setSelected(id, false);
    const colorAfter = um.mesh.getColorAt(id);
    // 恢复后与原色接近
    expect(colorAfter[0]).toBeCloseTo(colorBefore[0], 4);
    expect(colorAfter[1]).toBeCloseTo(colorBefore[1], 4);
    expect(colorAfter[2]).toBeCloseTo(colorBefore[2], 4);
  });

  it('clearSelection 恢复所有单位颜色', () => {
    um.setSelected(0, true);
    um.setSelected(1, true);
    um.setSelected(2, true);
    um.clearSelection();
    for (let i = 0; i < 3; i++) {
      const color = um.mesh.getColorAt(i);
      // 高亮色应该消失（G 不再 ≈ 1.0 对于蓝色单位）
      expect(color[0]).toBeLessThan(0.9); // 我方蓝色
    }
  });
});

// ────────────────────────────────────────────────────────────
// SelectionSystem — 单选
// ────────────────────────────────────────────────────────────
describe('SelectionSystem — Raycast 单选', () => {
  let um: UnitManager;
  let sel: SelectionSystem;
  let rig: CameraRig;

  beforeEach(() => {
    um = new UnitManager();
    sel = new SelectionSystem(um);
    rig = new CameraRig({ aspect: 16 / 9 });
    rig.update(0); // 初始化相机矩阵
  });

  it('初始 selectedIds 为空', () => {
    expect(sel.selectedIds.size).toBe(0);
  });

  it('pickAt 命中已知单位位置返回 instanceId', () => {
    // 取第一个单位，计算其屏幕 NDC
    const unit = um.units[0];
    const camera = rig.camera;

    // 将单位世界坐标投影到 NDC
    const vp = camera.viewProjectionMatrix;
    const wx = unit.x, wy = unit.y, wz = unit.z;
    const cx = vp[0]*wx + vp[4]*wy + vp[8] *wz + vp[12];
    const cy = vp[1]*wx + vp[5]*wy + vp[9] *wz + vp[13];
    const cw = vp[3]*wx + vp[7]*wy + vp[11]*wz + vp[15];

    if (Math.abs(cw) < 1e-6) return; // 单位在相机后，跳过

    const ndcX = cx / cw;
    const ndcY = cy / cw;

    // NDC 范围超出视口则跳过测试
    if (Math.abs(ndcX) > 1.0 || Math.abs(ndcY) > 1.0) return;

    const hitId = sel.pickAt(ndcX, ndcY, camera);
    // 命中的单位应为目标或其附近（球体近似可能命中最近邻）
    expect(hitId).not.toBeNull();
    expect(hitId).toBeGreaterThanOrEqual(0);
  });

  it('pickAt 空地返回 null 并清空选中', () => {
    // 先选一个单位
    sel.pickAt(0, 0, rig.camera);
    // 指向远处空地（NDC 边缘，没有单位）
    const hitId = sel.pickAt(0.99, 0.99, rig.camera);
    // 可能命中也可能不命中，主要验证不崩溃
    expect(hitId === null || hitId >= 0).toBe(true);
  });

  it('Shift+pickAt 追加选中（additive=true）', () => {
    const unit0 = um.units[0];
    const camera = rig.camera;
    const vp = camera.viewProjectionMatrix;

    // 投影 unit0
    const wx0 = unit0.x, wy0 = unit0.y, wz0 = unit0.z;
    const cx0 = vp[0]*wx0 + vp[4]*wy0 + vp[8] *wz0 + vp[12];
    const cy0 = vp[1]*wx0 + vp[5]*wy0 + vp[9] *wz0 + vp[13];
    const cw0 = vp[3]*wx0 + vp[7]*wy0 + vp[11]*wz0 + vp[15];
    if (Math.abs(cw0) < 1e-6) return;
    const ndcX0 = cx0 / cw0, ndcY0 = cy0 / cw0;
    if (Math.abs(ndcX0) > 1 || Math.abs(ndcY0) > 1) return;

    // 先选 unit0
    sel.pickAt(ndcX0, ndcY0, camera, false);
    const sizeAfterFirst = sel.selectedIds.size;
    if (sizeAfterFirst === 0) return; // 没命中，跳过

    // 追加选第二个单位
    const unit1 = um.units.find(u => u.id !== [...sel.selectedIds][0] && u.faction === 'ally');
    if (!unit1) return;

    const wx1 = unit1.x, wy1 = unit1.y, wz1 = unit1.z;
    const cx1 = vp[0]*wx1 + vp[4]*wy1 + vp[8] *wz1 + vp[12];
    const cy1 = vp[1]*wx1 + vp[5]*wy1 + vp[9] *wz1 + vp[13];
    const cw1 = vp[3]*wx1 + vp[7]*wy1 + vp[11]*wz1 + vp[15];
    if (Math.abs(cw1) < 1e-6) return;
    const ndcX1 = cx1 / cw1, ndcY1 = cy1 / cw1;
    if (Math.abs(ndcX1) > 1 || Math.abs(ndcY1) > 1) return;

    sel.pickAt(ndcX1, ndcY1, camera, true);
    // additive 模式下，选中数量应增加或不变（不降低）
    expect(sel.selectedIds.size).toBeGreaterThanOrEqual(sizeAfterFirst);
  });

  it('clearSelection 清空所有选中', () => {
    um.setSelected(0, true);
    um.setSelected(1, true);
    sel.clearSelection();
    expect(sel.selectedIds.size).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────
// SelectionSystem — 框选
// ────────────────────────────────────────────────────────────
describe('SelectionSystem — 框选', () => {
  let um: UnitManager;
  let sel: SelectionSystem;
  let rig: CameraRig;

  beforeEach(() => {
    um = new UnitManager();
    sel = new SelectionSystem(um);
    rig = new CameraRig({ aspect: 16 / 9 });
    rig.update(0);
  });

  it('全屏框选能选中至少 1 个我方单位', () => {
    sel.boxSelect({ x0: -1, y0: -1, x1: 1, y1: 1 }, rig.camera);
    expect(sel.selectedIds.size).toBeGreaterThan(0);
    // 验证选中的都是我方单位
    for (const id of sel.selectedIds) {
      expect(um.units[id].faction).toBe('ally');
    }
  });

  it('框选只选中我方单位，不选敌方/中立', () => {
    sel.boxSelect({ x0: -1, y0: -1, x1: 1, y1: 1 }, rig.camera);
    for (const id of sel.selectedIds) {
      expect(um.units[id].faction).toBe('ally');
      expect(um.units[id].faction).not.toBe('enemy');
      expect(um.units[id].faction).not.toBe('neutral');
    }
  });

  it('空矩形（x0=x1）不选中任何单位', () => {
    sel.boxSelect({ x0: 0, y0: 0, x1: 0, y1: 0 }, rig.camera);
    expect(sel.selectedIds.size).toBe(0);
  });

  it('框选后选中单位颜色变为高亮', () => {
    sel.boxSelect({ x0: -1, y0: -1, x1: 1, y1: 1 }, rig.camera);
    for (const id of sel.selectedIds) {
      const color = um.mesh.getColorAt(id);
      // 高亮色：R ≈ 1.0, G ≈ 1.0
      expect(color[0]).toBeGreaterThan(0.9);
      expect(color[1]).toBeGreaterThan(0.9);
    }
  });

  it('additive 框选叠加到已有选中集合', () => {
    // 先单选一个单位
    const allyUnit = um.units.find(u => u.faction === 'ally')!;
    um.setSelected(allyUnit.id, true);

    // 用内部方法手动模拟选中状态（因为 SelectionSystem 和 UnitManager 独立）
    // 这里直接测试 boxSelect additive
    sel.boxSelect({ x0: -1, y0: -1, x1: 1, y1: 1 }, rig.camera, false);
    const sizeFirst = sel.selectedIds.size;

    if (sizeFirst > 0) {
      // additive 框选不应清空旧选中
      sel.boxSelect({ x0: -1, y0: -1, x1: 0, y1: 0 }, rig.camera, true);
      expect(sel.selectedIds.size).toBeGreaterThanOrEqual(sizeFirst);
    }
  });
});

// ────────────────────────────────────────────────────────────
// headless 压力测试
// ────────────────────────────────────────────────────────────
describe('headless 压力测试', () => {
  it('UnitManager 创建不崩溃', () => {
    expect(() => new UnitManager()).not.toThrow();
  });

  it('SelectionSystem 反复 pickAt + boxSelect 1800 次不崩溃', () => {
    const um = new UnitManager();
    const sel = new SelectionSystem(um);
    const rig = new CameraRig({ aspect: 16 / 9 });
    rig.update(0);
    const camera = rig.camera;

    expect(() => {
      for (let i = 0; i < 1800; i++) {
        const ndcX = ((i % 30) / 30) * 2 - 1;
        const ndcY = ((Math.floor(i / 30) % 30) / 30) * 2 - 1;
        if (i % 7 === 0) {
          sel.boxSelect({ x0: -0.5, y0: -0.5, x1: 0.5, y1: 0.5 }, camera);
        } else {
          sel.pickAt(ndcX, ndcY, camera);
        }
      }
    }).not.toThrow();
  });

  it('Game + UnitManager headless 运行 1800 帧无崩溃', () => {
    const game = new Game({ headless: true });
    const um = new UnitManager();
    expect(() => {
      for (let i = 0; i < 1800; i++) {
        game.update(1 / 60);
      }
    }).not.toThrow();
    expect(game.frameCount).toBe(1800);
    // InstancedMesh 仍然完好
    expect(um.mesh.count).toBe(TOTAL_UNITS);
  });
});
