import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { InputManager } from '../../../src/core/input';
import { CollisionWorld, SphereCollider } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';
import { LAYER_PLAYER, LAYER_OBSTACLE, LAYER_COIN, type CoinHandle, type Track } from './track';
import { PlayerAnimator } from './animator';
import { makeStubSkeleton, makeIdleClip, makeRunClip, makeJumpClip } from './anim-fixtures';

type EventType = 'hit-obstacle' | 'collect-coin';

export interface PlayerOptions {
  collisionWorld?: CollisionWorld;
  input?: InputManager;
  startPosition?: [number, number, number];
  track?: Track;
}

export class Player {
  readonly node: Node3D;
  readonly controller: CharacterController;
  readonly animator: PlayerAnimator;
  private input: InputManager | null;
  private _listeners: Map<EventType, Array<(data?: CoinHandle) => void>> = new Map();

  constructor(opts: PlayerOptions = {}) {
    this.node = new Node3D('player');
    if (opts.startPosition) {
      this.node.position[0] = opts.startPosition[0];
      this.node.position[1] = opts.startPosition[1];
      this.node.position[2] = opts.startPosition[2];
    }
    this.controller = new CharacterController(this.node, {
      gravity: -20,
      jumpSpeed: 8,
      moveSpeed: 6,
      collisionWorld: opts.collisionWorld,
    });
    this.input = opts.input ?? null;

    // 注册玩家碰撞体到 CollisionWorld（LAYER_PLAYER）
    if (opts.collisionWorld) {
      opts.collisionWorld.addBody(this.node, {
        shape: new SphereCollider(0.4, vec3(0, 0.4, 0)),
        layer: LAYER_PLAYER,
        mask: LAYER_OBSTACLE | LAYER_COIN,
      });

      // 碰撞回调：障碍物 → hit-obstacle，金币 → collect-coin
      opts.collisionWorld.onCollisionEnter(this.node, (event) => {
        const otherLayer = (event.otherNode as any).__collisionLayer as number | undefined;
        void otherLayer; // layer 信息通过 CollisionWorld 内部过滤已处理

        // 通过节点名称前缀区分障碍物和金币
        const name = event.otherNode.name ?? '';
        if (name.startsWith('obstacle')) {
          this._emit('hit-obstacle');
        } else if (name.startsWith('coin') && opts.track) {
          const coin = opts.track.coins.find(c => c.node === event.otherNode);
          if (coin && !coin.collected) {
            this._emit('collect-coin', coin);
          }
        }
      });
    }

    // 初始化骨骼动画（使用程序化 stub 骨架）
    const skeleton = makeStubSkeleton();
    this.animator = new PlayerAnimator(skeleton, {
      idle: makeIdleClip(),
      run: makeRunClip(),
      jump: makeJumpClip(),
    });
  }

  on(event: EventType, cb: (data?: CoinHandle) => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event)!.push(cb);
  }

  private _emit(event: EventType, data?: CoinHandle): void {
    for (const cb of this._listeners.get(event) ?? []) cb(data);
  }

  /** 每帧调用：读输入 → 驱动 controller → 更新动画状态 */
  update(dt: number): void {
    if (this.input) {
      const left = this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('a');
      const right = this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('d');
      const jump = this.input.isKeyDown(' ') || this.input.isKeyDown('w');

      let dx = 0;
      if (left) dx -= 1;
      if (right) dx += 1;
      this.controller.move(vec3(dx, 0, 1)); // 自动向前跑（+Z）

      if (jump) this.controller.jump();
    }
    this.controller.update(dt);

    // 根据 controller 状态切换动画
    const vel = this.controller.velocity;
    const horizSpeed = Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2]);
    if (!this.controller.isGrounded) {
      this.animator.setState('jump');
    } else if (horizSpeed > 0.1) {
      this.animator.setState('run');
    } else {
      this.animator.setState('idle');
    }
    this.animator.update(dt);
  }

  get position() { return this.node.position; }
}
