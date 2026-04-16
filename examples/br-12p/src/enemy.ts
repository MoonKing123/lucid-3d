/**
 * Enemy — 敌人 NPC 类。
 * 组合 Node3D + AnimationMixer + StateMachine<AIState> + Health。
 * 支持 patrol / chase / shoot / dead 四状态 AI。
 */

import { Node3D } from '../../../src/core/node3d';
import { AnimationMixer } from '../../../src/animation/animation-mixer';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { Skeleton, type BoneData } from '../../../src/animation/skeleton';
import { StateMachine } from '../../../src/gameplay/state-machine';
import { CollisionWorld } from '../../../src/physics/collision';
import { type Vec3, vec3, sub, length } from '../../../src/math/vec3';
import { Health } from './health';
import { type AIState } from './enemy-ai';
import { MAP_SIZE } from './map';

/**
 * 创建最小骨骼（1 根骨骼）供 AnimationMixer 使用。
 * headless 模式下不需要真实骨骼动画，只需 mixer.update() 不崩溃。
 */
function createDummySkeleton(): Skeleton {
  const bones: BoneData[] = [{ name: 'root', parentIndex: -1 }];
  const ibm = new Float32Array(16);
  ibm[0] = 1; ibm[5] = 1; ibm[10] = 1; ibm[15] = 1;
  return new Skeleton(bones, ibm);
}

/** 创建四个动画片段（空轨道，仅供混合器驱动帧计时） */
function createClips(): Record<string, AnimationClip> {
  return {
    idle:  new AnimationClip('idle',  []),
    run:   new AnimationClip('run',   []),
    shoot: new AnimationClip('shoot', []),
    die:   new AnimationClip('die',   []),
  };
}

/** 检测范围（m）：玩家进入此距离内 → chase */
const DETECT_RANGE = 5;
/** 射击范围（m）：在此距离内且有视线 → shoot */
const SHOOT_RANGE = 8;
/** 射击冷却间隔（s） */
const SHOOT_INTERVAL = 1.5;
/** 死亡动画持续后移除等待时间（s） */
const DEAD_REMOVE_DELAY = 3.0;
/** 巡逻速度（m/s） */
const PATROL_SPEED = 2;
/** 追击速度（m/s） */
const CHASE_SPEED = 4;
/** 环境碰撞层（与 map.ts 保持一致） */
const LAYER_ENVIRONMENT = 2;

export class Enemy {
  readonly node: Node3D;
  readonly health: Health;
  readonly mixer: AnimationMixer;

  private readonly _ai: StateMachine<AIState>;
  private readonly _clips: Record<string, AnimationClip>;
  private _currentAnim = 'run';

  /** 巡逻路径点列表 */
  private _waypoints: Vec3[] = [];
  private _waypointIdx = 0;

  /** 射击冷却剩余时间 */
  private _shootCooldown = 0;

  /** 死亡后计时（达到 DEAD_REMOVE_DELAY 时标记为可移除） */
  private _deadTimer = 0;

  /** 是否已被标记为可从场景中移除 */
  private _removed = false;

  /** 所在碰撞世界（用于 LOS 射线检测） */
  private readonly _world: CollisionWorld;

  /** 玩家节点引用 */
  private readonly _playerNode: Node3D;

  /**
   * 命中玩家时的回调（供 Health 系统触发；对应 M4.2 weapon.hit 广播）。
   * 参数 damage 为单次伤害量。
   */
  private readonly _onHitPlayer: ((damage: number) => void) | null;

  constructor(
    position: Vec3,
    world: CollisionWorld,
    playerNode: Node3D,
    onHitPlayer?: (damage: number) => void,
  ) {
    this._world = world;
    this._playerNode = playerNode;
    this._onHitPlayer = onHitPlayer ?? null;

    // 节点
    this.node = new Node3D('enemy');
    this.node.position[0] = position[0];
    this.node.position[1] = position[1];
    this.node.position[2] = position[2];

    // 血量
    this.health = new Health(100);
    this.health.on('health.died', () => {
      this._ai.transition('dead');
    });

    // AnimationMixer（最小 Skeleton，headless 下不渲染骨骼，只驱动时钟）
    const skeleton = createDummySkeleton();
    this.mixer = new AnimationMixer(skeleton);
    this._clips = createClips();

    // AI 状态机
    this._ai = new StateMachine<AIState>(
      {
        patrol: {
          onEnter: () => this._playAnim('run'),
          onUpdate: (dt) => this._updatePatrol(dt),
        },
        chase: {
          onEnter: () => this._playAnim('run'),
          onUpdate: (dt) => this._updateChase(dt),
        },
        shoot: {
          onEnter: () => {
            this._playAnim('shoot');
            this._shootCooldown = SHOOT_INTERVAL; // 进入状态先等一个冷却
          },
          onUpdate: (dt) => this._updateShoot(dt),
        },
        dead: {
          onEnter: () => this._playAnim('die'),
          onUpdate: (dt) => this._updateDead(dt),
        },
      },
      'patrol',
    );

    // 生成随机巡逻路径点
    this._generateWaypoints(4);
  }

  // ── 公开 getter ────────────────────────────────────────────────

  get state(): AIState { return this._ai.current; }
  get currentAnimation(): string { return this._currentAnim; }
  get isRemoved(): boolean { return this._removed; }

  // ── 每帧更新 ──────────────────────────────────────────────────

  update(dt: number): void {
    if (this._removed) return;
    this._ai.update(dt);
    this.mixer.update(dt);
  }

  /**
   * 外部施加伤害（供武器命中调用）。
   * 已死亡的敌人忽略伤害。
   */
  applyDamage(amount: number): void {
    if (this._ai.current === 'dead') return;
    this.health.takeDamage(amount);
  }

  dispose(): void {
    this._removed = true;
  }

  // ── 私有 AI 逻辑 ──────────────────────────────────────────────

  private _playAnim(name: string): void {
    this._currentAnim = name;
    // 用 play() 驱动 mixer 时钟（空 tracks，不会写骨骼）
    const clip = this._clips[name];
    if (clip) {
      this.mixer.play(clip, { loop: name !== 'die' });
    }
  }

  private _generateWaypoints(count: number): void {
    const half = MAP_SIZE / 2 - 4;
    this._waypoints = [];
    for (let i = 0; i < count; i++) {
      this._waypoints.push(vec3(
        (Math.random() * 2 - 1) * half,
        0,
        (Math.random() * 2 - 1) * half,
      ));
    }
    this._waypointIdx = 0;
  }

  private _distToPlayer(): number {
    const dx = this._playerNode.position[0] - this.node.position[0];
    const dz = this._playerNode.position[2] - this.node.position[2];
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * 视线检测：从敌人到玩家射线，检查环境层是否有遮挡。
   */
  private _hasLOS(): boolean {
    const ex = this.node.position[0];
    const ez = this.node.position[2];
    const px = this._playerNode.position[0];
    const pz = this._playerNode.position[2];

    const dx = px - ex;
    const dz = pz - ez;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.01) return true;

    const origin = vec3(ex, 1.0, ez);
    const dir    = vec3(dx / dist, 0, dz / dist);
    const hits   = this._world.raycast(origin, dir, dist - 0.2, LAYER_ENVIRONMENT);
    return hits.length === 0;
  }

  private _moveToward(target: Vec3, speed: number, dt: number): void {
    const dx = target[0] - this.node.position[0];
    const dz = target[2] - this.node.position[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.05) return;
    const step = Math.min(speed * dt, d);
    this.node.position[0] += (dx / d) * step;
    this.node.position[2] += (dz / d) * step;
  }

  private _updatePatrol(dt: number): void {
    // 玩家进入检测范围 → 切换追击
    if (this._distToPlayer() <= DETECT_RANGE) {
      this._ai.transition('chase');
      return;
    }
    // 向当前路径点前进
    if (this._waypoints.length === 0) return;
    const wp = this._waypoints[this._waypointIdx];
    this._moveToward(wp, PATROL_SPEED, dt);

    // 到达路径点 → 前进到下一个
    const dx = wp[0] - this.node.position[0];
    const dz = wp[2] - this.node.position[2];
    if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
      this._waypointIdx = (this._waypointIdx + 1) % this._waypoints.length;
    }
  }

  private _updateChase(dt: number): void {
    const dist = this._distToPlayer();
    // 进入射击范围且有视线 → shoot
    if (dist <= SHOOT_RANGE && this._hasLOS()) {
      this._ai.transition('shoot');
      return;
    }
    // 完全失去玩家 → 返回巡逻
    if (dist > DETECT_RANGE * 3) {
      this._ai.transition('patrol');
      return;
    }
    // 向玩家移动
    this._moveToward(this._playerNode.position, CHASE_SPEED, dt);
  }

  private _updateShoot(dt: number): void {
    const dist = this._distToPlayer();
    // 玩家离开射击范围或被遮挡 → 重新追击/巡逻
    if (dist > SHOOT_RANGE || !this._hasLOS()) {
      if (dist <= DETECT_RANGE * 3) {
        this._ai.transition('chase');
      } else {
        this._ai.transition('patrol');
      }
      return;
    }
    // 射击冷却
    this._shootCooldown -= dt;
    if (this._shootCooldown <= 0) {
      this._shootCooldown = SHOOT_INTERVAL;
      this._onHitPlayer?.(10);
    }
  }

  private _updateDead(dt: number): void {
    this._deadTimer += dt;
    if (this._deadTimer >= DEAD_REMOVE_DELAY) {
      this._removed = true;
    }
  }
}
