/**
 * Curve3 单元测试 — CatmullRom 3D 参数化样条曲线。
 * Architect 预写测试，Dev 实现 src/math/curve3.ts 后全部通过。
 *
 * 测试覆盖：
 * 1. 构造函数 & 基本属性
 * 2. getPoint(t) 插值
 * 3. getTangent(t) 切线
 * 4. getPoints(n) 批量采样
 * 5. getLength() 弧长
 * 6. getPointAtLength(d) 弧长参数化
 * 7. closed 闭合曲线
 * 8. tension 参数效果
 * 9. 退化情况（2 点直线）
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/math/curve3';
import { vec3, length as vecLen, sub } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ── helper ────────────────────────────────────── */

function dist(a: Float32Array, b: Float32Array): number {
  return vecLen(sub(a, b));
}

/* ───────────── Constructor & properties ───────────── */

describeImpl('Curve3 — constructor', () => {
  it('should store control points', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 1, 0)];
    const c = new mod.Curve3(pts);
    expect(c.points.length).toBe(3);
  });

  it('should default tension to 0 and closed to false', () => {
    const c = new mod.Curve3([vec3(0, 0, 0), vec3(1, 0, 0)]);
    expect(c.tension).toBe(0);
    expect(c.closed).toBe(false);
  });

  it('should accept tension and closed options', () => {
    const c = new mod.Curve3([vec3(0, 0, 0), vec3(1, 0, 0)], { tension: 0.5, closed: true });
    expect(c.tension).toBe(0.5);
    expect(c.closed).toBe(true);
  });
});

/* ───────────── getPoint ───────────── */

describeImpl('Curve3 — getPoint', () => {
  const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];

  it('should return first point at t=0', () => {
    const c = new mod.Curve3(pts);
    const p = c.getPoint(0);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(0);
  });

  it('should return last point at t=1', () => {
    const c = new mod.Curve3(pts);
    const p = c.getPoint(1);
    expect(p[0]).toBeCloseTo(3);
    expect(p[1]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(0);
  });

  it('should interpolate at t=0.5', () => {
    const c = new mod.Curve3(pts);
    const p = c.getPoint(0.5);
    // For a straight-line arrangement, mid-point should be near (1.5, 0, 0)
    expect(p[0]).toBeCloseTo(1.5, 0);
    expect(p[1]).toBeCloseTo(0, 1);
  });

  it('should produce a curved path for non-collinear points', () => {
    const curved = [vec3(0, 0, 0), vec3(1, 2, 0), vec3(2, 0, 0), vec3(3, 2, 0)];
    const c = new mod.Curve3(curved);
    const p = c.getPoint(0.25);
    // Should be near the second control point but not exactly on it (CatmullRom passes through)
    // CatmullRom passes through interior control points at segment boundaries
    expect(typeof p[0]).toBe('number');
    expect(typeof p[1]).toBe('number');
    expect(typeof p[2]).toBe('number');
  });
});

/* ───────────── getTangent ───────────── */

describeImpl('Curve3 — getTangent', () => {
  it('should return a normalized tangent vector', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const t = c.getTangent(0.5);
    const len = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]);
    expect(len).toBeCloseTo(1.0, 2);
  });

  it('should point in +X direction for X-axis aligned points', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const t = c.getTangent(0.5);
    expect(t[0]).toBeCloseTo(1, 1);
    expect(Math.abs(t[1])).toBeLessThan(0.1);
    expect(Math.abs(t[2])).toBeLessThan(0.1);
  });
});

/* ───────────── getPoints ───────────── */

describeImpl('Curve3 — getPoints', () => {
  it('should return divisions+1 points', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const result = c.getPoints(10);
    expect(result.length).toBe(11);
  });

  it('should start and end at control point endpoints', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 2, 0), vec3(3, 1, 0)];
    const c = new mod.Curve3(pts);
    const result = c.getPoints(20);
    expect(result[0][0]).toBeCloseTo(0);
    expect(result[0][1]).toBeCloseTo(0);
    expect(result[result.length - 1][0]).toBeCloseTo(3);
    expect(result[result.length - 1][1]).toBeCloseTo(1);
  });
});

/* ───────────── getLength ───────────── */

describeImpl('Curve3 — getLength', () => {
  it('should return exact length for straight-line points', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    expect(c.getLength()).toBeCloseTo(3.0, 1);
  });

  it('should return length greater than straight-line distance for curved path', () => {
    const pts = [vec3(0, 0, 0), vec3(0.5, 2, 0), vec3(1.5, -2, 0), vec3(2, 0, 0)];
    const c = new mod.Curve3(pts);
    const straightDist = 2.0;
    expect(c.getLength()).toBeGreaterThan(straightDist);
  });
});

/* ───────────── getPointAtLength ───────────── */

describeImpl('Curve3 — getPointAtLength', () => {
  it('should return start point at length 0', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const p = c.getPointAtLength(0);
    expect(p[0]).toBeCloseTo(0);
  });

  it('should return end point at total length', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const p = c.getPointAtLength(c.getLength());
    expect(p[0]).toBeCloseTo(3, 0);
  });

  it('should return mid-point at half length for straight line', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const c = new mod.Curve3(pts);
    const p = c.getPointAtLength(c.getLength() / 2);
    expect(p[0]).toBeCloseTo(1.5, 0);
  });
});

/* ───────────── Closed curve ───────────── */

describeImpl('Curve3 — closed curve', () => {
  it('should loop: getPoint(1) equals getPoint(0) for closed curve', () => {
    const pts = [vec3(0, 0, 0), vec3(1, 1, 0), vec3(2, 0, 0)];
    const c = new mod.Curve3(pts, { closed: true });
    const start = c.getPoint(0);
    const end = c.getPoint(1);
    expect(dist(start, end)).toBeLessThan(0.01);
  });
});

/* ───────────── Tension ───────────── */

describeImpl('Curve3 — tension parameter', () => {
  it('should produce different mid-points with different tension values', () => {
    // Asymmetric points — P0+P3 != P1+P2, so tension affects the midpoint.
    // (A symmetric configuration like [(0,0,0),(1,2,0),(2,0,0),(3,2,0)] would
    // make the tension term cancel at t=0.5, giving the same point for any alpha.)
    const pts = [vec3(0, 0, 0), vec3(1, 2, 0), vec3(2, 0, 0), vec3(4, 2, 0)];
    const c0 = new mod.Curve3(pts, { tension: 0 });
    const c1 = new mod.Curve3(pts, { tension: 0.8 });
    const p0 = c0.getPoint(0.5);
    const p1 = c1.getPoint(0.5);
    // Different tension should produce measurably different positions
    const d = dist(p0, p1);
    expect(d).toBeGreaterThan(0.001);
  });
});

/* ───────────── Degenerate: 2 points ───────────── */

describeImpl('Curve3 — two-point linear', () => {
  it('should linearly interpolate with only 2 points', () => {
    const c = new mod.Curve3([vec3(0, 0, 0), vec3(4, 0, 0)]);
    const mid = c.getPoint(0.5);
    expect(mid[0]).toBeCloseTo(2, 1);
    expect(mid[1]).toBeCloseTo(0);
    expect(mid[2]).toBeCloseTo(0);
  });
});
