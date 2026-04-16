/**
 * HitEffect — 命中特效粒子。
 * 在命中位置 burst 发射碎片/烟尘粒子。
 */

import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { type Vec3, vec3 } from '../../../src/math/vec3';

export class HitEffect {
  readonly emitter: ParticleEmitter;

  constructor() {
    this.emitter = new ParticleEmitter({
      maxParticles: 30,
      emissionRate: 0, // 仅 burst 模式
      lifetime: { min: 0.3, max: 0.6 },
      speed: { min: 1, max: 4 },
      size: { min: 0.03, max: 0.10 },
      color: vec3(0.8, 0.6, 0.4),    // 土棕色碎片
      colorEnd: vec3(0.5, 0.4, 0.3), // 灰棕色消散
      spread: Math.PI / 3,            // 60° 锥角
    });
  }

  /**
   * 在指定世界坐标触发命中特效 burst。
   */
  trigger(position: Vec3): void {
    this.emitter.position[0] = position[0];
    this.emitter.position[1] = position[1];
    this.emitter.position[2] = position[2];
    this.emitter.emit(12);
  }

  update(dt: number): void {
    this.emitter.update(dt);
  }

  get activeCount(): number {
    return this.emitter.activeCount;
  }
}
