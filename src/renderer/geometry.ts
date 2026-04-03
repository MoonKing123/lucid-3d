/**
 * Geometry — holds vertex/index buffer data for a mesh.
 * Positions and colors are stored as separate Float32Arrays.
 * Indices are optional (null means use drawArrays).
 */

export class Geometry {
  positions: Float32Array;       // xyz per vertex
  colors: Float32Array;          // rgb per vertex
  normals: Float32Array | null;  // xyz per vertex，默认 null
  uvs: Float32Array | null;      // uv per vertex，默认 null
  indices: Uint16Array | null;
  joints: Float32Array | null;   // 4 per vertex (bone indices)
  weights: Float32Array | null;  // 4 per vertex (blend weights)

  constructor(opts: {
    positions: Float32Array;
    colors?: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices?: Uint16Array;
    joints?: Float32Array;
    weights?: Float32Array;
  }) {
    this.positions = opts.positions;
    const vertexCount = opts.positions.length / 3;
    if (opts.colors) {
      this.colors = opts.colors;
    } else {
      // Default to white for all vertices
      this.colors = new Float32Array(vertexCount * 3).fill(1);
    }
    this.normals = opts.normals ?? null;
    this.uvs = opts.uvs ?? null;
    this.indices = opts.indices ?? null;
    this.joints = opts.joints ?? null;
    this.weights = opts.weights ?? null;
  }

  get hasNormals(): boolean {
    return this.normals !== null;
  }

  get hasUVs(): boolean {
    return this.uvs !== null;
  }

  get hasJoints(): boolean {
    return this.joints !== null;
  }

  get hasWeights(): boolean {
    return this.weights !== null;
  }
}

/**
 * Create a 1x1x1 cube centered at origin with per-face vertex colors.
 * Face colors: +X red, -X green, +Y blue, -Y yellow, +Z cyan, -Z magenta.
 * Each face is two triangles (6 indices), 4 unique vertices per face.
 * Total: 24 vertices, 36 indices.
 */
export function createCubeGeometry(): Geometry {
  // prettier-ignore
  // Each face: 4 vertices × (x,y,z) positions
  const positions = new Float32Array([
    // +X face (right) — red
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
    // -X face (left) — green
    -0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    // +Y face (top) — blue
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5,
    // -Y face (bottom) — yellow
    -0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    // +Z face (front) — cyan
    -0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    // -Z face (back) — magenta
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
  ]);

  // prettier-ignore
  // Per-vertex colors matching the face colors above
  const colors = new Float32Array([
    // +X red
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // -X green
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // +Y blue
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // -Y yellow
    1, 1, 0,  1, 1, 0,  1, 1, 0,  1, 1, 0,
    // +Z cyan
    0, 1, 1,  0, 1, 1,  0, 1, 1,  0, 1, 1,
    // -Z magenta
    1, 0, 1,  1, 0, 1,  1, 0, 1,  1, 0, 1,
  ]);

  // Two triangles per face (CCW winding), 6 faces × 6 indices = 36
  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,  // +X
     4,  5,  6,   4,  6,  7,  // -X
     8,  9, 10,   8, 10, 11,  // +Y
    12, 13, 14,  12, 14, 15,  // -Y
    16, 17, 18,  16, 18, 19,  // +Z
    20, 21, 22,  20, 22, 23,  // -Z
  ]);

  // prettier-ignore
  // 每个面的法线方向，4 个顶点共用同一法线
  const normals = new Float32Array([
    // +X 面：法线 (1, 0, 0)
     1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // -X 面：法线 (-1, 0, 0)
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // +Y 面：法线 (0, 1, 0)
    0,  1, 0,  0,  1, 0,  0,  1, 0,  0,  1, 0,
    // -Y 面：法线 (0, -1, 0)
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // +Z 面：法线 (0, 0, 1)
    0, 0,  1,  0, 0,  1,  0, 0,  1,  0, 0,  1,
    // -Z 面：法线 (0, 0, -1)
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
  ]);

  // prettier-ignore
  // 每个面的 UV 坐标，覆盖 (0,0)→(1,1)，4 个顶点对应四个角
  const uvs = new Float32Array([
    // +X 面
    0, 1,  0, 0,  1, 0,  1, 1,
    // -X 面
    0, 1,  0, 0,  1, 0,  1, 1,
    // +Y 面
    0, 1,  0, 0,  1, 0,  1, 1,
    // -Y 面
    0, 1,  0, 0,  1, 0,  1, 1,
    // +Z 面
    0, 1,  0, 0,  1, 0,  1, 1,
    // -Z 面
    0, 1,  0, 0,  1, 0,  1, 1,
  ]);

  return new Geometry({ positions, colors, normals, uvs, indices });
}
