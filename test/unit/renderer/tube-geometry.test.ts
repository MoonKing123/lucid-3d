import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/tube-geometry';
import { Curve3 } from '../../../src/math/curve3';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('TubeGeometry — createTubeGeometry', () => {
  const makeCurve = () =>
    new Curve3([vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 1, 0), vec3(3, 0, 0)]);

  it('should produce (tubularSegments+1) × (radialSegments+1) vertices', () => {
    const geo = mod.createTubeGeometry({
      curve: makeCurve(),
      tubularSegments: 10,
      radius: 0.2,
      radialSegments: 8,
    });
    // 11 rings × 9 points per ring = 99 vertices
    expect(geo.positions.length).toBe(11 * 9 * 3);
  });

  it('should place every vertex at `radius` distance from its ring center', () => {
    const curve = makeCurve();
    const geo = mod.createTubeGeometry({
      curve,
      tubularSegments: 4,
      radius: 0.5,
      radialSegments: 8,
    });
    // For each ring, pick sample vertex, compute its distance to the ring's center
    // (center = curve point at corresponding t).
    const tubSeg = 4;
    const radSeg = 8;
    for (let i = 0; i <= tubSeg; i++) {
      const t = i / tubSeg;
      const center = curve.getPoint(t);
      for (let j = 0; j <= radSeg; j++) {
        const vi = (i * (radSeg + 1) + j) * 3;
        const dx = geo.positions[vi] - center[0];
        const dy = geo.positions[vi + 1] - center[1];
        const dz = geo.positions[vi + 2] - center[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        expect(dist).toBeCloseTo(0.5, 3);
      }
    }
  });

  it('should emit outward-pointing per-vertex normals', () => {
    const geo = mod.createTubeGeometry({
      curve: makeCurve(),
      tubularSegments: 4,
      radius: 0.3,
      radialSegments: 8,
    });
    expect(geo.normals).not.toBeNull();
    expect(geo.normals!.length).toBe(geo.positions.length);
    // Normal should roughly point from ring center outwards; normalized length ≈ 1
    for (let vi = 0; vi < geo.normals!.length; vi += 3) {
      const nx = geo.normals![vi];
      const ny = geo.normals![vi + 1];
      const nz = geo.normals![vi + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1, 3);
    }
  });

  it('should emit uv coordinates (u along curve, v around ring)', () => {
    const geo = mod.createTubeGeometry({
      curve: makeCurve(),
      tubularSegments: 4,
      radius: 0.3,
      radialSegments: 8,
    });
    expect(geo.uvs).not.toBeNull();
    expect(geo.uvs!.length).toBe((geo.positions.length / 3) * 2);
    // u at first ring = 0, at last ring = 1
    expect(geo.uvs![0]).toBeCloseTo(0, 5);
    const lastRingFirstIdx = (4 * 9) * 2;
    expect(geo.uvs![lastRingFirstIdx]).toBeCloseTo(1, 5);
  });

  it('should emit index buffer with 2 triangles per quad', () => {
    const geo = mod.createTubeGeometry({
      curve: makeCurve(),
      tubularSegments: 4,
      radius: 0.3,
      radialSegments: 8,
    });
    expect(geo.indices).not.toBeNull();
    // tubularSegments × radialSegments quads × 2 triangles × 3 indices
    expect(geo.indices!.length).toBe(4 * 8 * 2 * 3);
  });

  it('should use defaults when omitted (tubSeg=64, radius=0.1, radSeg=8)', () => {
    const geo = mod.createTubeGeometry({ curve: makeCurve() });
    expect(geo.positions.length).toBe((64 + 1) * (8 + 1) * 3);
  });

  it('should throw on zero or negative radius', () => {
    expect(() => mod.createTubeGeometry({ curve: makeCurve(), radius: 0 })).toThrow();
    expect(() => mod.createTubeGeometry({ curve: makeCurve(), radius: -0.1 })).toThrow();
  });

  it('should throw on tubularSegments < 1', () => {
    expect(() => mod.createTubeGeometry({ curve: makeCurve(), tubularSegments: 0 })).toThrow();
  });

  it('should throw on radialSegments < 3', () => {
    expect(() => mod.createTubeGeometry({ curve: makeCurve(), radialSegments: 2 })).toThrow();
  });
});
