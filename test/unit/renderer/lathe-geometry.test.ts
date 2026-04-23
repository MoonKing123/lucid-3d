import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/lathe-geometry';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('LatheGeometry — createLatheGeometry', () => {
  it('should produce (points.length) × (segments+1) vertices', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [0.5, 0],
        [0.5, 1],
      ],
      segments: 8,
    });
    // 2 profile points × 9 vertices per ring = 18
    expect(geo.positions.length).toBe(2 * 9 * 3);
  });

  it('should place every vertex at radius = profile x on its ring', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [1.0, 0],
        [1.0, 2],
      ],
      segments: 4,
    });
    // Each vertex on ring i should satisfy: sqrt(x² + z²) ≈ 1.0, y == profile[i].y
    const segs = 4;
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j <= segs; j++) {
        const vi = (p * (segs + 1) + j) * 3;
        const x = geo.positions[vi];
        const y = geo.positions[vi + 1];
        const z = geo.positions[vi + 2];
        const r = Math.sqrt(x * x + z * z);
        expect(r).toBeCloseTo(1.0, 3);
        expect(y).toBeCloseTo(p === 0 ? 0 : 2, 3);
      }
    }
  });

  it('should emit normals with unit length', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [0.5, 0],
        [0.7, 0.5],
        [0.3, 1],
      ],
      segments: 12,
    });
    expect(geo.normals).not.toBeNull();
    for (let vi = 0; vi < geo.normals!.length; vi += 3) {
      const nx = geo.normals![vi];
      const ny = geo.normals![vi + 1];
      const nz = geo.normals![vi + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1, 3);
    }
  });

  it('should emit uv coordinates (u around axis, v along profile)', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [1, 0],
        [1, 1],
      ],
      segments: 4,
    });
    expect(geo.uvs).not.toBeNull();
    expect(geo.uvs!.length).toBe((geo.positions.length / 3) * 2);
    // first ring first vertex: u=0, v=0
    expect(geo.uvs![0]).toBeCloseTo(0, 5);
    expect(geo.uvs![1]).toBeCloseTo(0, 5);
  });

  it('should emit index buffer for (points.length - 1) × segments quads', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [0.5, 0],
        [0.3, 1],
        [0.5, 2],
      ],
      segments: 6,
    });
    // 2 strips × 6 quads × 2 triangles × 3 indices = 72
    expect(geo.indices).not.toBeNull();
    expect(geo.indices!.length).toBe(2 * 6 * 2 * 3);
  });

  it('should respect partial phiLength (half revolve produces half ring)', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [1, 0],
        [1, 1],
      ],
      segments: 4,
      phiStart: 0,
      phiLength: Math.PI, // half revolve
    });
    // The last vertex on first ring should be at (−1, 0, ~0) — 180° from start
    const lastIdx = 4 * 3; // 5th vertex (j=4) on first ring
    const x = geo.positions[lastIdx];
    const z = geo.positions[lastIdx + 2];
    expect(x).toBeCloseTo(-1, 3);
    expect(Math.abs(z)).toBeLessThan(0.01);
  });

  it('should use defaults when segments/phi omitted (segments=12, phi full)', () => {
    const geo = mod.createLatheGeometry({
      points: [
        [1, 0],
        [1, 1],
      ],
    });
    expect(geo.positions.length).toBe(2 * 13 * 3);
  });

  it('should throw on fewer than 2 profile points', () => {
    expect(() => mod.createLatheGeometry({ points: [[1, 0]], segments: 8 })).toThrow();
  });

  it('should throw on segments < 3', () => {
    expect(() =>
      mod.createLatheGeometry({
        points: [
          [1, 0],
          [1, 1],
        ],
        segments: 2,
      }),
    ).toThrow();
  });
});
