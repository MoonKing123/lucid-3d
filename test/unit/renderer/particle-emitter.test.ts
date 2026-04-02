/**
 * Pre-written tests for ParticleEmitter — CPU particle simulation.
 * AI must implement src/renderer/particle-emitter.ts to make these pass.
 *
 * API:
 *   interface ParticleEmitterOptions {
 *     maxParticles: number;
 *     emissionRate: number;       // particles/second
 *     lifetime: { min: number; max: number };
 *     speed: { min: number; max: number };
 *     size: { min: number; max: number };
 *     color: Vec3;
 *     colorEnd?: Vec3;
 *     gravity?: Vec3;             // default (0, -9.8, 0)
 *     spread?: number;            // cone half-angle, default 0
 *   }
 *
 *   class ParticleEmitter extends Node3D {
 *     options: ParticleEmitterOptions;
 *     readonly activeCount: number;
 *
 *     constructor(options: ParticleEmitterOptions);
 *     update(dt: number): void;
 *     emit(count: number): void;   // burst emit
 *     reset(): void;
 *     getPositions(): Float32Array;  // [x,y,z, x,y,z, ...] for activeCount
 *     getSizes(): Float32Array;      // [s, s, ...] for activeCount
 *     getColors(): Float32Array;     // [r,g,b, r,g,b, ...] for activeCount
 *     getAlphas(): Float32Array;     // [a, a, ...] for activeCount
 *   }
 *
 * Implementation notes:
 * - ParticleEmitter extends Node3D (name: 'particle-emitter')
 * - Particles are emitted from the emitter's world position
 * - Direction: local +Y (up), spread via cone angle
 * - Alpha fades from 1.0 to 0.0 over lifetime
 * - Color interpolates from color to colorEnd over lifetime (if colorEnd provided)
 * - Gravity is applied as acceleration each frame
 * - Dead particles (lifetime ≤ 0) are removed on update
 * - getPositions/getSizes/getColors/getAlphas return arrays sized to activeCount
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/particle-emitter';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { ParticleEmitter } = mod;

function defaultOpts(): mod.ParticleEmitterOptions {
  return {
    maxParticles: 100,
    emissionRate: 0,
    lifetime: { min: 1, max: 1 },
    speed: { min: 5, max: 5 },
    size: { min: 1, max: 1 },
    color: vec3(1, 0, 0),
    gravity: vec3(0, 0, 0),
    spread: 0,
  };
}

/* ───────────── Construction ───────────── */

describeImpl('ParticleEmitter — construction', () => {
  it('should start with 0 active particles', () => {
    const pe = new ParticleEmitter(defaultOpts());
    expect(pe.activeCount).toBe(0);
  });

  it('should have name "particle-emitter"', () => {
    const pe = new ParticleEmitter(defaultOpts());
    expect(pe.name).toBe('particle-emitter');
  });
});

/* ───────────── Burst emit ───────────── */

describeImpl('ParticleEmitter — burst emit', () => {
  it('emit() should add particles', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(10);
    expect(pe.activeCount).toBe(10);
  });

  it('emit() should not exceed maxParticles', () => {
    const opts = defaultOpts();
    opts.maxParticles = 5;
    const pe = new ParticleEmitter(opts);
    pe.emit(10);
    expect(pe.activeCount).toBe(5);
  });

  it('multiple emit() calls should accumulate', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(3);
    pe.emit(4);
    expect(pe.activeCount).toBe(7);
  });
});

/* ───────────── Update — movement ───────────── */

describeImpl('ParticleEmitter — update movement', () => {
  it('particles should move along their velocity over time', () => {
    const opts = defaultOpts();
    opts.speed = { min: 10, max: 10 };
    opts.spread = 0;
    const pe = new ParticleEmitter(opts);
    pe.emit(1);

    const posBefore = pe.getPositions().slice(0, 3);
    pe.update(0.1);
    const posAfter = pe.getPositions().slice(0, 3);

    expect(posAfter[1]).toBeGreaterThan(posBefore[1]);
    expect(posAfter[1] - posBefore[1]).toBeCloseTo(1.0, 0);
  });

  it('gravity should pull particles down', () => {
    const opts = defaultOpts();
    opts.speed = { min: 0, max: 0 };
    opts.gravity = vec3(0, -10, 0);
    const pe = new ParticleEmitter(opts);
    pe.emit(1);

    pe.update(1.0);
    const pos = pe.getPositions();
    expect(pos[1]).toBeCloseTo(-5, 0);
  });
});

/* ───────────── Update — lifetime ───────────── */

describeImpl('ParticleEmitter — lifetime', () => {
  it('particles should die after their lifetime', () => {
    const opts = defaultOpts();
    opts.lifetime = { min: 0.5, max: 0.5 };
    const pe = new ParticleEmitter(opts);
    pe.emit(5);
    expect(pe.activeCount).toBe(5);

    pe.update(0.6);
    expect(pe.activeCount).toBe(0);
  });

  it('particles should survive before lifetime expires', () => {
    const opts = defaultOpts();
    opts.lifetime = { min: 1, max: 1 };
    const pe = new ParticleEmitter(opts);
    pe.emit(3);

    pe.update(0.5);
    expect(pe.activeCount).toBe(3);
  });

  it('alpha should fade from 1 to 0 over lifetime', () => {
    const opts = defaultOpts();
    opts.lifetime = { min: 1, max: 1 };
    const pe = new ParticleEmitter(opts);
    pe.emit(1);

    expect(pe.getAlphas()[0]).toBeCloseTo(1, 1);

    pe.update(0.5);
    expect(pe.getAlphas()[0]).toBeCloseTo(0.5, 1);
  });
});

/* ───────────── Continuous emission ───────────── */

describeImpl('ParticleEmitter — continuous emission', () => {
  it('should auto-emit based on emissionRate', () => {
    const opts = defaultOpts();
    opts.emissionRate = 100;
    opts.lifetime = { min: 10, max: 10 };
    const pe = new ParticleEmitter(opts);

    pe.update(0.1);
    expect(pe.activeCount).toBeGreaterThanOrEqual(9);
    expect(pe.activeCount).toBeLessThanOrEqual(11);
  });

  it('should respect maxParticles during continuous emission', () => {
    const opts = defaultOpts();
    opts.maxParticles = 20;
    opts.emissionRate = 1000;
    opts.lifetime = { min: 10, max: 10 };
    const pe = new ParticleEmitter(opts);

    pe.update(1.0);
    expect(pe.activeCount).toBeLessThanOrEqual(20);
  });
});

/* ───────────── Color interpolation ───────────── */

describeImpl('ParticleEmitter — color interpolation', () => {
  it('should use start color initially', () => {
    const opts = defaultOpts();
    opts.color = vec3(1, 0, 0);
    const pe = new ParticleEmitter(opts);
    pe.emit(1);

    const colors = pe.getColors();
    expect(colors[0]).toBeCloseTo(1, 1);
    expect(colors[1]).toBeCloseTo(0, 1);
    expect(colors[2]).toBeCloseTo(0, 1);
  });

  it('should interpolate to colorEnd over lifetime', () => {
    const opts = defaultOpts();
    opts.color = vec3(1, 0, 0);
    opts.colorEnd = vec3(0, 0, 1);
    opts.lifetime = { min: 1, max: 1 };
    const pe = new ParticleEmitter(opts);
    pe.emit(1);

    pe.update(0.5);
    const colors = pe.getColors();
    expect(colors[0]).toBeCloseTo(0.5, 1);
    expect(colors[2]).toBeCloseTo(0.5, 1);
  });
});

/* ───────────── Reset ───────────── */

describeImpl('ParticleEmitter — reset', () => {
  it('reset() should clear all particles', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(50);
    expect(pe.activeCount).toBe(50);
    pe.reset();
    expect(pe.activeCount).toBe(0);
  });

  it('getPositions should return empty array after reset', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(10);
    pe.reset();
    expect(pe.getPositions().length).toBe(0);
  });
});

/* ───────────── Data output ───────────── */

describeImpl('ParticleEmitter — data output', () => {
  it('getPositions should return 3 floats per particle', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(5);
    expect(pe.getPositions().length).toBe(15);
  });

  it('getSizes should return 1 float per particle', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(5);
    expect(pe.getSizes().length).toBe(5);
  });

  it('getColors should return 3 floats per particle', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(5);
    expect(pe.getColors().length).toBe(15);
  });

  it('getAlphas should return 1 float per particle', () => {
    const pe = new ParticleEmitter(defaultOpts());
    pe.emit(5);
    expect(pe.getAlphas().length).toBe(5);
  });
});
