/**
 * Enemy NPC (v2) — Node3D + AnimationMixer + BlendTree1D + StateMachine + Health
 * 四状态 AI：patrol → chase → attack → dead
 * BlendTree1D 用 currentSpeed (0→2→5) 驱动 idle/walk/run 平滑混合
 */

import { Node3D } from '../../../src/core/node3d';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { BlendTree1D } from '../../../src/animation/blend-tree-1d';
import { type BoneData, Skeleton } from '../../../src/animation/skeleton';
import { StateMachine } from '../../../src/gameplay/state-machine';
import { Health } from '../../../src/gameplay/health';
import { NavAgent } from '../../../src/navigation/nav-agent';
import { NavGrid } from '../../../src/navigation/nav-grid';
import { findPath } from '../../../src/navigation/pathfinder';
import type { Vec3 } from '../../../src/math/vec3';

export type EnemyState = 'patrol' | 'chase' | 'attack' | 'dead';

export interface EnemyNavContext {
  grid: NavGrid;
  worldToGrid(worldX: number, worldZ: number): [number, number];
  gridToWorld(gx: number, gz: number): [number, number];
}

export interface EnemyOptions {
  aggroRange?: number;
  loseSightRange?: number;
  attackRange?: number;
  patrolSpeed?: number;
  chaseSpeed?: number;
  attackDamage?: number;
  attackInterval?: number;
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

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

export class Enemy {
  readonly node: Node3D;
  readonly health: Health;
  readonly mixer: AnimationMixer;
  readonly blendTree: BlendTree1D;

  private readonly _ai: StateMachine<EnemyState>;
  private readonly _agent: NavAgent;
  private readonly _nav: EnemyNavContext;
  private readonly _playerNode: Node3D;

  private readonly _aggroRange: number;
  private readonly _loseSightRange: number;
  private readonly _attackRange: number;
  private readonly _attackDamage: number;
  private readonly _attackInterval: number;
  private readonly _chaseSpeed: number;

  private _attackCooldown = 0;
  private _patrolTimer = 0;
  private _onAttackPlayer: ((damage: number) => void) | null = null;

  constructor(
    position: Vec3,
    nav: EnemyNavContext,
    playerNode: Node3D,
    options?: EnemyOptions,
  ) {
    this._nav        = nav;
    this._playerNode = playerNode;

    this._aggroRange     = options?.aggroRange     ?? 10;
    this._loseSightRange = options?.loseSightRange ?? 20;
    this._attackRange    = options?.attackRange    ?? 2;
    this._attackDamage   = options?.attackDamage   ?? 10;
    this._attackInterval = options?.attackInterval ?? 1.5;
    this._chaseSpeed     = options?.chaseSpeed     ?? 5;
    const patrolSpeed    = options?.patrolSpeed    ?? 2;

    this.node = new Node3D('enemy');
    this.node.position[0] = position[0];
    this.node.position[1] = position[1];
    this.node.position[2] = position[2];

    this.health = new Health(100);
    this.health.on('health.died', () => this._ai.transition('dead'));

    // 每个 Enemy 独立 AnimationMixer 实例
    const skeleton = makeDummySkeleton();
    this.mixer = new AnimationMixer(skeleton);

    // BlendTree1D：idle(speed=0) → walk(speed=2) → run(speed=5)
    const idleAction = this.mixer.clipAction(makeClip('idle'));
    const walkAction = this.mixer.clipAction(makeClip('walk'));
    const runAction  = this.mixer.clipAction(makeClip('run'));
    this.mixer.clipAction(makeClip('attack'));
    this.mixer.clipAction(makeClip('die'));

    this.blendTree = new BlendTree1D([
      { threshold: 0, action: idleAction },
      { threshold: 2, action: walkAction },
      { threshold: 5, action: runAction },
    ]);

    this._agent = new NavAgent(this.node, patrolSpeed);

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

  onAttackPlayer(cb: (damage: number) => void): void {
    this._onAttackPlayer = cb;
  }

  get state(): EnemyState { return this._ai.current; }
  get isDead(): boolean   { return this.health.isDead; }

  update(dt: number): void {
    if (this.health.isDead) return;
    this._agent.update(dt);
    // 用实际速度驱动 BlendTree1D：移动中取配置速度，静止时取 0
    const currentSpeed = this._agent.isMoving ? this._agent.speed : 0;
    this.blendTree.setParameter(currentSpeed).update(dt);
    this._ai.update(dt);
  }

  private _distToPlayer(): number {
    const dx = this._playerNode.position[0] - this.node.position[0];
    const dz = this._playerNode.position[2] - this.node.position[2];
    return Math.sqrt(dx * dx + dz * dz);
  }

  private _pathTo(worldX: number, worldZ: number): boolean {
    const [sx, sz] = this._nav.worldToGrid(this.node.position[0], this.node.position[2]);
    const [ex, ez] = this._nav.worldToGrid(worldX, worldZ);
    if (sx === ex && sz === ez) return true;
    const result = findPath(this._nav.grid, sx, sz, ex, ez, { diagonal: false });
    if (!result.found) return false;
    const cells = result.path.length > 1 ? result.path.slice(1) : result.path;
    const path: Array<[number, number]> = cells.map(([gx, gz]) => this._nav.gridToWorld(gx, gz));
    this._agent.followPath(path);
    return true;
  }

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

  private _enterPatrol(): void {
    this._agent.speed = 2;
    this._pickRandomPatrolTarget();
    this._patrolTimer = 3 + Math.random() * 3;
  }

  private _enterChase(): void {
    this._agent.speed = this._chaseSpeed;
  }

  private _enterAttack(): void {
    this._agent.stop();
    this._attackCooldown = 0;
  }

  private _enterDead(): void {
    this._agent.stop();
  }

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
