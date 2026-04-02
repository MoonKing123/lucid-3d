/**
 * Pre-written tests for Geometry Primitives.
 * AI must create src/renderer/primitives.ts to make these pass.
 *
 * API:
 *   createPlaneGeometry(width?, height?, widthSegments?, heightSegments?): Geometry
 *   createSphereGeometry(radius?, widthSegments?, heightSegments?): Geometry
 *   createCylinderGeometry(opts?: {
 *     radiusTop?, radiusBottom?, height?, radialSegments?, heightSegments?
 *   }): Geometry
 *
 * All return Geometry with positions, normals, uvs, indices.
 * Plane: XZ plane, centered at origin, facing +Y.
 * Sphere: centered at origin, UV sphere with poles on Y axis.
 * Cylinder: Y axis, centered at origin.
 */
import { describe, it, expect } from 'vitest';
import {
  createPlaneGeometry,
  createSphereGeometry,
  createCylinderGeometry,
} from '../../../src/renderer/primitives';
import { Geometry } from '../../../src/renderer/geometry';

/* ═══════════════ Helpers ═══════════════ */

function vertexCount(g: Geometry): number { return g.positions.length / 3; }
function triangleCount(g: Geometry): number { return g.indices!.length / 3; }

function allNormalsUnit(g: Geometry): boolean {
  const n = g.normals!;
  for (let i = 0; i < n.length; i += 3) {
    const len = Math.sqrt(n[i] ** 2 + n[i + 1] ** 2 + n[i + 2] ** 2);
    if (Math.abs(len - 1) > 0.01) return false;
  }
  return true;
}

function allUVsInRange(g: Geometry): boolean {
  const uv = g.uvs!;
  for (let i = 0; i < uv.length; i++) {
    if (uv[i] < -0.001 || uv[i] > 1.001) return false;
  }
  return true;
}

function allIndicesValid(g: Geometry): boolean {
  const vc = vertexCount(g);
  for (let i = 0; i < g.indices!.length; i++) {
    if (g.indices![i] >= vc) return false;
  }
  return true;
}

/* ═══════════════ Plane ═══════════════ */

describe('createPlaneGeometry', () => {
  it('should return a Geometry', () => {
    expect(createPlaneGeometry()).toBeInstanceOf(Geometry);
  });

  it('should default to 4 vertices, 2 triangles', () => {
    const g = createPlaneGeometry();
    expect(vertexCount(g)).toBe(4);
    expect(triangleCount(g)).toBe(2);
  });

  it('should include normals, uvs, and indices', () => {
    const g = createPlaneGeometry();
    expect(g.hasNormals).toBe(true);
    expect(g.hasUVs).toBe(true);
    expect(g.indices).not.toBeNull();
  });

  it('should have all normals pointing +Y', () => {
    const g = createPlaneGeometry(2, 2, 3, 3);
    const n = g.normals!;
    for (let i = 0; i < n.length; i += 3) {
      expect(n[i]).toBeCloseTo(0);
      expect(n[i + 1]).toBeCloseTo(1);
      expect(n[i + 2]).toBeCloseTo(0);
    }
  });

  it('should have correct counts for segmented plane', () => {
    const g = createPlaneGeometry(1, 1, 3, 2);
    expect(vertexCount(g)).toBe(12);   // (3+1)*(2+1)
    expect(triangleCount(g)).toBe(12); // 3*2*2
  });

  it('should center positions in XZ at y=0', () => {
    const g = createPlaneGeometry(2, 4);
    const p = g.positions;
    for (let i = 1; i < p.length; i += 3) expect(p[i]).toBeCloseTo(0);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i]);
      minZ = Math.min(minZ, p[i + 2]); maxZ = Math.max(maxZ, p[i + 2]);
    }
    expect(minX).toBeCloseTo(-1);
    expect(maxX).toBeCloseTo(1);
    expect(minZ).toBeCloseTo(-2);
    expect(maxZ).toBeCloseTo(2);
  });

  it('should have UVs in [0,1]', () => {
    expect(allUVsInRange(createPlaneGeometry())).toBe(true);
  });

  it('should have valid indices', () => {
    expect(allIndicesValid(createPlaneGeometry(1, 1, 5, 5))).toBe(true);
  });
});

/* ═══════════════ Sphere ═══════════════ */

describe('createSphereGeometry', () => {
  it('should return a Geometry', () => {
    expect(createSphereGeometry()).toBeInstanceOf(Geometry);
  });

  it('should have normals, uvs, indices', () => {
    const g = createSphereGeometry();
    expect(g.hasNormals).toBe(true);
    expect(g.hasUVs).toBe(true);
    expect(g.indices).not.toBeNull();
  });

  it('should have (wSeg+1)*(hSeg+1) vertices', () => {
    expect(vertexCount(createSphereGeometry(1, 4, 2))).toBe(15);
  });

  it('should place all vertices at radius distance', () => {
    const r = 2;
    const g = createSphereGeometry(r, 16, 8);
    const p = g.positions;
    for (let i = 0; i < p.length; i += 3) {
      const d = Math.sqrt(p[i] ** 2 + p[i + 1] ** 2 + p[i + 2] ** 2);
      expect(d).toBeCloseTo(r, 3);
    }
  });

  it('should have unit normals', () => {
    expect(allNormalsUnit(createSphereGeometry(1, 8, 4))).toBe(true);
  });

  it('should have outward-pointing normals', () => {
    const g = createSphereGeometry(1, 8, 4);
    const p = g.positions, n = g.normals!;
    for (let i = 0; i < p.length; i += 3) {
      const dot = p[i] * n[i] + p[i + 1] * n[i + 1] + p[i + 2] * n[i + 2];
      expect(dot).toBeGreaterThan(-0.01);
    }
  });

  it('should have top pole at (0, r, 0) and bottom at (0, -r, 0)', () => {
    const g = createSphereGeometry(1, 8, 4);
    const p = g.positions;
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(1);
    expect(p[2]).toBeCloseTo(0);
    const last = (vertexCount(g) - 1) * 3;
    expect(p[last]).toBeCloseTo(0);
    expect(p[last + 1]).toBeCloseTo(-1);
    expect(p[last + 2]).toBeCloseTo(0);
  });

  it('should have UVs in [0,1]', () => {
    expect(allUVsInRange(createSphereGeometry(1, 8, 4))).toBe(true);
  });

  it('should have valid indices', () => {
    expect(allIndicesValid(createSphereGeometry(1, 12, 6))).toBe(true);
  });
});

/* ═══════════════ Cylinder ═══════════════ */

describe('createCylinderGeometry', () => {
  it('should return a Geometry', () => {
    expect(createCylinderGeometry()).toBeInstanceOf(Geometry);
  });

  it('should have normals, uvs, indices', () => {
    const g = createCylinderGeometry();
    expect(g.hasNormals).toBe(true);
    expect(g.hasUVs).toBe(true);
    expect(g.indices).not.toBeNull();
  });

  it('should be centered along Y axis', () => {
    const h = 4;
    const g = createCylinderGeometry({ height: h });
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < g.positions.length; i += 3) {
      minY = Math.min(minY, g.positions[i]);
      maxY = Math.max(maxY, g.positions[i]);
    }
    expect(minY).toBeCloseTo(-h / 2);
    expect(maxY).toBeCloseTo(h / 2);
  });

  it('should have correct radii at top and bottom', () => {
    const rT = 1, rB = 2, h = 3;
    const g = createCylinderGeometry({ radiusTop: rT, radiusBottom: rB, height: h, radialSegments: 8, heightSegments: 1 });
    const topR: number[] = [], botR: number[] = [];
    for (let i = 0; i < g.positions.length; i += 3) {
      const y = g.positions[i + 1], r = Math.sqrt(g.positions[i] ** 2 + g.positions[i + 2] ** 2);
      if (Math.abs(y - h / 2) < 0.01 && r > 0.01) topR.push(r);
      if (Math.abs(y + h / 2) < 0.01 && r > 0.01) botR.push(r);
    }
    for (const r of topR) expect(r).toBeCloseTo(rT, 2);
    for (const r of botR) expect(r).toBeCloseTo(rB, 2);
  });

  it('should create a cone when radiusTop=0', () => {
    const g = createCylinderGeometry({ radiusTop: 0, radiusBottom: 1, height: 2, radialSegments: 6 });
    let hasApex = false;
    for (let i = 0; i < g.positions.length; i += 3) {
      if (Math.abs(g.positions[i + 1] - 1) < 0.01) {
        if (Math.sqrt(g.positions[i] ** 2 + g.positions[i + 2] ** 2) < 0.01) hasApex = true;
      }
    }
    expect(hasApex).toBe(true);
  });

  it('should have unit normals', () => {
    expect(allNormalsUnit(createCylinderGeometry({ radialSegments: 12 }))).toBe(true);
  });

  it('should have UVs in [0,1]', () => {
    expect(allUVsInRange(createCylinderGeometry({ radialSegments: 8 }))).toBe(true);
  });

  it('should have valid indices', () => {
    expect(allIndicesValid(createCylinderGeometry({ radialSegments: 8, heightSegments: 3 }))).toBe(true);
  });
});
