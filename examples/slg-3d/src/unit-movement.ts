/**
 * UnitMovementSystem — NavAgent 绑定 + A* 寻路 + StateMachine 管理。
 *
 * 每个单位持有：
 *   - 一个内部 Node3D（位置追踪，不加入场景）
 *   - 一个 NavAgent（路径跟随）
 *   - 一个 StateMachine<UnitState>（idle/moving/arrived）
 *
 * 外部接口：
 *   commandMove(ids, tx, tz)  — 向单位群发送移动命令
 *   update(dt)                — 每帧更新
 *   getState(id)              — 读取单位状态
 *   getAgent(id)              — 读取 NavAgent
 */
import { Node3D } from '../../../src/core/node3d';
import { NavAgent } from '../../../src/navigation/nav-agent';
import { StateMachine } from '../../../src/gameplay/state-machine';
import { type UnitState, createUnitStateMachine } from './unit-states';
import { type NavMap } from './nav';
import { UnitManager } from './units';

/** arrived 状态停留时间（秒），之后自动回 idle */
const ARRIVED_LINGER = 0.5;

/** 群移动时，各单位目标点散开间距（世界单位） */
const SPREAD_STEP = 1.5;

/** 每行最多并排单位数 */
const SPREAD_COLS = 5;

export class UnitMovementSystem {
  private _nodes   = new Map<number, Node3D>();
  private _agents  = new Map<number, NavAgent>();
  private _states  = new Map<number, StateMachine<UnitState>>();
  private _timers  = new Map<number, number>(); // arrived 计时器

  constructor(
    private readonly _unitManager: UnitManager,
    private readonly _navMap: NavMap,
  ) {
    for (const unit of _unitManager.units) {
      // 轻量 Node3D，仅用于位置追踪，不加入 Scene
      const node = new Node3D(`mv-${unit.id}`);
      node.position[0] = unit.x;
      node.position[1] = unit.y;
      node.position[2] = unit.z;

      const agent = new NavAgent(node, 5);
      const sm    = createUnitStateMachine();

      agent.onArrived(() => {
        if (sm.isIn('moving')) {
          sm.transition('arrived');
          this._timers.set(unit.id, 0);
        }
      });

      this._nodes.set(unit.id, node);
      this._agents.set(unit.id, agent);
      this._states.set(unit.id, sm);
    }
  }

  /**
   * 向选中单位群发送移动命令。
   * 每个单位独立 A* 寻路，目标点按行列散开。
   *
   * @param unitIds      需要移动的单位 ID 列表
   * @param targetWorldX 目标点世界 X 坐标
   * @param targetWorldZ 目标点世界 Z 坐标
   */
  commandMove(
    unitIds: number[],
    targetWorldX: number,
    targetWorldZ: number,
  ): void {
    for (let i = 0; i < unitIds.length; i++) {
      const id   = unitIds[i];
      const unit = this._unitManager.units[id];
      if (!unit) continue;

      // 群移动散开偏移（以目标点为中心排列）
      const col    = i % SPREAD_COLS;
      const row    = Math.floor(i / SPREAD_COLS);
      const offsetX = (col - Math.floor(SPREAD_COLS / 2)) * SPREAD_STEP;
      const offsetZ = row * SPREAD_STEP;

      const tgtX = targetWorldX + offsetX;
      const tgtZ = targetWorldZ + offsetZ;

      // A* 寻路
      const result = this._navMap.findPathWorld(unit.x, unit.z, tgtX, tgtZ);
      if (!result.found || result.path.length === 0) {
        // 路径不通：保持 idle（或直接返回 idle）
        const sm = this._states.get(id);
        if (sm && sm.isIn('moving')) sm.transition('idle');
        continue;
      }

      // 将网格路径转换为世界坐标 waypoints
      const waypoints: Array<[number, number]> = result.path.map(
        ([gx, gz]) => this._navMap.gridToWorld(gx, gz),
      );

      const agent = this._agents.get(id)!;
      const sm    = this._states.get(id)!;
      const node  = this._nodes.get(id)!;

      // 重新同步 node 当前位置（可能上次移动已改变）
      node.position[0] = unit.x;
      node.position[2] = unit.z;

      agent.followPath(waypoints);

      // idle → moving（arrived → idle → moving 需要两步，此处直接处理）
      if (sm.isIn('arrived')) sm.transition('idle');
      if (sm.isIn('idle'))    sm.transition('moving');
    }
  }

  /**
   * 每帧更新：驱动 NavAgent，同步位置，处理 arrived 计时。
   * @param dt 帧间隔（秒）
   */
  update(dt: number): void {
    for (const [id, agent] of this._agents) {
      const sm   = this._states.get(id)!;
      const node = this._nodes.get(id)!;

      if (sm.isIn('moving')) {
        agent.update(dt);
        // 同步 agent 节点位置 → UnitManager（更新数据 + InstancedMesh）
        this._unitManager.updateUnitPosition(id, node.position[0], node.position[2]);
      }

      if (sm.isIn('arrived')) {
        const elapsed = (this._timers.get(id) ?? 0) + dt;
        this._timers.set(id, elapsed);
        if (elapsed >= ARRIVED_LINGER) {
          sm.transition('idle');
          this._timers.delete(id);
        }
      }
    }
  }

  /** 获取单位当前状态，若 id 无效返回 null。 */
  getState(unitId: number): UnitState | null {
    return this._states.get(unitId)?.current ?? null;
  }

  /** 获取单位的 NavAgent，若 id 无效返回 null。 */
  getAgent(unitId: number): NavAgent | null {
    return this._agents.get(unitId) ?? null;
  }

  /** 获取单位的内部 Node3D（供测试读取位置）。 */
  getNode(unitId: number): Node3D | null {
    return this._nodes.get(unitId) ?? null;
  }
}
