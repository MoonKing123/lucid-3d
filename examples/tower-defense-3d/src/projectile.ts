import { Node3D } from '../../../src/core/node3d';
import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { vec3 } from '../../../src/math/vec3';
import type { Enemy } from './enemy';

export class Projectile {
  readonly node: Node3D;
  readonly target: Enemy;
  readonly damage: number;
  readonly speed: number;
  done: boolean = false;

  constructor(opts: { target: Enemy; damage: number; from: [number, number, number]; speed?: number }) {
    this.node = new Node3D('projectile');
    this.node.position[0] = opts.from[0];
    this.node.position[1] = opts.from[1];
    this.node.position[2] = opts.from[2];
    this.target = opts.target;
    this.damage = opts.damage;
    this.speed = opts.speed ?? 12;
  }

  update(dt: number): void {
    if (this.done) return;
    if (this.target.dead) { this.done = true; return; }

    const dx = this.target.node.position[0] - this.node.position[0];
    const dy = this.target.node.position[1] - this.node.position[1];
    const dz = this.target.node.position[2] - this.node.position[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < 0.25) {
      this.target.takeDamage(this.damage);
      this._spawnHitEffect();
      this.done = true;
      return;
    }

    const dist = Math.sqrt(distSq);
    const move = Math.min(dist, this.speed * dt);
    this.node.position[0] += (dx / dist) * move;
    this.node.position[1] += (dy / dist) * move;
    this.node.position[2] += (dz / dist) * move;
  }

  private _spawnHitEffect(): void {
    const emitter = new ParticleEmitter({
      maxParticles: 10,
      emissionRate: 0,
      lifetime: { min: 0.2, max: 0.5 },
      speed: { min: 2, max: 5 },
      size: { min: 0.1, max: 0.3 },
      color: vec3(1, 0.5, 0),
      colorEnd: vec3(1, 0.1, 0),
      spread: Math.PI / 4,
    });
    emitter.position[0] = this.node.position[0];
    emitter.position[1] = this.node.position[1];
    emitter.position[2] = this.node.position[2];
    emitter.emit(10);
  }
}
