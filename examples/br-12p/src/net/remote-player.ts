/**
 * remote-player.ts — 远程玩家实例。
 * 由网络事件驱动位置/动画，不运行本地 AI 逻辑。
 * 使用简单线性插值平滑位置抖动。
 */

import { Node3D } from '../../../../src/core/node3d';
import { AnimationMixer } from '../../../../src/animation/animation-mixer';
import { AnimationClip } from '../../../../src/animation/animation-clip';
import { Skeleton, type BoneData } from '../../../../src/animation/skeleton';
import { Health } from '../health';
import { MAP_SIZE } from '../map';

/** 复活延迟（秒） */
const RESPAWN_DELAY = 3.0;
/** 位置插值速度（lerp 因子 per second） */
const LERP_SPEED = 10.0;

function createDummySkeleton(): Skeleton {
  const bones: BoneData[] = [{ name: 'root', parentIndex: -1 }];
  const ibm = new Float32Array(16);
  ibm[0] = 1; ibm[5] = 1; ibm[10] = 1; ibm[15] = 1;
  return new Skeleton(bones, ibm);
}

function createClips(): Record<string, AnimationClip> {
  return {
    idle:  new AnimationClip('idle',  []),
    run:   new AnimationClip('run',   []),
    shoot: new AnimationClip('shoot', []),
    die:   new AnimationClip('die',   []),
  };
}

export type RemotePlayerState = 'alive' | 'dead';

export class RemotePlayer {
  readonly id: string;
  readonly name: string;
  readonly node: Node3D;
  readonly health: Health;
  readonly mixer: AnimationMixer;

  private readonly _clips: Record<string, AnimationClip>;

  /** 目标位置（网络接收） */
  private _targetX = 0;
  private _targetZ = 0;

  /** 当前渲染旋转 */
  rotation = 0;

  private _state: RemotePlayerState = 'alive';
  private _deadTimer = 0;
  private _currentAnim = 'idle';

  /** 复活回调（由 StateSync 注册，完成复活后重置状态） */
  onRespawnNeeded?: (id: string) => void;

  constructor(id: string, name: string, position: { x: number; y: number; z: number }) {
    this.id = id;
    this.name = name;

    this.node = new Node3D(`remote-${id}`);
    this.node.position[0] = position.x;
    this.node.position[1] = position.y;
    this.node.position[2] = position.z;

    this._targetX = position.x;
    this._targetZ = position.z;

    this.health = new Health(100);
    this.health.on('health.died', () => {
      this._state = 'dead';
      this._deadTimer = 0;
      this._playAnim('die');
    });

    const skeleton = createDummySkeleton();
    this.mixer = new AnimationMixer(skeleton);
    this._clips = createClips();
    this._playAnim('idle');
  }

  get state(): RemotePlayerState { return this._state; }
  get isDead(): boolean { return this._state === 'dead'; }

  /** 网络快照更新：设置目标位置（插值平滑） */
  applyState(position: { x: number; y: number; z: number }, rotation: number, health: number): void {
    if (this._state === 'dead') return;
    this._targetX = position.x;
    this._targetZ = position.z;
    this.rotation = rotation;

    // 直接更新血量（服务器权威）
    const delta = health - this.health.current;
    if (delta < 0) {
      this.health.takeDamage(-delta);
    }

    // 有移动则播 run 动画
    const dx = this._targetX - this.node.position[0];
    const dz = this._targetZ - this.node.position[2];
    const moving = Math.sqrt(dx * dx + dz * dz) > 0.05;
    if (moving && this._currentAnim !== 'run') {
      this._playAnim('run');
    } else if (!moving && this._currentAnim === 'run') {
      this._playAnim('idle');
    }
  }

  /** 施加伤害（命中事件触发） */
  applyDamage(amount: number): void {
    if (this._state === 'dead') return;
    this.health.takeDamage(amount);
  }

  /** 复活到指定位置 */
  respawn(position: { x: number; y: number; z: number }): void {
    this._state = 'alive';
    this._deadTimer = 0;
    this.node.position[0] = position.x;
    this.node.position[1] = position.y;
    this.node.position[2] = position.z;
    this._targetX = position.x;
    this._targetZ = position.z;
    // 重置血量：通过创建新 Health 对象代替（Health 无 reset API）
    // 这里通过多次 takeDamage 反向模式：直接更新内部 _current
    // 由于 Health 无 reset，我们需要记录一个复活标志并忽略血量
    (this.health as any)._current = 100;
    this._playAnim('idle');
  }

  /** 每帧更新：位置插值 + 死亡计时 + 动画 */
  update(dt: number): void {
    if (this._state === 'dead') {
      this._deadTimer += dt;
      if (this._deadTimer >= RESPAWN_DELAY) {
        this.onRespawnNeeded?.(this.id);
      }
    } else {
      // 插值平滑
      const alpha = Math.min(1, LERP_SPEED * dt);
      this.node.position[0] += (this._targetX - this.node.position[0]) * alpha;
      this.node.position[2] += (this._targetZ - this.node.position[2]) * alpha;
    }
    this.mixer.update(dt);
  }

  private _playAnim(name: string): void {
    this._currentAnim = name;
    const clip = this._clips[name];
    if (clip) {
      this.mixer.play(clip, { loop: name !== 'die' });
    }
  }

  /** 生成随机复活位置 */
  static randomSpawnPosition(): { x: number; y: number; z: number } {
    const half = MAP_SIZE / 2 - 5;
    return {
      x: (Math.random() * 2 - 1) * half,
      y: 0,
      z: (Math.random() * 2 - 1) * half,
    };
  }
}
