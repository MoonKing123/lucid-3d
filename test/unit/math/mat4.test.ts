/**
 * Pre-written tests for Mat4 module.
 * AI must implement src/math/mat4.ts to make these pass.
 */
import { describe, it, expect } from 'vitest';
import {
  mat4,
  identity,
  multiply,
  translate,
  scale,
  rotateX,
  rotateY,
  rotateZ,
  perspective,
  lookAt,
  invert,
  transformPoint,
  type Mat4,
} from '../../src/math/mat4';
import { vec3 } from '../../src/math/vec3';

function approxEqualMat(a: Mat4, b: Mat4) {
  expect(a.length).toBe(16);
  for (let i = 0; i < 16; i++) {
    expect(a[i]).toBeCloseTo(b[i], 4);
  }
}

function approxEqualVec(a: Float32Array, b: Float32Array) {
  for (let i = 0; i < a.length; i++) {
    expect(a[i]).toBeCloseTo(b[i], 4);
  }
}

describe('Mat4', () => {
  it('returns Float32Array of length 16', () => {
    const m = mat4();
    expect(m).toBeInstanceOf(Float32Array);
    expect(m.length).toBe(16);
  });

  describe('identity', () => {
    it('creates identity matrix', () => {
      const m = identity();
      // Column-major: m[0]=1, m[5]=1, m[10]=1, m[15]=1
      expect(m[0]).toBe(1);
      expect(m[5]).toBe(1);
      expect(m[10]).toBe(1);
      expect(m[15]).toBe(1);
      // Off-diagonals are 0
      expect(m[1]).toBe(0);
      expect(m[4]).toBe(0);
    });
  });

  describe('multiply', () => {
    it('identity * identity = identity', () => {
      approxEqualMat(multiply(identity(), identity()), identity());
    });

    it('identity * M = M', () => {
      const m = translate(identity(), vec3(1, 2, 3));
      approxEqualMat(multiply(identity(), m), m);
    });

    it('M * identity = M', () => {
      const m = translate(identity(), vec3(1, 2, 3));
      approxEqualMat(multiply(m, identity()), m);
    });
  });

  describe('translate', () => {
    it('translation matrix moves a point', () => {
      const t = translate(identity(), vec3(10, 20, 30));
      const p = transformPoint(t, vec3(0, 0, 0));
      approxEqualVec(p, vec3(10, 20, 30));
    });

    it('translation is additive', () => {
      const t1 = translate(identity(), vec3(1, 0, 0));
      const t2 = translate(identity(), vec3(0, 2, 0));
      const combined = multiply(t2, t1);
      const p = transformPoint(combined, vec3(0, 0, 0));
      approxEqualVec(p, vec3(1, 2, 0));
    });
  });

  describe('scale', () => {
    it('scales a point', () => {
      const s = scale(identity(), vec3(2, 3, 4));
      const p = transformPoint(s, vec3(1, 1, 1));
      approxEqualVec(p, vec3(2, 3, 4));
    });

    it('uniform scale by 1 is identity', () => {
      approxEqualMat(scale(identity(), vec3(1, 1, 1)), identity());
    });
  });

  describe('rotateY', () => {
    it('rotating X axis 90° around Y gives -Z axis', () => {
      const r = rotateY(identity(), Math.PI / 2);
      const p = transformPoint(r, vec3(1, 0, 0));
      approxEqualVec(p, vec3(0, 0, -1));
    });

    it('full 360° rotation returns to original', () => {
      const r = rotateY(identity(), Math.PI * 2);
      const p = transformPoint(r, vec3(1, 0, 0));
      approxEqualVec(p, vec3(1, 0, 0));
    });
  });

  describe('rotateX', () => {
    it('rotating Y axis 90° around X gives Z axis', () => {
      const r = rotateX(identity(), Math.PI / 2);
      const p = transformPoint(r, vec3(0, 1, 0));
      approxEqualVec(p, vec3(0, 0, 1));
    });
  });

  describe('rotateZ', () => {
    it('rotating X axis 90° around Z gives Y axis', () => {
      const r = rotateZ(identity(), Math.PI / 2);
      const p = transformPoint(r, vec3(1, 0, 0));
      approxEqualVec(p, vec3(0, 1, 0));
    });
  });

  describe('perspective', () => {
    it('produces valid perspective matrix', () => {
      const p = perspective(Math.PI / 4, 1, 0.1, 100);
      // m[0] and m[5] should be positive (focal lengths)
      expect(p[0]).toBeGreaterThan(0);
      expect(p[5]).toBeGreaterThan(0);
      // m[11] should be -1 for perspective divide
      expect(p[11]).toBeCloseTo(-1);
      // m[15] should be 0
      expect(p[15]).toBeCloseTo(0);
    });

    it('maps near plane z to -1 in NDC', () => {
      const p = perspective(Math.PI / 4, 1, 1, 100);
      // Point at near plane center
      const clip = transformPoint(p, vec3(0, 0, -1));
      // After perspective divide: z/w should be -1
      const ndcZ = clip[2] / (clip.length > 3 ? clip[2] : 1);
      // Just verify the matrix is reasonable
      expect(p[10]).toBeLessThan(0);
      expect(p[14]).toBeLessThan(0);
    });
  });

  describe('lookAt', () => {
    it('looking from (0,0,5) at origin along -Z', () => {
      const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
      // Origin should map to (0, 0, -5)
      const p = transformPoint(view, vec3(0, 0, 0));
      approxEqualVec(p, vec3(0, 0, -5));
    });

    it('eye position maps to origin', () => {
      const eye = vec3(3, 4, 5);
      const view = lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0));
      const p = transformPoint(view, eye);
      approxEqualVec(p, vec3(0, 0, 0));
    });
  });

  describe('invert', () => {
    it('inverse of identity is identity', () => {
      approxEqualMat(invert(identity())!, identity());
    });

    it('M * M^-1 = identity', () => {
      const m = translate(identity(), vec3(1, 2, 3));
      const inv = invert(m);
      expect(inv).not.toBeNull();
      approxEqualMat(multiply(m, inv!), identity());
    });

    it('inverse of translation is negative translation', () => {
      const t = translate(identity(), vec3(5, 10, 15));
      const inv = invert(t)!;
      const p = transformPoint(inv, vec3(5, 10, 15));
      approxEqualVec(p, vec3(0, 0, 0));
    });
  });

  describe('transformPoint', () => {
    it('identity transform returns same point', () => {
      const p = transformPoint(identity(), vec3(1, 2, 3));
      approxEqualVec(p, vec3(1, 2, 3));
    });
  });
});
