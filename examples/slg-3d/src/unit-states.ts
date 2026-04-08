/**
 * UnitState — 单位状态机定义。
 *
 * 状态：
 *   idle    → 静止待命
 *   moving  → 正在沿路径移动
 *   arrived → 刚到达目标点（短暂过渡态，0.5 秒后回 idle）
 *
 * 转换规则：
 *   idle    → moving   （收到移动命令）
 *   moving  → arrived  （NavAgent 抵达终点）
 *   moving  → idle     （命令取消 / 路径不通）
 *   arrived → idle     （停留结束）
 */
import { StateMachine } from '../../../src/gameplay/state-machine';

export type UnitState = 'idle' | 'moving' | 'arrived';

/**
 * 创建一个新的单位状态机，初始状态为 `idle`。
 */
export function createUnitStateMachine(): StateMachine<UnitState> {
  const sm = new StateMachine<UnitState>(
    {
      idle:    {},
      moving:  {},
      arrived: {},
    },
    'idle',
  );

  sm.addTransition('idle',    'moving');
  sm.addTransition('moving',  'arrived');
  sm.addTransition('moving',  'idle');
  sm.addTransition('arrived', 'idle');

  return sm;
}
