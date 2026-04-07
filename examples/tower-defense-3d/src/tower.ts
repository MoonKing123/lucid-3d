import { Node3D } from '../../../src/core/node3d';
import { StateMachine } from '../../../src/gameplay/state-machine';
import type { Enemy } from './enemy';

export type TowerType = 'arrow' | 'cannon';

export interface TowerOptions {
  type: TowerType;
  gridX: number;
  gridY: number;
  worldPosition: [number, number, number];
}

export interface TowerConfig {
  range: number;
  damage: number;
  cooldown: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow:  { range: 4, damage: 15, cooldown: 0.6 },
  cannon: { range: 3, damage: 40, cooldown: 1.5 },
};

type TowerState = 'idle' | 'targeting' | 'attacking';

export class Tower {
  readonly node: Node3D;
  readonly type: TowerType;
  readonly gridX: number;
  readonly gridY: number;
  readonly config: TowerConfig;
  readonly fsm: StateMachine<TowerState>;
  cooldownLeft: number = 0;
  target: Enemy | null = null;

  constructor(opts: TowerOptions) {
    this.node = new Node3D(`tower-${opts.type}`);
    this.node.position[0] = opts.worldPosition[0];
    this.node.position[1] = opts.worldPosition[1];
    this.node.position[2] = opts.worldPosition[2];
    this.type = opts.type;
    this.gridX = opts.gridX;
    this.gridY = opts.gridY;
    this.config = TOWER_CONFIGS[opts.type];

    this.fsm = new StateMachine<TowerState>(
      { idle: {}, targeting: {}, attacking: {} },
      'idle',
    );
    this.fsm.addTransition('idle', 'targeting');
    this.fsm.addTransition('targeting', 'idle');
    this.fsm.addTransition('targeting', 'attacking');
    this.fsm.addTransition('attacking', 'targeting');
    this.fsm.addTransition('attacking', 'idle');
  }
}
