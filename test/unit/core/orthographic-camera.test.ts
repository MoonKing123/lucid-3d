/**
 * Pre-written tests for OrthographicCamera and Mat4.ortho.
 * AI must:
 *   1. Add ortho() to src/math/mat4.ts
 *   2. Add OrthographicCamera to src/core/camera.ts
 *
 * API — ortho(left, right, bottom, top, near, far): Mat4
 *
 * API — OrthographicCamera extends Node3D:
 *   left, right, bottom, top, near (default 0.1), far (default 100)
 *   projectionMatrix, viewMatrix, viewProjectionMatrix
 *   lookAt(target: Vec3): void
 */
import { describe, it, expect } from 'vitest';
import { ortho, transformPoint } from '../../../src/math/mat4';
import { OrthographicCamera } from '../../../src/core/camera';
import { vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';

/* ═══════════════ Mat4.ortho ═══════════════ */

describe('Mat4 — ortho', () => {
  it('should return Float32Array(16)', () => {
    const m = ortho(-1, 1, -1, 1, 0.1, 100);
    expect(m).toBeInstanceOf(Float32Array);
    expect(m.length).toBe(16);
  });

  it('should map left→-1, right→+1', () => {
    const m = ortho(-2, 2, -1, 1, 0.1, 10);
    expect(transformPoint(m, vec3(-2, 0, -5))[0]).toBeCloseTo(-1);
    expect(transformPoint(m, vec3(2, 0, -5))[0]).toBeCloseTo(1);
  });

  it('should map bottom→-1, top→+1', () => {
    const m = ortho(-1, 1, -3, 3, 0.1, 10);
    expect(transformPoint(m, vec3(0, -3, -5))[1]).toBeCloseTo(-1);
    expect(transformPoint(m, vec3(0, 3, -5))[1]).toBeCloseTo(1);
  });

  it('should map near→-1, far→+1 in Z', () => {
    const m = ortho(-1, 1, -1, 1, 1, 100);
    expect(transformPoint(m, vec3(0, 0, -1))[2]).toBeCloseTo(-1);
    expect(transformPoint(m, vec3(0, 0, -100))[2]).toBeCloseTo(1);
  });

  it('should produce parallel projection (no foreshortening)', () => {
    const m = ortho(-1, 1, -1, 1, 0.1, 100);
    const a = transformPoint(m, vec3(0.5, 0.5, -1));
    const b = transformPoint(m, vec3(0.5, 0.5, -50));
    expect(a[0]).toBeCloseTo(b[0]);
    expect(a[1]).toBeCloseTo(b[1]);
  });
});

/* ═══════════════ OrthographicCamera ═══════════════ */

describe('OrthographicCamera — construction', () => {
  it('should extend Node3D', () => {
    expect(new OrthographicCamera(-1, 1, -1, 1)).toBeInstanceOf(Node3D);
  });

  it('should store parameters', () => {
    const c = new OrthographicCamera(-5, 5, -3, 3, 0.5, 200);
    expect(c.left).toBe(-5);
    expect(c.right).toBe(5);
    expect(c.bottom).toBe(-3);
    expect(c.top).toBe(3);
    expect(c.near).toBe(0.5);
    expect(c.far).toBe(200);
  });

  it('should default near=0.1, far=100', () => {
    const c = new OrthographicCamera(-1, 1, -1, 1);
    expect(c.near).toBeCloseTo(0.1);
    expect(c.far).toBe(100);
  });
});

describe('OrthographicCamera — projectionMatrix', () => {
  it('should match ortho()', () => {
    const c = new OrthographicCamera(-1, 1, -1, 1, 0.1, 100);
    const expected = ortho(-1, 1, -1, 1, 0.1, 100);
    const m = c.projectionMatrix;
    for (let i = 0; i < 16; i++) expect(m[i]).toBeCloseTo(expected[i]);
  });

  it('should reflect updated params', () => {
    const c = new OrthographicCamera(-1, 1, -1, 1, 0.1, 100);
    const m1 = c.projectionMatrix[0];
    c.left = -5; c.right = 5;
    expect(c.projectionMatrix[0]).not.toBeCloseTo(m1);
  });
});

describe('OrthographicCamera — viewMatrix', () => {
  it('should produce view matrix', () => {
    const c = new OrthographicCamera(-1, 1, -1, 1);
    c.position = vec3(0, 5, 0);
    c.lookAt(vec3(0, 0, 0));
    expect(c.viewMatrix.length).toBe(16);
  });

  it('should change when camera moves', () => {
    const c = new OrthographicCamera(-1, 1, -1, 1);
    c.position = vec3(0, 0, 5);
    c.lookAt(vec3(0, 0, 0));
    const m1 = new Float32Array(c.viewMatrix);
    c.position = vec3(0, 0, 10);
    let diff = false;
    for (let i = 0; i < 16; i++) if (Math.abs(m1[i] - c.viewMatrix[i]) > 0.001) { diff = true; break; }
    expect(diff).toBe(true);
  });
});

describe('OrthographicCamera — viewProjectionMatrix', () => {
  it('should map origin within NDC', () => {
    const c = new OrthographicCamera(-5, 5, -5, 5, 1, 100);
    c.position = vec3(0, 0, 10);
    c.lookAt(vec3(0, 0, 0));
    const p = transformPoint(c.viewProjectionMatrix, vec3(0, 0, 0));
    expect(Math.abs(p[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(p[1])).toBeLessThanOrEqual(1);
  });

  it('should produce parallel projection', () => {
    const c = new OrthographicCamera(-10, 10, -10, 10, 1, 100);
    c.position = vec3(0, 0, 50);
    c.lookAt(vec3(0, 0, 0));
    const vp = c.viewProjectionMatrix;
    const a = transformPoint(vp, vec3(3, 3, -5));
    const b = transformPoint(vp, vec3(3, 3, -30));
    expect(a[0]).toBeCloseTo(b[0], 2);
    expect(a[1]).toBeCloseTo(b[1], 2);
  });
});
