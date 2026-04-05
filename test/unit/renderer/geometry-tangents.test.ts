/**
 * Pre-written tests for Geometry.computeTangents() — tangent frame computation.
 *
 * Normal mapping requires a TBN (Tangent-Bitangent-Normal) matrix per vertex.
 * The tangent vector is computed from the UV gradient across triangle edges
 * using the standard Mikktspace-like algorithm:
 *
 *   For each triangle:
 *     edge1 = p1 - p0;  edge2 = p2 - p0;
 *     dUV1  = uv1 - uv0; dUV2  = uv2 - uv0;
 *     tangent   = normalize(edge1 * dUV2.y - edge2 * dUV1.y)
 *     bitangent = normalize(edge2 * dUV1.x - edge1 * dUV2.x)
 *     handedness = sign(dot(cross(N, T), B))
 *
 *   Per-vertex tangent is averaged across adjacent triangles,
 *   then Gram-Schmidt orthogonalized against the vertex normal.
 *
 * API additions:
 *   Geometry.tangents: Float32Array | null;  // vec4 per vertex (xyz = tangent, w = handedness)
 *   Geometry.computeTangents(): void;        // auto-compute from positions + normals + uvs
 *
 * Pre-conditions: geometry must have normals and uvs.
 * Post-condition: tangents is Float32Array of length vertexCount * 4.
 *
 * @see test/unit/renderer/phong-normal-map.test.ts — uses tangents for normal map rendering
 */
import { describe, it, expect } from 'vitest';
import { Geometry } from '../../../src/renderer/geometry';

/* ───── Helper: create a simple XZ-plane quad (4 verts, 2 tris) ───── */
function createQuadGeometry(): Geometry {
  // Quad on XZ plane, normal pointing +Y, UV maps X→u, Z→v
  const positions = new Float32Array([
    0, 0, 0,   // v0 (bottom-left)
    1, 0, 0,   // v1 (bottom-right)
    1, 0, 1,   // v2 (top-right)
    0, 0, 1,   // v3 (top-left)
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  return new Geometry({ positions, normals, uvs, indices });
}

/* ───── Helper: create non-indexed triangle ───── */
function createTriangleGeometry(): Geometry {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 0, 1,
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
  ]);
  return new Geometry({ positions, normals, uvs });
}

/* ═══════════ Tests ═══════════ */

describe('Geometry.computeTangents()', () => {
  it('should set tangents to a non-null Float32Array', () => {
    const geo = createQuadGeometry();
    expect(geo.tangents).toBeNull();
    geo.computeTangents();
    expect(geo.tangents).toBeInstanceOf(Float32Array);
  });

  it('should produce vec4 tangents (length = vertexCount * 4)', () => {
    const geo = createQuadGeometry();
    geo.computeTangents();
    const vertexCount = geo.positions.length / 3;
    expect(geo.tangents!.length).toBe(vertexCount * 4);
  });

  it('should throw if geometry has no normals', () => {
    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    });
    expect(() => geo.computeTangents()).toThrow();
  });

  it('should throw if geometry has no uvs', () => {
    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    });
    expect(() => geo.computeTangents()).toThrow();
  });

  it('should compute tangent aligned with +X for XZ-plane quad', () => {
    // UV u-axis maps to +X world direction, so tangent should be roughly (1,0,0)
    const geo = createQuadGeometry();
    geo.computeTangents();
    const t = geo.tangents!;
    for (let i = 0; i < 4; i++) {
      const tx = t[i * 4 + 0];
      const ty = t[i * 4 + 1];
      const tz = t[i * 4 + 2];
      expect(tx).toBeCloseTo(1, 1);
      expect(ty).toBeCloseTo(0, 1);
      expect(tz).toBeCloseTo(0, 1);
    }
  });

  it('should produce unit-length tangent vectors (xyz)', () => {
    const geo = createQuadGeometry();
    geo.computeTangents();
    const t = geo.tangents!;
    const vertexCount = geo.positions.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      const tx = t[i * 4 + 0];
      const ty = t[i * 4 + 1];
      const tz = t[i * 4 + 2];
      const length = Math.sqrt(tx * tx + ty * ty + tz * tz);
      expect(length).toBeCloseTo(1.0, 2);
    }
  });

  it('should set w component to +1 or -1 (handedness)', () => {
    const geo = createQuadGeometry();
    geo.computeTangents();
    const t = geo.tangents!;
    const vertexCount = geo.positions.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      const w = t[i * 4 + 3];
      expect(Math.abs(w)).toBeCloseTo(1.0, 2);
    }
  });

  it('should produce tangents orthogonal to normals', () => {
    const geo = createQuadGeometry();
    geo.computeTangents();
    const t = geo.tangents!;
    const n = geo.normals!;
    const vertexCount = geo.positions.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      const dot =
        t[i * 4 + 0] * n[i * 3 + 0] +
        t[i * 4 + 1] * n[i * 3 + 1] +
        t[i * 4 + 2] * n[i * 3 + 2];
      expect(Math.abs(dot)).toBeLessThan(0.01);
    }
  });

  it('should work with non-indexed geometry', () => {
    const geo = createTriangleGeometry();
    geo.computeTangents();
    expect(geo.tangents).not.toBeNull();
    expect(geo.tangents!.length).toBe(3 * 4);
  });

  it('should overwrite tangents on re-computation', () => {
    const geo = createQuadGeometry();
    geo.computeTangents();
    const first = new Float32Array(geo.tangents!);
    geo.computeTangents();
    expect(geo.tangents!).toEqual(first);
  });

  it('should expose hasTangents getter', () => {
    const geo = createQuadGeometry();
    expect(geo.hasTangents).toBe(false);
    geo.computeTangents();
    expect(geo.hasTangents).toBe(true);
  });

  it('should accept tangents in constructor', () => {
    const tangents = new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
      tangents,
    });
    expect(geo.tangents).toBe(tangents);
  });
});
