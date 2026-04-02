/**
 * Pre-written tests for Vec3 module.
 * AI must implement src/math/vec3.ts to make these pass.
 */
import { describe, it, expect } from 'vitest';
import {
  vec3,
  add,
  sub,
  scale,
  dot,
  cross,
  normalize,
  length,
  distance,
  negate,
  lerp,
  type Vec3,
} from '../../src/math/vec3';

const EPSILON = 1e-6;

function approxEqual(a: Vec3, b: Vec3) {
  expect(a[0]).toBeCloseTo(b[0], 5);
  expect(a[1]).toBeCloseTo(b[1], 5);
  expect(a[2]).toBeCloseTo(b[2], 5);
}

describe('Vec3', () => {
  it('creates a vector from components', () => {
    const v = vec3(1, 2, 3);
    expect(v[0]).toBe(1);
    expect(v[1]).toBe(2);
    expect(v[2]).toBe(3);
  });

  it('vec3() with no args creates zero vector', () => {
    const v = vec3();
    expect(v[0]).toBe(0);
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0);
  });

  it('returns Float32Array', () => {
    const v = vec3(1, 2, 3);
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(3);
  });

  describe('add', () => {
    it('adds two vectors', () => {
      const a = vec3(1, 2, 3);
      const b = vec3(4, 5, 6);
      const result = add(a, b);
      approxEqual(result, vec3(5, 7, 9));
    });

    it('does not mutate inputs', () => {
      const a = vec3(1, 2, 3);
      const b = vec3(4, 5, 6);
      add(a, b);
      approxEqual(a, vec3(1, 2, 3));
      approxEqual(b, vec3(4, 5, 6));
    });
  });

  describe('sub', () => {
    it('subtracts two vectors', () => {
      approxEqual(sub(vec3(5, 7, 9), vec3(1, 2, 3)), vec3(4, 5, 6));
    });
  });

  describe('scale', () => {
    it('scales a vector by scalar', () => {
      approxEqual(scale(vec3(1, 2, 3), 2), vec3(2, 4, 6));
    });

    it('scales by zero', () => {
      approxEqual(scale(vec3(1, 2, 3), 0), vec3(0, 0, 0));
    });

    it('scales by negative', () => {
      approxEqual(scale(vec3(1, 2, 3), -1), vec3(-1, -2, -3));
    });
  });

  describe('dot', () => {
    it('computes dot product', () => {
      expect(dot(vec3(1, 2, 3), vec3(4, 5, 6))).toBeCloseTo(32);
    });

    it('orthogonal vectors have dot product 0', () => {
      expect(dot(vec3(1, 0, 0), vec3(0, 1, 0))).toBeCloseTo(0);
    });
  });

  describe('cross', () => {
    it('computes cross product of X and Y axes', () => {
      approxEqual(cross(vec3(1, 0, 0), vec3(0, 1, 0)), vec3(0, 0, 1));
    });

    it('cross product is anti-commutative', () => {
      const a = vec3(1, 2, 3);
      const b = vec3(4, 5, 6);
      approxEqual(cross(a, b), negate(cross(b, a)));
    });

    it('cross product of parallel vectors is zero', () => {
      approxEqual(cross(vec3(1, 0, 0), vec3(2, 0, 0)), vec3(0, 0, 0));
    });
  });

  describe('length', () => {
    it('computes length of unit vector', () => {
      expect(length(vec3(1, 0, 0))).toBeCloseTo(1);
    });

    it('computes length of (3,4,0)', () => {
      expect(length(vec3(3, 4, 0))).toBeCloseTo(5);
    });

    it('zero vector has length 0', () => {
      expect(length(vec3(0, 0, 0))).toBeCloseTo(0);
    });
  });

  describe('normalize', () => {
    it('normalizes to unit length', () => {
      const n = normalize(vec3(3, 4, 0));
      expect(length(n)).toBeCloseTo(1);
      approxEqual(n, vec3(0.6, 0.8, 0));
    });

    it('normalizing a unit vector returns unit vector', () => {
      const n = normalize(vec3(0, 1, 0));
      approxEqual(n, vec3(0, 1, 0));
    });
  });

  describe('distance', () => {
    it('distance between same points is 0', () => {
      expect(distance(vec3(1, 2, 3), vec3(1, 2, 3))).toBeCloseTo(0);
    });

    it('distance between (0,0,0) and (3,4,0) is 5', () => {
      expect(distance(vec3(0, 0, 0), vec3(3, 4, 0))).toBeCloseTo(5);
    });
  });

  describe('negate', () => {
    it('negates all components', () => {
      approxEqual(negate(vec3(1, -2, 3)), vec3(-1, 2, -3));
    });
  });

  describe('lerp', () => {
    it('lerp at t=0 returns a', () => {
      approxEqual(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0), vec3(0, 0, 0));
    });

    it('lerp at t=1 returns b', () => {
      approxEqual(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 1), vec3(10, 10, 10));
    });

    it('lerp at t=0.5 returns midpoint', () => {
      approxEqual(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0.5), vec3(5, 5, 5));
    });
  });
});
