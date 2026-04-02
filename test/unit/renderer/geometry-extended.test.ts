/**
 * Pre-written tests for Geometry normals and UV coordinates.
 * AI must extend src/renderer/geometry.ts to make these pass.
 *
 * New fields:
 *   - normals: Float32Array | null (default null)
 *   - uvs: Float32Array | null (default null)
 *   - get hasNormals(): boolean
 *   - get hasUVs(): boolean
 *
 * createCubeGeometry() must return normals (per-face) and UVs.
 */
import { describe, it, expect } from 'vitest';
import { Geometry, createCubeGeometry } from '../../../src/renderer/geometry';

/* ───────────── Normals ───────────── */

describe('Geometry — normals', () => {
  it('should accept normals in constructor', () => {
    const g = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    });
    expect(g.normals).toBeInstanceOf(Float32Array);
    expect(g.normals!.length).toBe(9);
    expect(g.normals![2]).toBe(1);
  });

  it('should default normals to null when not provided', () => {
    const g = new Geometry({
      positions: new Float32Array([0, 0, 0]),
    });
    expect(g.normals).toBeNull();
  });

  it('should expose hasNormals getter', () => {
    const withN = new Geometry({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
    });
    const withoutN = new Geometry({
      positions: new Float32Array([0, 0, 0]),
    });
    expect(withN.hasNormals).toBe(true);
    expect(withoutN.hasNormals).toBe(false);
  });
});

/* ───────────── UV coordinates ───────────── */

describe('Geometry — UV coordinates', () => {
  it('should accept uvs in constructor', () => {
    const g = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      uvs: new Float32Array([0, 0, 1, 0, 0.5, 1]),
    });
    expect(g.uvs).toBeInstanceOf(Float32Array);
    expect(g.uvs!.length).toBe(6); // 3 vertices × 2 components
  });

  it('should default uvs to null when not provided', () => {
    const g = new Geometry({
      positions: new Float32Array([0, 0, 0]),
    });
    expect(g.uvs).toBeNull();
  });

  it('should expose hasUVs getter', () => {
    const withUV = new Geometry({
      positions: new Float32Array([0, 0, 0]),
      uvs: new Float32Array([0, 0]),
    });
    const withoutUV = new Geometry({
      positions: new Float32Array([0, 0, 0]),
    });
    expect(withUV.hasUVs).toBe(true);
    expect(withoutUV.hasUVs).toBe(false);
  });
});

/* ───────────── createCubeGeometry extended ───────────── */

describe('createCubeGeometry — normals and UVs', () => {
  it('should include per-face normals', () => {
    const cube = createCubeGeometry();
    expect(cube.normals).not.toBeNull();
    expect(cube.normals!.length).toBe(72); // 24 vertices × 3 components
  });

  it('should have correct +X face normal (1,0,0)', () => {
    const cube = createCubeGeometry();
    for (let i = 0; i < 4; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(1);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(0);
    }
  });

  it('should have correct -X face normal (-1,0,0)', () => {
    const cube = createCubeGeometry();
    for (let i = 4; i < 8; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(-1);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(0);
    }
  });

  it('should have correct +Y face normal (0,1,0)', () => {
    const cube = createCubeGeometry();
    for (let i = 8; i < 12; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(1);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(0);
    }
  });

  it('should have correct -Y face normal (0,-1,0)', () => {
    const cube = createCubeGeometry();
    for (let i = 12; i < 16; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(-1);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(0);
    }
  });

  it('should have correct +Z face normal (0,0,1)', () => {
    const cube = createCubeGeometry();
    for (let i = 16; i < 20; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(1);
    }
  });

  it('should have correct -Z face normal (0,0,-1)', () => {
    const cube = createCubeGeometry();
    for (let i = 20; i < 24; i++) {
      expect(cube.normals![i * 3 + 0]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 1]).toBeCloseTo(0);
      expect(cube.normals![i * 3 + 2]).toBeCloseTo(-1);
    }
  });

  it('should include UV coordinates', () => {
    const cube = createCubeGeometry();
    expect(cube.uvs).not.toBeNull();
    expect(cube.uvs!.length).toBe(48); // 24 vertices × 2 components
  });

  it('should have UV values in [0,1] range', () => {
    const cube = createCubeGeometry();
    for (let i = 0; i < cube.uvs!.length; i++) {
      expect(cube.uvs![i]).toBeGreaterThanOrEqual(0);
      expect(cube.uvs![i]).toBeLessThanOrEqual(1);
    }
  });

  it('should have each face cover the full UV square (0,0)→(1,1)', () => {
    const cube = createCubeGeometry();
    // Each face has 4 vertices, UV should cover corners of [0,1]²
    for (let face = 0; face < 6; face++) {
      const us = new Set<number>();
      const vs = new Set<number>();
      for (let v = 0; v < 4; v++) {
        const idx = (face * 4 + v) * 2;
        us.add(Math.round(cube.uvs![idx]));
        vs.add(Math.round(cube.uvs![idx + 1]));
      }
      expect(us.has(0)).toBe(true);
      expect(us.has(1)).toBe(true);
      expect(vs.has(0)).toBe(true);
      expect(vs.has(1)).toBe(true);
    }
  });

  // Backward compatibility: existing colors + indices should still work
  it('should still include colors and indices (backward compat)', () => {
    const cube = createCubeGeometry();
    expect(cube.colors.length).toBe(72);
    expect(cube.indices!.length).toBe(36);
    expect(cube.positions.length).toBe(72);
  });
});
