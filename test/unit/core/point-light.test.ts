/**
 * Pre-written tests for PointLight — positional light with attenuation.
 * AI must implement src/core/point-light.ts to make these pass.
 *
 * API:
 *   class PointLight extends Light {
 *     distance: number;    // max range; 0 = unlimited (default 0)
 *     decay: number;       // attenuation exponent (default 2, physically correct)
 *
 *     constructor(opts?: {
 *       color?: Vec3;      // default (1,1,1)
 *       intensity?: number; // default 1.0
 *       distance?: number;  // default 0 (unlimited)
 *       decay?: number;     // default 2
 *     });
 *
 *     getAttenuationAt(target: Vec3): number;
 *     // Returns intensity factor at target position.
 *     // Formula (Three.js compatible):
 *     //   if distance == 0: 1 / max(d^decay, 0.01)  (no cutoff)
 *     //   else: max((1 - d/distance)^decay, 0)        (cutoff at distance)
 *     // where d = Euclidean distance from light.position to target
 *   }
 *
 * Implementation notes:
 * - Extends Light (from src/core/light.ts)
 * - Uses this.position (from Node3D) as the light's world position
 * - distance=0 → infinite range, never reaches zero
 * - decay=2 → physically correct inverse-square falloff
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/point-light';
import { vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';
import { Light } from '../../../src/core/light';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { PointLight } = mod;

/* ───────────── Construction ───────────── */

describeImpl('PointLight — construction', () => {
  it('should extend Light', () => {
    const pl = new PointLight();
    expect(pl).toBeInstanceOf(Light);
  });

  it('should extend Node3D', () => {
    const pl = new PointLight();
    expect(pl).toBeInstanceOf(Node3D);
  });

  it('should default color to white (1,1,1)', () => {
    const pl = new PointLight();
    expect(pl.color[0]).toBeCloseTo(1);
    expect(pl.color[1]).toBeCloseTo(1);
    expect(pl.color[2]).toBeCloseTo(1);
  });

  it('should default intensity to 1.0', () => {
    const pl = new PointLight();
    expect(pl.intensity).toBeCloseTo(1.0);
  });

  it('should default distance to 0 (unlimited)', () => {
    const pl = new PointLight();
    expect(pl.distance).toBe(0);
  });

  it('should default decay to 2', () => {
    const pl = new PointLight();
    expect(pl.decay).toBe(2);
  });

  it('should accept custom parameters', () => {
    const pl = new PointLight({
      color: vec3(1, 0, 0),
      intensity: 2.5,
      distance: 50,
      decay: 1,
    });
    expect(pl.color[0]).toBeCloseTo(1);
    expect(pl.color[1]).toBeCloseTo(0);
    expect(pl.intensity).toBeCloseTo(2.5);
    expect(pl.distance).toBe(50);
    expect(pl.decay).toBe(1);
  });
});

/* ───────────── Scene graph ───────────── */

describeImpl('PointLight — scene graph', () => {
  it('should be addable to scene', () => {
    const scene = new Node3D('scene');
    const pl = new PointLight();
    scene.addChild(pl);
    expect(pl.parent).toBe(scene);
  });

  it('should be positionable', () => {
    const pl = new PointLight();
    pl.position = vec3(5, 10, -3);
    expect(pl.position[0]).toBeCloseTo(5);
    expect(pl.position[1]).toBeCloseTo(10);
    expect(pl.position[2]).toBeCloseTo(-3);
  });
});

/* ───────────── Attenuation (unlimited range) ───────────── */

describeImpl('PointLight — attenuation (unlimited range)', () => {
  it('should return high factor very near the light', () => {
    const pl = new PointLight({ distance: 0, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const factor = pl.getAttenuationAt(vec3(0, 0, 0.01));
    expect(factor).toBeGreaterThan(1);
  });

  it('should decrease with distance', () => {
    const pl = new PointLight({ distance: 0, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const near = pl.getAttenuationAt(vec3(1, 0, 0));
    const far = pl.getAttenuationAt(vec3(10, 0, 0));
    expect(near).toBeGreaterThan(far);
  });

  it('should never reach zero', () => {
    const pl = new PointLight({ distance: 0, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const factor = pl.getAttenuationAt(vec3(1000, 0, 0));
    expect(factor).toBeGreaterThan(0);
  });
});

/* ───────────── Attenuation (finite range) ───────────── */

describeImpl('PointLight — attenuation (finite range)', () => {
  it('should be 0 at exactly the distance', () => {
    const pl = new PointLight({ distance: 10, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const factor = pl.getAttenuationAt(vec3(10, 0, 0));
    expect(factor).toBeCloseTo(0);
  });

  it('should be 0 beyond the distance', () => {
    const pl = new PointLight({ distance: 10, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const factor = pl.getAttenuationAt(vec3(15, 0, 0));
    expect(factor).toBe(0);
  });

  it('should be close to 1 very near the light', () => {
    const pl = new PointLight({ distance: 100, decay: 2 });
    pl.position = vec3(0, 0, 0);
    const factor = pl.getAttenuationAt(vec3(1, 0, 0));
    expect(factor).toBeGreaterThan(0.9);
  });

  it('decay=1 should produce linear falloff', () => {
    const pl = new PointLight({ distance: 10, decay: 1 });
    pl.position = vec3(0, 0, 0);
    const half = pl.getAttenuationAt(vec3(5, 0, 0));
    expect(half).toBeCloseTo(0.5, 1);
  });

  it('decay=2 should be steeper than decay=1', () => {
    const pl1 = new PointLight({ distance: 10, decay: 1 });
    pl1.position = vec3(0, 0, 0);
    const pl2 = new PointLight({ distance: 10, decay: 2 });
    pl2.position = vec3(0, 0, 0);

    const target = vec3(5, 0, 0);
    expect(pl2.getAttenuationAt(target)).toBeLessThan(pl1.getAttenuationAt(target));
  });
});

/* ───────────── 3D Euclidean distance ───────────── */

describeImpl('PointLight — 3D distance', () => {
  it('should use 3D Euclidean distance', () => {
    const pl = new PointLight({ distance: 20, decay: 2 });
    pl.position = vec3(3, 4, 0);
    // d = sqrt(9+16) = 5, d/D = 0.25, factor = (1 - 0.25)^2 = 0.5625
    const factor = pl.getAttenuationAt(vec3(0, 0, 0));
    expect(factor).toBeCloseTo(0.5625, 2);
  });
});
