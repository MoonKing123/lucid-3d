import { Node3D } from '../../../src/core/node3d';
import { NavAgent } from '../../../src/navigation/nav-agent';
import type { Map } from './map';

export interface EnemyOptions {
  map: Map;
  speed?: number;
  maxHealth?: number;
}

export class Enemy {
  readonly node: Node3D;
  readonly agent: NavAgent;
  readonly maxHealth: number;
  health: number;
  reachedEnd: boolean = false;
  dead: boolean = false;

  constructor(opts: EnemyOptions) {
    this.node = new Node3D('enemy');
    this.maxHealth = opts.maxHealth ?? 100;
    this.health = this.maxHealth;

    // 起点世界坐标
    const [sx, sy, sz] = opts.map.gridToWorld(opts.map.start.x, opts.map.start.y);
    this.node.position[0] = sx;
    this.node.position[1] = sy;
    this.node.position[2] = sz;

    // 把 grid path 转成世界 [x, z] waypoints（NavAgent 只用 x/z）
    const waypoints = opts.map.path.map(
      (p): [number, number] => {
        const [wx, , wz] = opts.map.gridToWorld(p.x, p.y);
        return [wx, wz];
      }
    );

    this.agent = new NavAgent(this.node, opts.speed ?? 2);
    this.agent.onArrived(() => {
      this.reachedEnd = true;
    });
    this.agent.followPath(waypoints);
  }

  update(dt: number): void {
    if (this.dead || this.reachedEnd) return;
    this.agent.update(dt);
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }
}
