import { Node3D } from '../../../src/core/node3d';
import { CharacterController } from '../../../src/gameplay/character-controller';
import { InputManager } from '../../../src/core/input';
import { CollisionWorld } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';

export interface PlayerOptions {
  collisionWorld?: CollisionWorld;
  input?: InputManager;
  startPosition?: [number, number, number];
}

export class Player {
  readonly node: Node3D;
  readonly controller: CharacterController;
  private input: InputManager | null;

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
  }

  /** 每帧调用：读输入 → 驱动 controller → 应用重力/碰撞 */
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
  }

  get position() { return this.node.position; }
}
