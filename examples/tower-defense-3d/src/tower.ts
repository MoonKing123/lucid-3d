import { Node3D } from '../../../src/core/node3d';

export type TowerType = 'arrow' | 'cannon';

export interface TowerOptions {
  type: TowerType;
  gridX: number;
  gridY: number;
  worldPosition: [number, number, number];
}

export class Tower {
  readonly node: Node3D;
  readonly type: TowerType;
  readonly gridX: number;
  readonly gridY: number;

  constructor(opts: TowerOptions) {
    this.node = new Node3D(`tower-${opts.type}`);
    this.node.position[0] = opts.worldPosition[0];
    this.node.position[1] = opts.worldPosition[1];
    this.node.position[2] = opts.worldPosition[2];
    this.type = opts.type;
    this.gridX = opts.gridX;
    this.gridY = opts.gridY;
  }
}
