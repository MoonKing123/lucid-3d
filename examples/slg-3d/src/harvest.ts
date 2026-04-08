/**
 * HarvestSystem — 采集循环逻辑。
 *
 * 每个参与采集的单位持有：
 *   - Node3D（位置追踪，不加入场景）
 *   - NavAgent（路径跟随）
 *   - StateMachine<HarvestState>（4 状态：idle/moving/gathering/depositing）
 *   - Timer（驱动采集间隔）
 *
 * 采集循环：
 *   idle → moving（前往资源点）
 *     → gathering（到达资源点，Timer 驱动采集，每秒 GATHER_RATE 金/木）
 *       → moving（背包满/资源耗尽 → 前往基地）
 *         → depositing（到达基地，存入资源）
 *           → moving（返回资源点，继续采集）
 *             → ...
 *
 * 状态变化通过 ResourceState.events 发出 unit.state.changed 事件。
 */
import { Node3D } from '../../../src/core/node3d';
import { NavAgent } from '../../../src/navigation/nav-agent';
import { StateMachine } from '../../../src/gameplay/state-machine';
import { Timer } from '../../../src/gameplay/timer';
import { type NavMap } from './nav';
import { UnitManager } from './units';
import { ResourceState } from './resource-state';
import { type ResourceNode, type BaseBuilding } from './buildings';

/** 采集状态类型 */
export type HarvestState = 'idle' | 'moving' | 'gathering' | 'depositing';

/** 单位背包容量（金/木合计） */
const BACKPACK_CAPACITY = 50;

/** 每秒采集量（资源单位） */
const GATHER_RATE = 10;

/** 采集 tick 间隔（秒） */
const GATHER_INTERVAL = 1.0;

/** 存入动作停留时间（秒），让 depositing 状态可被外部观察到 */
const DEPOSIT_LINGER = 0.3;

/** 单个采集单位的内部状态 */
interface HarvestUnit {
  id: number;
  node: Node3D;
  agent: NavAgent;
  sm: StateMachine<HarvestState>;
  timer: Timer;
  /** 背包中的金矿数量 */
  carriedGold: number;
  /** 背包中的木材数量 */
  carriedWood: number;
  /** 当前负责的资源点 */
  targetNode: ResourceNode | null;
  /** 是否正在前往基地（区分 onArrived 回调的意图） */
  headingToBase: boolean;
  /** depositing 状态已停留时间（秒） */
  depositElapsed: number;
  /** 采集 timer 句柄（-1 表示未激活） */
  gatherHandle: number;
}

/**
 * 管理采集单位集合，驱动 idle/moving/gathering/depositing 完整循环。
 */
export class HarvestSystem {
  private readonly _units = new Map<number, HarvestUnit>();

  constructor(
    private readonly _unitManager: UnitManager,
    private readonly _navMap: NavMap,
    private readonly _resourceState: ResourceState,
    private readonly _base: BaseBuilding,
    private readonly _resourceNodes: ResourceNode[],
  ) {}

  /**
   * 命令指定单位前往指定资源点采集。
   * 若单位已在 HarvestSystem 中注册则直接重新分配目标；否则先注册。
   */
  commandGather(unitIds: number[], node: ResourceNode): void {
    for (const id of unitIds) {
      let hu = this._units.get(id);
      if (!hu) {
        hu = this._createHarvestUnit(id);
        this._units.set(id, hu);
      }
      this._assignTarget(hu, node);
    }
  }

  /**
   * 每帧驱动：更新 Timer、NavAgent、存入计时。
   * @param dt 帧间隔（秒）
   */
  update(dt: number): void {
    for (const hu of this._units.values()) {
      // 先驱动 Timer（触发采集 tick 回调）
      hu.timer.update(dt);

      if (hu.sm.isIn('moving')) {
        hu.agent.update(dt);
        // 同步 node 位置 → UnitManager（更新 InstancedMesh）
        const unit = this._unitManager.units[hu.id];
        if (unit) {
          this._unitManager.updateUnitPosition(
            hu.id,
            hu.node.position[0],
            hu.node.position[2],
          );
        }
      }

      if (hu.sm.isIn('depositing')) {
        hu.depositElapsed += dt;
        if (hu.depositElapsed >= DEPOSIT_LINGER) {
          this._finishDeposit(hu);
        }
      }
    }
  }

  /** 读取单位当前采集状态（不在系统中返回 null）。 */
  getState(unitId: number): HarvestState | null {
    return this._units.get(unitId)?.sm.current ?? null;
  }

  /** 读取单位背包内容（不在系统中返回 null）。 */
  getCarried(unitId: number): { gold: number; wood: number } | null {
    const hu = this._units.get(unitId);
    if (!hu) return null;
    return { gold: hu.carriedGold, wood: hu.carriedWood };
  }

  // ─────────────────────────────────────────────────────────
  // 私有：初始化
  // ─────────────────────────────────────────────────────────

  private _createHarvestUnit(id: number): HarvestUnit {
    const unit = this._unitManager.units[id];

    const node = new Node3D(`harv-${id}`);
    node.position[0] = unit.x;
    node.position[1] = unit.y;
    node.position[2] = unit.z;

    const agent = new NavAgent(node, 15);
    const sm    = this._buildStateMachine();
    const timer = new Timer();

    const hu: HarvestUnit = {
      id,
      node,
      agent,
      sm,
      timer,
      carriedGold: 0,
      carriedWood: 0,
      targetNode: null,
      headingToBase: false,
      depositElapsed: 0,
      gatherHandle: -1,
    };

    // NavAgent 到达终点回调（捕获 hu 引用）
    agent.onArrived(() => this._onArrived(hu));

    return hu;
  }

  /** 构建 4 状态采集状态机并注册所有转换规则。 */
  private _buildStateMachine(): StateMachine<HarvestState> {
    const sm = new StateMachine<HarvestState>(
      { idle: {}, moving: {}, gathering: {}, depositing: {} },
      'idle',
    );
    sm.addTransition('idle',       'moving');
    sm.addTransition('moving',     'gathering');
    sm.addTransition('moving',     'depositing');
    sm.addTransition('gathering',  'moving');
    sm.addTransition('gathering',  'idle');
    sm.addTransition('depositing', 'moving');
    sm.addTransition('depositing', 'idle');
    // 外部可强制打断：moving/gathering/depositing → idle
    sm.addTransition('moving',     'idle');
    return sm;
  }

  // ─────────────────────────────────────────────────────────
  // 私有：采集循环
  // ─────────────────────────────────────────────────────────

  /** 分配资源点并启动前往移动。 */
  private _assignTarget(hu: HarvestUnit, node: ResourceNode): void {
    this._stopGathering(hu);
    hu.targetNode    = node;
    hu.headingToBase = false;
    this._moveTo(hu, node.x, node.z);
  }

  /**
   * 导航至目标世界坐标。
   * 若状态不是 moving，则先转换；若路径找不到，回退 idle。
   */
  private _moveTo(hu: HarvestUnit, tx: number, tz: number): void {
    // 同步 node 当前位置（可能已被上次移动改变）
    const unit = this._unitManager.units[hu.id];
    if (!unit) return;
    hu.node.position[0] = unit.x;
    hu.node.position[2] = unit.z;

    const result = this._navMap.findPathWorld(unit.x, unit.z, tx, tz);
    if (!result.found || result.path.length === 0) {
      // 路径不通：回 idle
      if (!hu.sm.isIn('idle')) {
        this._safeTransition(hu, 'idle');
      }
      return;
    }

    const waypoints: Array<[number, number]> = result.path.map(
      ([gx, gz]) => this._navMap.gridToWorld(gx, gz),
    );
    hu.agent.followPath(waypoints);

    // 确保处于 moving 状态，并发射事件
    if (!hu.sm.isIn('moving')) {
      this._safeTransition(hu, 'moving');
      this._emitStateChange(hu, 'moving');
    }
  }

  /** NavAgent onArrived 回调：根据 headingToBase 分发到资源点到达 or 基地到达。 */
  private _onArrived(hu: HarvestUnit): void {
    if (!hu.sm.isIn('moving')) return;

    if (hu.headingToBase) {
      this._onArrivedBase(hu);
    } else {
      this._onArrivedNode(hu);
    }
  }

  /** 到达资源点：进入 gathering 状态，启动采集 Timer。 */
  private _onArrivedNode(hu: HarvestUnit): void {
    if (!hu.sm.transition('gathering')) return;
    this._emitStateChange(hu, 'gathering');
    this._startGatherTimer(hu);
  }

  /** 到达基地：进入 depositing 状态，等待 DEPOSIT_LINGER 后存入。 */
  private _onArrivedBase(hu: HarvestUnit): void {
    if (!hu.sm.transition('depositing')) return;
    hu.depositElapsed = 0;
    this._emitStateChange(hu, 'depositing');
  }

  /** 启动 Timer 驱动的采集 tick。 */
  private _startGatherTimer(hu: HarvestUnit): void {
    this._stopGathering(hu);
    hu.gatherHandle = hu.timer.setInterval(() => {
      if (!hu.sm.isIn('gathering')) return;

      const node = hu.targetNode;
      if (!node || node.amount <= 0) {
        // 资源耗尽：若有存货就回基地，否则找下一个资源点
        if (this._carriedTotal(hu) > 0) {
          this._headToBase(hu);
        } else {
          const nearest = this._findNearestNode(hu);
          if (nearest) {
            this._stopGathering(hu);
            hu.targetNode    = nearest;
            hu.headingToBase = false;
            this._safeTransition(hu, 'moving');
            this._emitStateChange(hu, 'moving');
            this._moveTo(hu, nearest.x, nearest.z);
          } else {
            this._stopGathering(hu);
            this._safeTransition(hu, 'idle');
            this._emitStateChange(hu, 'idle');
          }
        }
        return;
      }

      // 本次可采集量
      const space    = BACKPACK_CAPACITY - this._carriedTotal(hu);
      const canTake  = Math.min(GATHER_RATE, node.amount, space);
      if (canTake <= 0) {
        this._headToBase(hu);
        return;
      }

      node.amount -= canTake;
      if (node.type === 'gold') hu.carriedGold += canTake;
      else                      hu.carriedWood += canTake;

      // 背包满：立即回基地
      if (this._carriedTotal(hu) >= BACKPACK_CAPACITY) {
        this._headToBase(hu);
      }
    }, GATHER_INTERVAL);
  }

  /** 停止采集 Timer。 */
  private _stopGathering(hu: HarvestUnit): void {
    if (hu.gatherHandle !== -1) {
      hu.timer.cancel(hu.gatherHandle);
      hu.gatherHandle = -1;
    }
  }

  /** 背包满或资源耗尽时前往基地。 */
  private _headToBase(hu: HarvestUnit): void {
    this._stopGathering(hu);
    hu.headingToBase = true;
    if (!hu.sm.isIn('moving')) {
      this._safeTransition(hu, 'moving');
    }
    this._emitStateChange(hu, 'moving');
    this._moveToBase(hu);
  }

  /** 导航至基地。 */
  private _moveToBase(hu: HarvestUnit): void {
    const unit = this._unitManager.units[hu.id];
    if (!unit) return;
    hu.node.position[0] = unit.x;
    hu.node.position[2] = unit.z;

    const result = this._navMap.findPathWorld(unit.x, unit.z, this._base.x, this._base.z);
    if (!result.found || result.path.length === 0) {
      // 无法到达基地：直接模拟到达（紧急存入）
      this._onArrivedBase(hu);
      return;
    }

    const waypoints: Array<[number, number]> = result.path.map(
      ([gx, gz]) => this._navMap.gridToWorld(gx, gz),
    );
    hu.agent.followPath(waypoints);
  }

  /** DEPOSIT_LINGER 结束后执行存入并决定下一步。 */
  private _finishDeposit(hu: HarvestUnit): void {
    // 存入资源
    if (hu.carriedGold > 0) {
      this._resourceState.addGold(hu.carriedGold);
      hu.carriedGold = 0;
    }
    if (hu.carriedWood > 0) {
      this._resourceState.addWood(hu.carriedWood);
      hu.carriedWood = 0;
    }

    // 决定下一个目标
    const targetNode =
      (hu.targetNode && hu.targetNode.amount > 0)
        ? hu.targetNode
        : this._findNearestNode(hu);

    if (targetNode) {
      hu.targetNode    = targetNode;
      hu.headingToBase = false;
      if (!hu.sm.transition('moving')) return;
      this._emitStateChange(hu, 'moving');
      this._moveTo(hu, targetNode.x, targetNode.z);
    } else {
      // 无资源可采：进入 idle
      hu.sm.transition('idle');
      this._emitStateChange(hu, 'idle');
    }
  }

  // ─────────────────────────────────────────────────────────
  // 私有：工具方法
  // ─────────────────────────────────────────────────────────

  private _carriedTotal(hu: HarvestUnit): number {
    return hu.carriedGold + hu.carriedWood;
  }

  /** 从 _resourceNodes 找离当前单位最近且有储量的资源点。 */
  private _findNearestNode(hu: HarvestUnit): ResourceNode | null {
    const unit = this._unitManager.units[hu.id];
    if (!unit) return null;

    let nearest: ResourceNode | null = null;
    let minDist = Infinity;

    for (const node of this._resourceNodes) {
      if (node.amount <= 0) continue;
      const dx = node.x - unit.x;
      const dz = node.z - unit.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDist) {
        minDist  = d2;
        nearest  = node;
      }
    }
    return nearest;
  }

  /** 安全转换状态机（忽略非法转换，不抛异常）。 */
  private _safeTransition(hu: HarvestUnit, to: HarvestState): void {
    hu.sm.transition(to);
  }

  /** 向全局事件总线发送单位状态变更事件。 */
  private _emitStateChange(hu: HarvestUnit, state: HarvestState): void {
    this._resourceState.events.emit('unit.state.changed', hu.id, state);
  }
}
