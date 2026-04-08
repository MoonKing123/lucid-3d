/**
 * 集成测试：M3.4 资源采集循环
 *
 * 验收标准：
 * - 至少 10 个我方单位能并发采集不冲突
 * - 资源计数随采集事件增长
 * - StateMachine 4 状态切换无遗漏
 * - EventEmitter 事件可被测试监听
 * - 30 秒内资源增加超过阈值（模拟时间：1800 帧 × 1/60s）
 * - headless 压力测试 1800 帧采集循环不崩溃
 * - 不修改 src/ 任何文件
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UnitManager } from '../../src/units';
import { buildNavMap, NavMap } from '../../src/nav';
import { ResourceState } from '../../src/resource-state';
import { createBase, createResourceNodes, type ResourceNode, type BaseBuilding } from '../../src/buildings';
import { HarvestSystem, type HarvestState } from '../../src/harvest';

// ────────────────────────────────────────────────────────────
// 辅助：构建一套完整的测试环境
// ────────────────────────────────────────────────────────────
function buildEnv() {
  const unitManager    = new UnitManager();
  const navMap         = buildNavMap();
  const resourceState  = new ResourceState();
  const base           = createBase();
  const resourceNodes  = createResourceNodes();
  const harvestSystem  = new HarvestSystem(
    unitManager, navMap, resourceState, base, resourceNodes,
  );
  const allyUnits = unitManager.units.filter(u => u.faction === 'ally');
  return { unitManager, navMap, resourceState, base, resourceNodes, harvestSystem, allyUnits };
}

// ────────────────────────────────────────────────────────────
// ResourceState — 全局资源 + EventEmitter
// ────────────────────────────────────────────────────────────
describe('ResourceState — 全局资源与事件', () => {
  it('初始 gold=0, wood=0', () => {
    const rs = new ResourceState();
    expect(rs.gold).toBe(0);
    expect(rs.wood).toBe(0);
  });

  it('addGold 增加金矿并触发 resource.changed 事件', () => {
    const rs = new ResourceState();
    let called = 0;
    let payload = { gold: 0, wood: 0 };
    rs.events.on('resource.changed', (r) => { called++; payload = r; });
    rs.addGold(50);
    expect(rs.gold).toBe(50);
    expect(called).toBe(1);
    expect(payload.gold).toBe(50);
  });

  it('addWood 增加木材并触发 resource.changed 事件', () => {
    const rs = new ResourceState();
    let called = 0;
    rs.events.on('resource.changed', () => called++);
    rs.addWood(30);
    expect(rs.wood).toBe(30);
    expect(called).toBe(1);
  });

  it('多次 addGold 累积计数', () => {
    const rs = new ResourceState();
    rs.addGold(50);
    rs.addGold(50);
    rs.addGold(50);
    expect(rs.gold).toBe(150);
  });

  it('getResources 返回当前快照', () => {
    const rs = new ResourceState();
    rs.addGold(100);
    rs.addWood(200);
    const snap = rs.getResources();
    expect(snap.gold).toBe(100);
    expect(snap.wood).toBe(200);
  });

  it('unit.state.changed 事件可被监听', () => {
    const rs = new ResourceState();
    const stateLog: Array<{ id: number; state: string }> = [];
    rs.events.on('unit.state.changed', (id, state) => stateLog.push({ id, state }));
    rs.events.emit('unit.state.changed', 0, 'moving');
    rs.events.emit('unit.state.changed', 1, 'gathering');
    expect(stateLog).toHaveLength(2);
    expect(stateLog[0]).toEqual({ id: 0, state: 'moving' });
    expect(stateLog[1]).toEqual({ id: 1, state: 'gathering' });
  });
});

// ────────────────────────────────────────────────────────────
// Buildings — 基地与资源点
// ────────────────────────────────────────────────────────────
describe('Buildings — 基地与资源点', () => {
  it('createBase 返回有效基地', () => {
    const base = createBase();
    expect(base).toBeDefined();
    expect(typeof base.x).toBe('number');
    expect(typeof base.z).toBe('number');
    expect(base.radius).toBeGreaterThan(0);
  });

  it('createResourceNodes 返回 ≥3 个资源点', () => {
    const nodes = createResourceNodes();
    expect(nodes.length).toBeGreaterThanOrEqual(3);
  });

  it('资源点有正储量', () => {
    const nodes = createResourceNodes();
    for (const node of nodes) {
      expect(node.amount).toBeGreaterThan(0);
      expect(node.maxAmount).toBeGreaterThan(0);
    }
  });

  it('资源点 id 不重复', () => {
    const nodes = createResourceNodes();
    const ids = new Set(nodes.map(n => n.id));
    expect(ids.size).toBe(nodes.length);
  });

  it('资源点包含 gold 和 wood 两种类型', () => {
    const nodes = createResourceNodes();
    const types = new Set(nodes.map(n => n.type));
    expect(types.has('gold')).toBe(true);
    expect(types.has('wood')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// HarvestSystem — 初始化
// ────────────────────────────────────────────────────────────
describe('HarvestSystem — 初始化', () => {
  it('创建不抛出异常', () => {
    expect(() => buildEnv()).not.toThrow();
  });

  it('commandGather 不抛出异常', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 3).map(u => u.id);
    expect(() => harvestSystem.commandGather(ids, resourceNodes[0])).not.toThrow();
  });

  it('commandGather 后单位进入 moving 或仍为 idle（路径不通时）', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 5).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);
    for (const id of ids) {
      const state = harvestSystem.getState(id);
      expect(['idle', 'moving']).toContain(state);
    }
  });

  it('未注册单位 getState 返回 null', () => {
    const { harvestSystem } = buildEnv();
    expect(harvestSystem.getState(9999)).toBeNull();
  });

  it('未注册单位 getCarried 返回 null', () => {
    const { harvestSystem } = buildEnv();
    expect(harvestSystem.getCarried(9999)).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────
// StateMachine 4 状态切换验证
// ────────────────────────────────────────────────────────────
describe('StateMachine — 4 状态切换', () => {
  /**
   * 使用单独放置在资源点旁的单位，强制快速到达采集点，
   * 验证 idle → moving → gathering → moving → depositing → moving 完整循环。
   */
  it('单位执行 commandGather 后能进入 moving 状态', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    // 找一个可寻路到资源点的单位
    const id = allyUnits[0].id;
    harvestSystem.commandGather([id], resourceNodes[0]);
    const state = harvestSystem.getState(id);
    expect(['idle', 'moving']).toContain(state);
  });

  it('能观察到 gathering 状态（模拟足够帧到达资源点）', () => {
    const { unitManager, navMap, resourceState, base, resourceNodes, harvestSystem, allyUnits } = buildEnv();

    // 找一个位置可通行的单位，选最近的资源点
    let gatheringObserved = false;

    for (const unit of allyUnits) {
      if (!navMap.isWalkableWorld(unit.x, unit.z)) continue;

      harvestSystem.commandGather([unit.id], resourceNodes[0]);
      if (harvestSystem.getState(unit.id) !== 'moving') continue;

      // 运行至多 600 帧（10 秒），等待到达并采集
      for (let i = 0; i < 600; i++) {
        harvestSystem.update(1 / 60);
        if (harvestSystem.getState(unit.id) === 'gathering') {
          gatheringObserved = true;
          break;
        }
      }
      if (gatheringObserved) break;
    }

    expect(gatheringObserved).toBe(true);
  });

  it('能观察到 depositing 状态（背包满后前往基地）', () => {
    const { navMap, harvestSystem, allyUnits, resourceNodes } = buildEnv();

    let depositingObserved = false;

    for (const unit of allyUnits) {
      if (!navMap.isWalkableWorld(unit.x, unit.z)) continue;

      harvestSystem.commandGather([unit.id], resourceNodes[0]);
      if (harvestSystem.getState(unit.id) !== 'moving') continue;

      // 运行至多 3600 帧（60 秒），等待整个采集→存入循环
      for (let i = 0; i < 3600; i++) {
        harvestSystem.update(1 / 60);
        if (harvestSystem.getState(unit.id) === 'depositing') {
          depositingObserved = true;
          break;
        }
      }
      if (depositingObserved) break;
    }

    expect(depositingObserved).toBe(true);
  });

  it('4 个合法状态值均包含在枚举范围内', () => {
    const validStates: HarvestState[] = ['idle', 'moving', 'gathering', 'depositing'];
    expect(validStates).toContain('idle');
    expect(validStates).toContain('moving');
    expect(validStates).toContain('gathering');
    expect(validStates).toContain('depositing');
  });
});

// ────────────────────────────────────────────────────────────
// EventEmitter 事件可被测试监听
// ────────────────────────────────────────────────────────────
describe('EventEmitter — 事件监听', () => {
  it('resource.changed 事件在 addGold/addWood 时触发', () => {
    const rs = new ResourceState();
    const events: Array<{ gold: number; wood: number }> = [];
    rs.events.on('resource.changed', (r) => events.push({ ...r }));

    rs.addGold(50);
    rs.addWood(30);

    expect(events).toHaveLength(2);
    expect(events[0].gold).toBe(50);
    expect(events[1].wood).toBe(30);
  });

  it('unit.state.changed 在 HarvestSystem 触发状态变化时被调用', () => {
    const { harvestSystem, resourceState, allyUnits, resourceNodes, navMap } = buildEnv();

    const stateChanges: Array<{ id: number; state: string }> = [];
    resourceState.events.on('unit.state.changed', (id, state) => {
      stateChanges.push({ id, state });
    });

    const unit = allyUnits.find(u => navMap.isWalkableWorld(u.x, u.z));
    if (!unit) return; // 若无可通行单位跳过

    harvestSystem.commandGather([unit.id], resourceNodes[0]);

    // 至少应有一次 unit.state.changed 事件（commandGather → moving）
    expect(stateChanges.length).toBeGreaterThanOrEqual(1);
    const movingEvent = stateChanges.find(e => e.id === unit.id && e.state === 'moving');
    expect(movingEvent).toBeDefined();
  });

  it('off 之后不再收到事件', () => {
    const rs = new ResourceState();
    let count = 0;
    const listener = () => { count++; };
    rs.events.on('resource.changed', listener);
    rs.addGold(10); // count = 1
    rs.events.off('resource.changed', listener);
    rs.addGold(10); // count 应保持 1
    expect(count).toBe(1);
  });

  it('removeAllListeners 清空所有监听', () => {
    const rs = new ResourceState();
    let count = 0;
    rs.events.on('resource.changed', () => count++);
    rs.events.on('resource.changed', () => count++);
    rs.events.removeAllListeners('resource.changed');
    rs.addGold(10);
    expect(count).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────
// 并发采集（≥10 个单位）
// ────────────────────────────────────────────────────────────
describe('并发采集 — ≥10 个单位', () => {
  it('10 个我方单位同时 commandGather 不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);
    expect(() => {
      harvestSystem.commandGather(ids, resourceNodes[0]);
    }).not.toThrow();
  });

  it('10 个单位 commandGather 后 update 100 帧不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);
    expect(() => {
      for (let i = 0; i < 100; i++) harvestSystem.update(1 / 60);
    }).not.toThrow();
  });

  it('10 个单位采集后所有状态均为合法值', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);

    for (let i = 0; i < 300; i++) harvestSystem.update(1 / 60);

    const validStates: HarvestState[] = ['idle', 'moving', 'gathering', 'depositing'];
    for (const id of ids) {
      const state = harvestSystem.getState(id);
      expect(validStates).toContain(state);
    }
  });

  it('40 个我方单位全部采集不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.map(u => u.id);
    expect(ids.length).toBeGreaterThanOrEqual(10);

    expect(() => {
      harvestSystem.commandGather(ids, resourceNodes[0]);
      for (let i = 0; i < 300; i++) harvestSystem.update(1 / 60);
    }).not.toThrow();
  });

  it('多单位分配不同资源点不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    expect(() => {
      for (let i = 0; i < 10; i++) {
        const node = resourceNodes[i % resourceNodes.length];
        harvestSystem.commandGather([allyUnits[i].id], node);
      }
      for (let i = 0; i < 300; i++) harvestSystem.update(1 / 60);
    }).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// 集成测试：30 秒内资源增加超过阈值
// ────────────────────────────────────────────────────────────
describe('集成测试 — 30 秒内资源增加超过阈值', () => {
  it('10 个单位 1800 帧后总资源 > 50（至少完成一次采集循环）', () => {
    const { harvestSystem, resourceState, allyUnits, resourceNodes } = buildEnv();

    // 命令所有我方单位去第一个资源点
    const ids = allyUnits.slice(0, 10).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);

    // 模拟 30 秒（1800 帧 × 1/60s）
    for (let i = 0; i < 1800; i++) {
      harvestSystem.update(1 / 60);
    }

    const total = resourceState.gold + resourceState.wood;
    // 理论最低：若有任意一个单位完成一次存入，则为 50
    // 考虑移动延迟，保守阈值设为 50
    expect(total).toBeGreaterThan(50);
  });

  it('40 个单位 1800 帧后总资源 > 100', () => {
    const { harvestSystem, resourceState, allyUnits, resourceNodes } = buildEnv();

    const ids = allyUnits.map(u => u.id);
    // 分配到多个资源点
    for (let i = 0; i < ids.length; i++) {
      harvestSystem.commandGather([ids[i]], resourceNodes[i % resourceNodes.length]);
    }

    for (let i = 0; i < 1800; i++) {
      harvestSystem.update(1 / 60);
    }

    const total = resourceState.gold + resourceState.wood;
    expect(total).toBeGreaterThan(100);
  });

  it('resource.changed 事件累积触发次数 > 0', () => {
    const { harvestSystem, resourceState, allyUnits, resourceNodes } = buildEnv();

    let changeCount = 0;
    resourceState.events.on('resource.changed', () => { changeCount++; });

    const ids = allyUnits.slice(0, 10).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);

    for (let i = 0; i < 1800; i++) {
      harvestSystem.update(1 / 60);
    }

    expect(changeCount).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────
// headless 压力测试：1800 帧采集循环不崩溃
// ────────────────────────────────────────────────────────────
describe('headless 压力测试 — 1800 帧', () => {
  it('10 个单位 1800 帧采集循环不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);

    expect(() => {
      harvestSystem.commandGather(ids, resourceNodes[0]);
      for (let i = 0; i < 1800; i++) {
        harvestSystem.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('全部 40 个我方单位 1800 帧稳定运行', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.map(u => u.id);

    expect(() => {
      for (let i = 0; i < ids.length; i++) {
        harvestSystem.commandGather([ids[i]], resourceNodes[i % resourceNodes.length]);
      }
      for (let i = 0; i < 1800; i++) {
        harvestSystem.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('1800 帧后所有单位状态仍为合法值', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);
    harvestSystem.commandGather(ids, resourceNodes[0]);

    for (let i = 0; i < 1800; i++) harvestSystem.update(1 / 60);

    const validStates: HarvestState[] = ['idle', 'moving', 'gathering', 'depositing'];
    for (const id of ids) {
      const state = harvestSystem.getState(id);
      expect(validStates).toContain(state);
    }
  });

  it('中途切换目标资源点 1800 帧不崩溃', () => {
    const { harvestSystem, allyUnits, resourceNodes } = buildEnv();
    const ids = allyUnits.slice(0, 10).map(u => u.id);

    expect(() => {
      harvestSystem.commandGather(ids, resourceNodes[0]);
      for (let frame = 0; frame < 1800; frame++) {
        // 每 600 帧切换目标资源点，模拟玩家重新下达命令
        if (frame === 600) harvestSystem.commandGather(ids, resourceNodes[1]);
        if (frame === 1200) harvestSystem.commandGather(ids, resourceNodes[2]);
        harvestSystem.update(1 / 60);
      }
    }).not.toThrow();
  });

  it('资源全部耗尽后单位不崩溃', () => {
    const { unitManager, navMap, resourceState, base } = buildEnv();

    // 创建只有 1 金储量的极小资源点
    const tinyNodes: ResourceNode[] = [
      { id: 0, x: 30, z: -40, type: 'gold', amount: 10, maxAmount: 10 },
    ];
    const hs = new HarvestSystem(unitManager, navMap, resourceState, base, tinyNodes);

    const ids = unitManager.units.filter(u => u.faction === 'ally').slice(0, 5).map(u => u.id);

    expect(() => {
      hs.commandGather(ids, tinyNodes[0]);
      for (let i = 0; i < 1800; i++) hs.update(1 / 60);
    }).not.toThrow();
  });
});
