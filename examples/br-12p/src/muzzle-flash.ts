/**
 * MuzzleFlash — 枪口闪光粒子特效。
 * 封装 ParticleEmitter，每次开火时 burst 发射短时粒子。
 */

import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { vec3 } from '../../../src/math/vec3';

export class MuzzleFlash {
  readonly emitter: ParticleEmitter;

  constructor() {
    this.emitter = new ParticleEmitter({
      maxParticles: 20,
      emissionRate: 0, // 仅 burst 模式，不自动发射
      lifetime: { min: 0.6, max: 1.0 },
      speed: { min: 1, max: 3 },
      size: { min: 0.05, max: 0.15 },
      color: vec3(1.0, 0.9, 0.3),    // 黄橙色火焰
      colorEnd: vec3(1.0, 0.3, 0.0), // 橙红色消散
      spread: Math.PI / 6,            // 30° 锥角
      gravity: vec3(0, 0, 0),         // 无重力
    });
  }

  /**
   * 触发枪口闪光 burst。
   * 可在调用前更新 emitter.position 到枪口世界坐标。
   */
  trigger(): void {
    this.emitter.emit(8);
  }

  update(dt: number): void {
    this.emitter.update(dt);
  }

  /** 当前存活粒子数 */
  get activeCount(): number {
    return this.emitter.activeCount;
  }
}
