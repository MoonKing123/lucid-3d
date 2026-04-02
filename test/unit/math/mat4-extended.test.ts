/**
 * Pre-written tests for Mat4 transpose and normalMatrix.
 * AI must add transpose() and normalMatrix() to src/math/mat4.ts.
 *
 * API:
 *   transpose(m: Mat4): Mat4
 *   normalMatrix(modelMatrix: Mat4): Mat4 | null
 *     — returns transpose(inverse(modelMatrix)), null if singular
 */
import { describe, it, expect } from 'vitest';
import {
  identity,
  transpose,
  normalMatrix,
  translate,
  rotateY,
  scale as mat4Scale,
  multiply,
} from '../../../src/math/mat4';
import { vec3 } from '../../../src/math/vec3';

/* ───────────── transpose ───────────── */

describe('Mat4 transpose', () => {
  it('should transpose the identity to itself', () => {
    const id = identity();
    const t = transpose(id);
    for (let i = 0; i < 16; i++) {
      expect(t[i]).toBeCloseTo(id[i]);
    }
  });

  it('should swap rows and columns', () => {
    // Translation matrix: column 3 has (1,2,3,1)
    // m[12]=1, m[13]=2, m[14]=3, m[15]=1
    const m = translate(identity(), vec3(1, 2, 3));
    const t = transpose(m);
    // After transpose, row 3 becomes column 3 → t[3]=1, t[7]=2, t[11]=3
    expect(t[3]).toBeCloseTo(1);
    expect(t[7]).toBeCloseTo(2);
    expect(t[11]).toBeCloseTo(3);
    // Original column 3 positions now hold row values
    expect(t[12]).toBeCloseTo(0);
    expect(t[13]).toBeCloseTo(0);
    expect(t[14]).toBeCloseTo(0);
  });

  it('should be its own inverse: transpose(transpose(m)) === m', () => {
    const m = rotateY(translate(identity(), vec3(1, 2, 3)), Math.PI / 4);
    const tt = transpose(transpose(m));
    for (let i = 0; i < 16; i++) {
      expect(tt[i]).toBeCloseTo(m[i], 5);
    }
  });

  it('should not mutate the input', () => {
    const m = translate(identity(), vec3(5, 6, 7));
    const copy = new Float32Array(m);
    transpose(m);
    for (let i = 0; i < 16; i++) {
      expect(m[i]).toBeCloseTo(copy[i]);
    }
  });
});

/* ───────────── normalMatrix ───────────── */

describe('Mat4 normalMatrix', () => {
  it('should return identity for identity model matrix', () => {
    const nm = normalMatrix(identity());
    expect(nm).not.toBeNull();
    expect(nm![0]).toBeCloseTo(1);
    expect(nm![5]).toBeCloseTo(1);
    expect(nm![10]).toBeCloseTo(1);
  });

  it('should compensate for non-uniform scale', () => {
    // Scale (2, 1, 1) → inverse = (0.5, 1, 1) → transpose = same
    const m = mat4Scale(identity(), vec3(2, 1, 1));
    const nm = normalMatrix(m);
    expect(nm).not.toBeNull();
    expect(nm![0]).toBeCloseTo(0.5);
    expect(nm![5]).toBeCloseTo(1);
    expect(nm![10]).toBeCloseTo(1);
  });

  it('should compensate for non-uniform scale (all axes)', () => {
    // Scale (2, 3, 4) → normalMatrix diagonal = (1/2, 1/3, 1/4)
    const m = mat4Scale(identity(), vec3(2, 3, 4));
    const nm = normalMatrix(m);
    expect(nm).not.toBeNull();
    expect(nm![0]).toBeCloseTo(0.5);
    expect(nm![5]).toBeCloseTo(1 / 3);
    expect(nm![10]).toBeCloseTo(0.25);
  });

  it('should preserve normals for pure rotation', () => {
    // For orthogonal matrices: transpose(inverse(R)) = R
    const m = rotateY(identity(), Math.PI / 4);
    const nm = normalMatrix(m);
    expect(nm).not.toBeNull();
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    // rotateY column-major: m[0]=c, m[2]=-s, m[5]=1, m[8]=s, m[10]=c
    expect(nm![0]).toBeCloseTo(cos45);
    expect(nm![2]).toBeCloseTo(-sin45);
    expect(nm![5]).toBeCloseTo(1);
    expect(nm![8]).toBeCloseTo(sin45);
    expect(nm![10]).toBeCloseTo(cos45);
  });

  it('should ignore translation', () => {
    // Pure translation → normalMatrix = identity
    const m = translate(identity(), vec3(100, 200, 300));
    const nm = normalMatrix(m);
    expect(nm).not.toBeNull();
    expect(nm![0]).toBeCloseTo(1);
    expect(nm![5]).toBeCloseTo(1);
    expect(nm![10]).toBeCloseTo(1);
    // Translation part should not bleed into upper-left 3x3
    expect(nm![12]).toBeCloseTo(0);
    expect(nm![13]).toBeCloseTo(0);
    expect(nm![14]).toBeCloseTo(0);
  });

  it('should return null for singular matrix', () => {
    // Zero scale on one axis → singular
    const m = mat4Scale(identity(), vec3(0, 1, 1));
    const nm = normalMatrix(m);
    expect(nm).toBeNull();
  });
});
