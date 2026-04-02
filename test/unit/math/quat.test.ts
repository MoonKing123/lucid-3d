/**
 * Pre-written tests for Quaternion math module.
 * AI must create src/math/quat.ts to make these pass.
 *
 * API:
 *   type Quat = Float32Array   // [x, y, z, w], length 4
 *
 *   quat(x?, y?, z?, w?): Quat              // defaults to identity (0,0,0,1)
 *   fromAxisAngle(axis: Vec3, angle: number): Quat
 *   fromEuler(x: number, y: number, z: number): Quat  // radians, YXZ order
 *   multiplyQuat(a: Quat, b: Quat): Quat
 *   conjugate(q: Quat): Quat                // (-x, -y, -z, w)
 *   normalizeQuat(q: Quat): Quat
 *   slerp(a: Quat, b: Quat, t: number): Quat
 *   quatToMat4(q: Quat): Mat4
 *   quatLength(q: Quat): number
 *   quatDot(a: Quat, b: Quat): number
 *
 * All functions are pure. Layout: [x, y, z, w] matching glTF convention.
 */
import { describe, it, expect } from 'vitest';
import {
  quat,
  fromAxisAngle,
  fromEuler,
  multiplyQuat,
  conjugate,
  normalizeQuat,
  slerp,
  quatToMat4,
  quatLength,
  quatDot,
} from '../../../src/math/quat';
import { vec3, normalize as normalizeVec3 } from '../../../src/math/vec3';
import { transformPoint, identity } from '../../../src/math/mat4';

/* ───────────── Construction ───────────── */

describe('quat — construction', () => {
  it('should default to identity quaternion (0,0,0,1)', () => {
    const q = quat();
    expect(q[0]).toBeCloseTo(0);
    expect(q[1]).toBeCloseTo(0);
    expect(q[2]).toBeCloseTo(0);
    expect(q[3]).toBeCloseTo(1);
  });

  it('should accept custom components', () => {
    const q = quat(1, 2, 3, 4);
    expect(q[0]).toBeCloseTo(1);
    expect(q[1]).toBeCloseTo(2);
    expect(q[2]).toBeCloseTo(3);
    expect(q[3]).toBeCloseTo(4);
  });

  it('should return a Float32Array of length 4', () => {
    const q = quat();
    expect(q).toBeInstanceOf(Float32Array);
    expect(q.length).toBe(4);
  });
});

/* ───────────── fromAxisAngle ───────────── */

describe('quat — fromAxisAngle', () => {
  it('should create identity for zero rotation', () => {
    const q = fromAxisAngle(vec3(0, 1, 0), 0);
    expect(q[0]).toBeCloseTo(0);
    expect(q[1]).toBeCloseTo(0);
    expect(q[2]).toBeCloseTo(0);
    expect(q[3]).toBeCloseTo(1);
  });

  it('should create 90° rotation around Y', () => {
    const angle = Math.PI / 2;
    const q = fromAxisAngle(vec3(0, 1, 0), angle);
    expect(q[0]).toBeCloseTo(0);
    expect(q[1]).toBeCloseTo(Math.sin(angle / 2));
    expect(q[2]).toBeCloseTo(0);
    expect(q[3]).toBeCloseTo(Math.cos(angle / 2));
  });

  it('should produce a unit quaternion', () => {
    const q = fromAxisAngle(vec3(0, 0, 1), Math.PI / 3);
    expect(quatLength(q)).toBeCloseTo(1);
  });

  it('should normalize non-unit axis', () => {
    const q = fromAxisAngle(vec3(0, 2, 0), Math.PI / 2);
    const q2 = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    expect(q[0]).toBeCloseTo(q2[0], 4);
    expect(q[1]).toBeCloseTo(q2[1], 4);
    expect(q[2]).toBeCloseTo(q2[2], 4);
    expect(q[3]).toBeCloseTo(q2[3], 4);
  });

  it('should handle 180° rotation', () => {
    const q = fromAxisAngle(vec3(1, 0, 0), Math.PI);
    expect(q[0]).toBeCloseTo(1);
    expect(q[3]).toBeCloseTo(0);
  });
});

/* ───────────── fromEuler ───────────── */

describe('quat — fromEuler', () => {
  it('should create identity for zero angles', () => {
    const q = fromEuler(0, 0, 0);
    expect(q[3]).toBeCloseTo(1);
    expect(quatLength(q)).toBeCloseTo(1);
  });

  it('should match fromAxisAngle for single-axis rotation', () => {
    const q = fromEuler(0, Math.PI / 2, 0);
    const expected = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    expect(q[0]).toBeCloseTo(expected[0], 4);
    expect(q[1]).toBeCloseTo(expected[1], 4);
    expect(q[2]).toBeCloseTo(expected[2], 4);
    expect(q[3]).toBeCloseTo(expected[3], 4);
  });

  it('should produce unit quaternion', () => {
    const q = fromEuler(0.3, 0.7, 1.2);
    expect(quatLength(q)).toBeCloseTo(1);
  });
});

/* ───────────── multiplyQuat ───────────── */

describe('quat — multiplyQuat', () => {
  it('should return identity for identity × identity', () => {
    const id = quat();
    const r = multiplyQuat(id, id);
    expect(r[0]).toBeCloseTo(0);
    expect(r[1]).toBeCloseTo(0);
    expect(r[2]).toBeCloseTo(0);
    expect(r[3]).toBeCloseTo(1);
  });

  it('should return q for identity × q', () => {
    const id = quat();
    const q = fromAxisAngle(vec3(1, 0, 0), Math.PI / 4);
    const r = multiplyQuat(id, q);
    for (let i = 0; i < 4; i++) expect(r[i]).toBeCloseTo(q[i]);
  });

  it('should compose two 90° into 180°', () => {
    const q90 = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    const q180 = multiplyQuat(q90, q90);
    const expected = fromAxisAngle(vec3(0, 1, 0), Math.PI);
    for (let i = 0; i < 4; i++) expect(q180[i]).toBeCloseTo(expected[i], 4);
  });

  it('should be non-commutative for different axes', () => {
    const qx = fromAxisAngle(vec3(1, 0, 0), Math.PI / 4);
    const qy = fromAxisAngle(vec3(0, 1, 0), Math.PI / 4);
    const ab = multiplyQuat(qx, qy);
    const ba = multiplyQuat(qy, qx);
    const diff = Math.abs(ab[0] - ba[0]) + Math.abs(ab[1] - ba[1]) + Math.abs(ab[2] - ba[2]);
    expect(diff).toBeGreaterThan(1e-5);
  });

  it('should preserve unit length', () => {
    const a = fromAxisAngle(vec3(1, 0, 0), 0.5);
    const b = fromAxisAngle(vec3(0, 0, 1), 0.8);
    expect(quatLength(multiplyQuat(a, b))).toBeCloseTo(1);
  });
});

/* ───────────── conjugate ───────────── */

describe('quat — conjugate', () => {
  it('should negate xyz, keep w', () => {
    const c = conjugate(quat(1, 2, 3, 4));
    expect(c[0]).toBeCloseTo(-1);
    expect(c[1]).toBeCloseTo(-2);
    expect(c[2]).toBeCloseTo(-3);
    expect(c[3]).toBeCloseTo(4);
  });

  it('should act as inverse for unit quat: q * conj(q) = identity', () => {
    const q = fromAxisAngle(vec3(1, 1, 0), Math.PI / 3);
    const r = multiplyQuat(q, conjugate(q));
    expect(r[0]).toBeCloseTo(0, 4);
    expect(r[1]).toBeCloseTo(0, 4);
    expect(r[2]).toBeCloseTo(0, 4);
    expect(r[3]).toBeCloseTo(1, 4);
  });
});

/* ───────────── normalizeQuat / quatLength / quatDot ───────────── */

describe('quat — normalize / length / dot', () => {
  it('should have length 1 for identity', () => {
    expect(quatLength(quat())).toBeCloseTo(1);
  });

  it('should normalize to unit length', () => {
    expect(quatLength(normalizeQuat(quat(1, 2, 3, 4)))).toBeCloseTo(1);
  });

  it('should preserve direction', () => {
    const n = normalizeQuat(quat(0, 0, 0, 2));
    expect(n[3]).toBeCloseTo(1);
  });

  it('dot of identity with itself = 1', () => {
    expect(quatDot(quat(), quat())).toBeCloseTo(1);
  });

  it('dot of orthogonal quaternions = 0', () => {
    expect(quatDot(quat(1, 0, 0, 0), quat(0, 1, 0, 0))).toBeCloseTo(0);
  });
});

/* ───────────── slerp ───────────── */

describe('quat — slerp', () => {
  it('should return a at t=0', () => {
    const a = quat();
    const b = fromAxisAngle(vec3(0, 1, 0), Math.PI);
    const r = slerp(a, b, 0);
    for (let i = 0; i < 4; i++) expect(r[i]).toBeCloseTo(a[i]);
  });

  it('should return b at t=1', () => {
    const a = quat();
    const b = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    const r = slerp(a, b, 1);
    for (let i = 0; i < 4; i++) expect(r[i]).toBeCloseTo(b[i], 4);
  });

  it('should return midpoint at t=0.5', () => {
    const a = quat();
    const b = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    const mid = slerp(a, b, 0.5);
    const expected = fromAxisAngle(vec3(0, 1, 0), Math.PI / 4);
    for (let i = 0; i < 4; i++) expect(mid[i]).toBeCloseTo(expected[i], 4);
  });

  it('should always produce unit quaternion', () => {
    const a = fromAxisAngle(vec3(1, 0, 0), 0.2);
    const b = fromAxisAngle(vec3(0, 0, 1), 1.5);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(quatLength(slerp(a, b, t))).toBeCloseTo(1);
    }
  });

  it('should handle identical quaternions', () => {
    const a = fromAxisAngle(vec3(0, 1, 0), Math.PI / 4);
    const r = slerp(a, a, 0.5);
    for (let i = 0; i < 4; i++) expect(r[i]).toBeCloseTo(a[i], 4);
  });
});

/* ───────────── quatToMat4 ───────────── */

describe('quat — quatToMat4', () => {
  it('should return identity matrix for identity quaternion', () => {
    const m = quatToMat4(quat());
    const id = identity();
    for (let i = 0; i < 16; i++) expect(m[i]).toBeCloseTo(id[i]);
  });

  it('should rotate (1,0,0) to (0,0,-1) for 90° Y rotation', () => {
    const q = fromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    const p = transformPoint(quatToMat4(q), vec3(1, 0, 0));
    expect(p[0]).toBeCloseTo(0, 4);
    expect(p[1]).toBeCloseTo(0, 4);
    expect(p[2]).toBeCloseTo(-1, 4);
  });

  it('should rotate (0,1,0) to (0,0,1) for 90° X rotation', () => {
    const q = fromAxisAngle(vec3(1, 0, 0), Math.PI / 2);
    const p = transformPoint(quatToMat4(q), vec3(0, 1, 0));
    expect(p[0]).toBeCloseTo(0, 4);
    expect(p[1]).toBeCloseTo(0, 4);
    expect(p[2]).toBeCloseTo(1, 4);
  });

  it('should rotate (1,0,0) to (0,1,0) for 90° Z rotation', () => {
    const q = fromAxisAngle(vec3(0, 0, 1), Math.PI / 2);
    const p = transformPoint(quatToMat4(q), vec3(1, 0, 0));
    expect(p[0]).toBeCloseTo(0, 4);
    expect(p[1]).toBeCloseTo(1, 4);
    expect(p[2]).toBeCloseTo(0, 4);
  });

  it('should have bottom-right 1 and zero translation', () => {
    const q = fromAxisAngle(normalizeVec3(vec3(1, 1, 1)), Math.PI / 3);
    const m = quatToMat4(q);
    expect(m[3]).toBeCloseTo(0);
    expect(m[7]).toBeCloseTo(0);
    expect(m[11]).toBeCloseTo(0);
    expect(m[12]).toBeCloseTo(0);
    expect(m[13]).toBeCloseTo(0);
    expect(m[14]).toBeCloseTo(0);
    expect(m[15]).toBeCloseTo(1);
  });
});
