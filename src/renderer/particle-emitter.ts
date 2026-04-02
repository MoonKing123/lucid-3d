/**
 * STUB — ParticleEmitter (not yet implemented).
 * @see test/unit/renderer/particle-emitter.test.ts
 */
export const __STUB__ = true;

import { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';

export interface ParticleEmitterOptions {
  /** Maximum number of live particles. */
  maxParticles: number;
  /** Particles emitted per second (continuous emission). */
  emissionRate: number;
  /** Particle lifetime range in seconds. */
  lifetime: { min: number; max: number };
  /** Initial speed range. */
  speed: { min: number; max: number };
  /** Particle size range. */
  size: { min: number; max: number };
  /** Start color. */
  color: Vec3;
  /** End color (fades over lifetime). Optional. */
  colorEnd?: Vec3;
  /** World-space gravity vector. Default (0, -9.8, 0). */
  gravity?: Vec3;
  /** Emission cone half-angle in radians. 0 = forward only. Default 0. */
  spread?: number;
}

export class ParticleEmitter extends Node3D {
  options: ParticleEmitterOptions;

  get activeCount(): number {
    throw new Error('Not implemented');
  }

  constructor(_options: ParticleEmitterOptions) {
    super('particle-emitter');
    this.options = _options;
    throw new Error('Not implemented');
  }

  update(_dt: number): void {
    throw new Error('Not implemented');
  }

  emit(_count: number): void {
    throw new Error('Not implemented');
  }

  reset(): void {
    throw new Error('Not implemented');
  }

  getPositions(): Float32Array {
    throw new Error('Not implemented');
  }

  getSizes(): Float32Array {
    throw new Error('Not implemented');
  }

  getColors(): Float32Array {
    throw new Error('Not implemented');
  }

  getAlphas(): Float32Array {
    throw new Error('Not implemented');
  }
}
