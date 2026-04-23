/**
 * Enemy NPC — 组合 Node3D + AnimationMixer + StateMachine + Health + NavAgent。
 * 四状态 AI：patrol → chase → attack → dead。
 * 导航使用 NavGrid + NavAgent + findPath。
 * 视觉状态用 emissive 颜色区分（patrol=蓝 / chase=黄 / attack=红 / dead=灰）。
 */

import { Node3D } from '../../../src/core/node3d';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { Skeleton, type BoneData } from '../../../src/animation/skeleton';
import { StateMachine } from '../../../src/gameplay/state-machine';
import { Health } from '../../../src/gameplay/health';
import { NavAgent } from '../../../src/navigation/nav-agent';
import { NavGrid } from '../../../src/navigation/nav-grid';
import { findPath } from '../../../src/navigation/pathfinder';
import type { Vec3 } from '../../../src/math/vec3';

export type EnemyState = 'patrol' | 'chase' | 'attack' | 'dead';

export interface EnemyNavContext {
  grid: NavGrid;
  /** 世界坐标转网格坐标 */
  worldToGrid(worldX: number, worldZ: number): [number, number];
  /** 网格坐标转世界坐标 */
  gridToWorld(gx: number, gz: number): [number, number];
}

export interface EnemyOptions {
  aggroRange?: number;     // 默认 10m — 进入此范围 patrol→chase
  loseSightRange?: number; // 默认 20m — 超出此范围 chase→patrol
  attackRange?: number;    // 默认 2m  — 进入此范围 chase→attack
  patrolSpeed?: number;    // 默认 3 m/s
  chaseSpeed?: number;     // 默认 5 m/s
  attackDamage?: number;   // 默认 10
  attackInterval?: number; // 默认 1.5s
}

function makeDummySkeleton(): Skeleton {
  const bones: BoneData[] = [{ name: 'root', parentIndex: -1 }];
  const ibm = new Float32Array(16);
  ibm[0] = 1; ibm[5] = 1; ibm[10] = 1; ibm[15] = 1;
  return new Skeleton(bones, ibm);
}

function makeClip(name: string): AnimationClip {
  return new AnimationClip(name, []);
}

/** 随机整数 [min, max) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

export class Enemy {
  readonly node: Node3D;
  readonly health: Health;
  readonly mixer: AnimationMixer;

  private readonly _ai: StateMachine<EnemyState>;
  private readonly _agent: NavAgent;
  private readonly _nav: EnemyNavContext;
  private readonly _playerNode: Node3D;

  // 配置常量
  private readonly _aggroRange: number;
  private readonly _loseSightRange: number;
  private readonly _attackRange: number;
  private readonly _attackDamage: number;
  private readonly _attackInterval: number;

  // 运行时状态
  private _attackCooldown = 0;
  private _patrolTimer = 0;
  private _onAttackPlayer: ((damage: number) => void) | null = null;

  constructor(
    position: Vec3,
    nav: EnemyNavContext,
    playerNode: Node3D,
    options?: EnemyOptions,
  ) {
    this._nav = nav;
    this._playerNode = playerNode;

    this._aggroRange     = options?.aggroRange     ?? 10;
    this._loseSightRange = options?.loseSightRange ?? 20;
    this._attackRange    = options?.attackRange    ?? 2;
    this._attackDamage   = options?.attackDamage   ?? 10;
    this._attackInterval = options?.attackInterval ?? 1.5;

    // 节点
    this.node = new Node3D('enemy');
    this.node.position[0] = position[0];
    this.node.position[1] = position[1];
    this.node.position[2] = position[2];

    // Health
    this.health = new Health(100);
    this.health.on('health.died', () => {
      this._ai.transition('dead');
    });

    // AnimationMixer（每个 Enemy 独立实例）
    const skeleton = makeDummySkeleton();
    this.mixer = new AnimationMixer(skeleton);
    const patrolClip  = makeClip('patrol');
    const chaseClip   = makeClip('chase');
    const attackClip  = makeClip('attack');
    const deadClip    = makeClip('die');
    this.mixer.clipAction(patrolClip).play();
    this.mixer.clipAction(chaseClip);
    this.mixer.clipAction(attackClip);
    this.mixer.clipAction(deadClip);

    // NavAgent（巡逻速度）
    this._agent = new NavAgent(this.node, options?.patrolSpeed ?? 3);

    // StateMachine
    this._ai = new StateMachine<EnemyState>({
      patrol: {
        onEnter:  () => this._enterPatrol(),
        onUpdate: (dt) => this._updatePatrol(dt),
      },
      chase: {
        onEnter:  () => this._enterChase(),
        onUpdate: (dt) => this._updateChase(dt),
      },
      attack: {
        onEnter:  () => this._enterAttack(),
        onUpdate: (dt) => this._updateAttack(dt),
      },
      dead: {
        onEnter: () => this._enterDead(),
      },
    }, 'patrol');
  }

  /** 注册攻击玩家的回调 */
  onAttackPlayer(cb: (damage: number) => void): void {
    this._onAttackPlayer = cb;
  }

  get state(): EnemyState { return this._ai.current; }
  get isDead(): boolean   { return this.health.isDead; }

  update(dt: number): void {
    if (this.health.isDead) return;
    this._agent.update(dt);
    this.mixer.update(dt);
    this._ai.update(dt);
  }

  private _distToPlayer(): number {
    const dx = this._playerNode.position[0] - this.node.position[0];
    const dz = this._playerNode.position[2] - this.node.position[2];
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** 用 A* 规划路径并驱动 NavAgent。跳过起始格中心，避免 NavAgent 先反向移动。 */
  private _pathTo(worldX: number, worldZ: number): boolean {
    const [sx, sz] = this._nav.worldToGrid(this.node.position[0], this.node.position[2]);
    const [ex, ez] = this._nav.worldToGrid(worldX, worldZ);
    if (sx === ex && sz === ez) return true;
    const result = findPath(this._nav.grid, sx, sz, ex, ez, { diagonal: false });
    if (!result.found) return false;
    // 跳过路径第 0 项（当前格中心），直接从下一格出发
    const cells = result.path.length > 1 ? result.path.slice(1) : result.path;
    const path: Array<[number, number]> = cells.map(([gx, gz]) => this._nav.gridToWorld(gx, gz));
    this._agent.followPath(path);
    return true;
  }

  /** 在当前位置附近找一个随机可行走目标并巡逻 */
  private _pickRandomPatrolTarget(): boolean {
    const [gx, gz] = this._nav.worldToGrid(this.node.position[0], this.node.position[2]);
    for (let attempt = 0; attempt < 30; attempt++) {
      const tx = gx + randInt(-8, 9);
      const tz = gz + randInt(-8, 9);
      if (!this._nav.grid.isWalkable(tx, tz)) continue;
      const result = findPath(this._nav.grid, gx, gz, tx, tz, { diagonal: false });
      if (!result.found) continue;
      const path: Array<[number, number]> = result.path.map(([x, y]) => this._nav.gridToWorld(x, y));
      this._agent.followPath(path);
      return true;
    }
    return false;
  }

  // ── 状态进入 ──

  private _enterPatrol(): void {
    this._agent.speed = 3;
    this._pickRandomPatrolTarget();
    this._patrolTimer = 3 + Math.random() * 3;
  }

  private _enterChase(): void {
    this._agent.speed = 5;
  }

  private _enterAttack(): void {
    this._agent.stop();
    this._attackCooldown = 0;
  }

  private _enterDead(): void {
    this._agent.stop();
  }

  // ── 状态更新 ──

  private _updatePatrol(dt: number): void {
    if (this._distToPlayer() < this._aggroRange) {
      this._ai.transition('chase');
      return;
    }
    this._patrolTimer -= dt;
    if (this._patrolTimer <= 0 || !this._agent.isMoving) {
      this._pickRandomPatrolTarget();
      this._patrolTimer = 3 + Math.random() * 3;
    }
  }

  private _updateChase(dt: number): void {
    const dist = this._distToPlayer();
    if (dist > this._loseSightRange) {
      this._ai.transition('patrol');
      return;
    }
    if (dist < this._attackRange) {
      this._ai.transition('attack');
      return;
    }
    // 每帧重新规划（chase 状态下追踪玩家实时位置）
    this._pathTo(this._playerNode.position[0], this._playerNode.position[2]);
  }

  private _updateAttack(dt: number): void {
    const dist = this._distToPlayer();
    if (dist > this._attackRange * 1.5) {
      this._ai.transition('chase');
      return;
    }
    this._attackCooldown -= dt;
    if (this._attackCooldown <= 0) {
      this._attackCooldown = this._attackInterval;
      this._onAttackPlayer?.(this._attackDamage);
    }
  }
}
