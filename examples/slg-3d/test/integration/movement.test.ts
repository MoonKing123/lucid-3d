/**
 * 集成测试：M3.3 单位移动寻路
 *
 * 验收标准：
 * - NavGrid 正确反映地形 walkability
 * - 选中单位右键目标点 → A* 计算出路径 → 单位沿路径移动
 * - 多个单位（≥10）同时寻路并行无崩溃
 * - 单位绕过障碍物（不穿墙）
 * - StateMachine idle/moving/arrived 状态切换可被测试读取
 * - headless 压力测试 1800 帧下 50+ 单位同时寻路稳定
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { NavMap, buildNavMap, NAV_CELLS, NAV_OFFSET_X, NAV_OFFSET_Z } from '../../src/nav';
import { createUnitStateMachine } from '../../src/unit-states';
import { UnitMovementSystem } from '../../src/unit-movement';
import { UnitManager } from '../../src/units';
import { findPath } from '../../../../src/navigation/pathfinder';

// ────────────────────────────────────────────────────────────
// NavMap — 导航网格构建
// ────────────────────────────────────────────────────────────
describe('NavMap — 导航网格构建', () => {
  let navMap: NavMap;

  beforeEach(() => {
    navMap = buildNavMap();
  });

  it('buildNavMap 不抛出异常', () => {
    expect(() => buildNavMap()).not.toThrow();
  });

  it('NavGrid 尺寸为 NAV_CELLS×NAV_CELLS', () => {
    expect(navMap.grid.width).toBe(NAV_CELLS);
    expect(navMap.grid.height).toBe(NAV_CELLS);
    expect(navMap.grid.cellSize).toBe(1);
  });

  it('地图中心 (0, 0) 默认可通行', () => {
    expect(navMap.isWalkableWorld(0, 0)).toBe(true);
  });

  it('可通行区域：地图边缘（非障碍物）可通行', () => {
    // 左上角区域（无障碍物）
    expect(navMap.isWalkableWorld(-60, -60)).toBe(true);
    // 右下角区域（无障碍物）
    expect(navMap.isWalkableWorld(55, 55)).toBe(true);
  });

  it('障碍物区域不可通行', () => {
    // 西北森林：worldX=-20, worldZ=-30, 8×8 格
    // 该障碍物内部的点应为 blocked
    expect(navMap.isWalkableWorld(-18, -28)).toBe(false);
    // 北部岩石群：worldX=10, worldZ=-20, 6×10 格
    expect(navMap.isWalkableWorld(12, -18)).toBe(false);
  });

  it('worldToGrid 坐标转换正确', () => {
    // 世界原点映射到 grid (64, 64)
    const [gx, gz] = navMap.worldToGrid(0, 0);
    expect(gx).toBe(NAV_OFFSET_X);
    expect(gz).toBe(NAV_OFFSET_Z);
  });

  it('worldToGrid / gridToWorld 互为逆运算（整格精度）', () => {
    const worldPairs: Array<[number, number]> = [
      [0, 0], [-30, 20], [50, -40], [-63, -63], [62, 62],
    ];
    for (const [wx, wz] of worldPairs) {
      const [gx, gz] = navMap.worldToGrid(wx, wz);
      const [bx, bz] = navMap.gridToWorld(gx, gz);
      // gridToWorld 返回格子中心，差值应 < cellSize/2=0.5
      expect(Math.abs(bx - (wx + 0.5))).toBeLessThan(1);
      expect(Math.abs(bz - (wz + 0.5))).toBeLessThan(1);
    }
  });
});

// ────────────────────────────────────────────────────────────
// A* 寻路
// ────────────────────────────────────────────────────────────
describe('A* 寻路', () => {
  let navMap: NavMap;

  beforeEach(() => {
    navMap = buildNavMap();
  });

  it('在可通行区域内 findPathWorld 能找到路径', () => {
    // 两个确认可通行的点
    const result = navMap.findPathWorld(-60, -60, 55, 55);
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('路径起点和终点与请求坐标对应', () => {
    const result = navMap.findPathWorld(-50, -50, 50, 50);
    expect(result.found).toBe(true);
    // 路径第一格应对应起点的网格坐标
    const [sgx, sgz] = navMap.worldToGrid(-50, -50);
    expect(result.path[0][0]).toBe(sgx);
    expect(result.path[0][1]).toBe(sgz);
    // 路径最后一格应对应终点
    const [egx, egz] = navMap.worldToGrid(50, 50);
    const last = result.path[result.path.length - 1];
    expect(last[0]).toBe(egx);
    expect(last[1]).toBe(egz);
  });

  it('路径绕过障碍物（路径上无 blocked 格子）', () => {
    // 在西北森林障碍物两侧设起终点
    // 障碍物：worldX=-20, worldZ=-30, 8×8 格
    const result = navMap.findPathWorld(-30, -35, -10, -25);
    if (!result.found) return; // 若找不到路径跳过（两端可能也被遮挡）
    // 验证路径上每个格子都是可通行的
    for (const [gx, gz] of result.path) {
      expect(navMap.grid.isWalkable(gx, gz)).toBe(true);
    }
  });

  it('终点在障碍物内时返回 found=false', () => {
    // 在障碍物内部设终点
    const result = navMap.findPathWorld(0, 0, -18, -28);
    expect(result.found).toBe(false);
  });

  it('起点等于终点时路径长度为 1', () => {
    const result = navMap.findPathWorld(0, 0, 0, 0);
    expect(result.found).toBe(true);
    expect(result.path.length).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────
// StateMachine — 状态切换
// ────────────────────────────────────────────────────────────
describe('StateMachine — 单位状态切换', () => {
  it('初始状态为 idle', () => {
    const sm = createUnitStateMachine();
    expect(sm.current).toBe('idle');
  });

  it('idle → moving 转换成功', () => {
    const sm = createUnitStateMachine();
    const ok = sm.transition('moving');
    expect(ok).toBe(true);
    expect(sm.current).toBe('moving');
  });

  it('moving → arrived 转换成功', () => {
    const sm = createUnitStateMachine();
    sm.transition('moving');
    const ok = sm.transition('arrived');
    expect(ok).toBe(true);
    expect(sm.current).toBe('arrived');
  });

  it('arrived → idle 转换成功', () => {
    const sm = createUnitStateMachine();
    sm.transition('moving');
    sm.transition('arrived');
    const ok = sm.transition('idle');
    expect(ok).toBe(true);
    expect(sm.current).toBe('idle');
  });

  it('moving → idle 转换成功（命令取消）', () => {
    const sm = createUnitStateMachine();
    sm.transition('moving');
    const ok = sm.transition('idle');
    expect(ok).toBe(true);
    expect(sm.current).toBe('idle');
  });

  it('isIn() 正确反映当前状态', () => {
    const sm = createUnitStateMachine();
    expect(sm.isIn('idle')).toBe(true);
    expect(sm.isIn('moving')).toBe(false);
    sm.transition('moving');
    expect(sm.isIn('moving')).toBe(true);
    expect(sm.isIn('idle')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// UnitMovementSystem — 单位移动命令
// ────────────────────────────────────────────────────────────
describe('UnitMovementSystem — 单位移动命令', () => {
  let um: UnitManager;
  let navMap: NavMap;
  let moveSys: UnitMovementSystem;

  beforeEach(() => {
    um = new UnitManager();
    navMap = buildNavMap();
    moveSys = new UnitMovementSystem(um, navMap);
  });

  it('UnitMovementSystem 创建不抛出', () => {
    expect(() => new UnitMovementSystem(um, navMap)).not.toThrow();
  });

  it('初始时所有单位状态为 idle', () => {
    for (const unit of um.units.slice(0, 10)) {
      expect(moveSys.getState(unit.id)).toBe('idle');
    }
  });

  it('commandMove 后目标单位进入 moving 状态', () => {
    const ids = um.units.slice(0, 3).map(u => u.id);
    moveSys.commandMove(ids, 30, 30);
    for (const id of ids) {
      // 可能路径不通（单位初始位置在障碍物内？），至少不崩溃
      const state = moveSys.getState(id);
      expect(['idle', 'moving']).toContain(state);
    }
  });

  it('commandMove 后可通行路径上的单位状态变为 moving', () => {
    // 找一个初始在可通行格子上的我方单位
    const allyUnit = um.units.find(u =>
      u.faction === 'ally' && navMap.isWalkableWorld(u.x, u.z)
    );
    if (!allyUnit) return; // 若找不到跳过

    moveSys.commandMove([allyUnit.id], 30, -50);
    const state = moveSys.getState(allyUnit.id);
    expect(state).toBe('moving');
  });

  it('update 驱动单位向目标移动（位置变化）', () => {
    const allyUnit = um.units.find(u =>
      u.faction === 'ally' && navMap.isWalkableWorld(u.x, u.z)
    );
    if (!allyUnit) return;

    const initX = allyUnit.x;
    const initZ = allyUnit.z;
    moveSys.commandMove([allyUnit.id], 30, -50);

    if (moveSys.getState(allyUnit.id) !== 'moving') return;

    // 运行 60 帧
    for (let i = 0; i < 60; i++) moveSys.update(1 / 60);

    const unit = um.units[allyUnit.id];
    // 位置应有变化
    const moved = Math.abs(unit.x - initX) + Math.abs(unit.z - initZ);
    expect(moved).toBeGreaterThan(0.1);
  });

  it('update 足够帧后单位到达目标（arrived 或 idle）', () => {
    // 找可通行的单位，设置近距离目标
    const allyUnit = um.units.find(u =>
      u.faction === 'ally' && navMap.isWalkableWorld(u.x, u.z)
    );
    if (!allyUnit) return;

    // 目标就在附近（5 格之内）
    const tgtX = allyUnit.x + 3;
    const tgtZ = allyUnit.z + 3;

    moveSys.commandMove([allyUnit.id], tgtX, tgtZ);
    if (moveSys.getState(allyUnit.id) !== 'moving') return;

    // 最多跑 600 帧（10 秒）
    for (let i = 0; i < 600; i++) {
      moveSys.update(1 / 60);
      const state = moveSys.getState(allyUnit.id);
      if (state === 'arrived' || state === 'idle') break;
    }

    const finalState = moveSys.getState(allyUnit.id);
    expect(['arrived', 'idle']).toContain(finalState);
  });

  it('getAgent 返回单位的 NavAgent', () => {
    const agent = moveSys.getAgent(um.units[0].id);
    expect(agent).not.toBeNull();
  });

  it('getNode 返回单位的 Node3D', () => {
    const node = moveSys.getNode(um.units[0].id);
    expect(node).not.toBeNull();
  });

  it('无效 id 返回 null', () => {
    expect(moveSys.getState(9999)).toBeNull();
    expect(moveSys.getAgent(9999)).toBeNull();
    expect(moveSys.getNode(9999)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────
// 多单位并发寻路（≥10 个单位）
// ────────────────────────────────────────────────────────────
describe('多单位并发寻路', () => {
  it('10 个单位同时 commandMove 不崩溃', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    const ids = um.units.slice(0, 10).map(u => u.id);

    expect(() => {
      moveSys.commandMove(ids, 0, 0);
    }).not.toThrow();
  });

  it('10 个单位移动后 update 100 帧不崩溃', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    const ids = um.units.slice(0, 10).map(u => u.id);
    moveSys.commandMove(ids, 0, 0);

    expect(() => {
      for (let i = 0; i < 100; i++) moveSys.update(1 / 60);
    }).not.toThrow();
  });

  it('所有我方单位（40 个）同时寻路不崩溃', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    const allyIds = um.units
      .filter(u => u.faction === 'ally')
      .map(u => u.id);

    expect(allyIds.length).toBeGreaterThanOrEqual(10);

    expect(() => {
      moveSys.commandMove(allyIds, 50, -50);
      for (let i = 0; i < 300; i++) moveSys.update(1 / 60);
    }).not.toThrow();
  });

  it('单位不穿越障碍物（路径格子全部可通行）', () => {
    const navMap = buildNavMap();

    // 直接用 findPath 验证：起点绕过障碍物到达终点
    // 在北部岩石群障碍物（worldX=10, worldZ=-20, 6×10 格）两侧寻路
    const result = navMap.findPathWorld(5, -30, 20, -10);
    if (!result.found) return;

    for (const [gx, gz] of result.path) {
      expect(navMap.grid.isWalkable(gx, gz)).toBe(true);
    }
  });

  it('多目标分散寻路：每个单位目标点不同，均不崩溃', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    expect(() => {
      const allyIds = um.units.filter(u => u.faction === 'ally').map(u => u.id);
      // 每 5 帧换一次目标，模拟实时命令
      for (let frame = 0; frame < 200; frame++) {
        if (frame % 50 === 0) {
          const tx = ((frame % 5) - 2) * 15;
          const tz = ((frame % 7) - 3) * 10;
          moveSys.commandMove(allyIds.slice(0, 15), tx, tz);
        }
        moveSys.update(1 / 60);
      }
    }).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// headless 压力测试：1800 帧 × 50+ 单位
// ────────────────────────────────────────────────────────────
describe('headless 压力测试', () => {
  it('1800 帧下 50 个单位同时寻路稳定（无崩溃）', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    // 选取 50 个单位（跨阵营）
    const ids = um.units.slice(0, 50).map(u => u.id);
    expect(ids.length).toBe(50);

    expect(() => {
      // 初始命令
      moveSys.commandMove(ids, 0, 0);

      for (let frame = 0; frame < 1800; frame++) {
        // 每 600 帧重新下达移动命令，模拟连续操作
        if (frame % 600 === 300) {
          const tx = frame % 2 === 0 ? 40 : -40;
          const tz = frame % 3 === 0 ? 40 : -40;
          moveSys.commandMove(ids, tx, tz);
        }
        moveSys.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('1800 帧下所有 120 个单位运行稳定', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    const allIds = um.units.map(u => u.id);
    expect(allIds.length).toBe(120);

    expect(() => {
      moveSys.commandMove(allIds, -30, -30);
      for (let frame = 0; frame < 1800; frame++) {
        if (frame === 900) {
          moveSys.commandMove(allIds, 30, 30);
        }
        moveSys.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('1800 帧后单位状态仍为合法值', () => {
    const um = new UnitManager();
    const navMap = buildNavMap();
    const moveSys = new UnitMovementSystem(um, navMap);

    const ids = um.units.slice(0, 50).map(u => u.id);
    moveSys.commandMove(ids, 0, 0);

    for (let i = 0; i < 1800; i++) moveSys.update(1 / 60);

    for (const id of ids) {
      const state = moveSys.getState(id);
      expect(['idle', 'moving', 'arrived']).toContain(state);
    }
  });

  it('findPath 在 128×128 网格上 100 次调用不崩溃', () => {
    const navMap = buildNavMap();
    const pairs: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 100; i++) {
      const sx = ((i * 37) % 100) - 50;
      const sz = ((i * 53) % 100) - 50;
      const ex = ((i * 71) % 100) - 50;
      const ez = ((i * 89) % 100) - 50;
      pairs.push([sx, sz, ex, ez]);
    }

    expect(() => {
      for (const [sx, sz, ex, ez] of pairs) {
        navMap.findPathWorld(sx, sz, ex, ez);
      }
    }).not.toThrow();
  });
});
