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
  tangents: Float32Array | null; // vec4 per vertex (xyz=tangent, w=handedness)

  constructor(opts: {
    positions: Float32Array;
    colors?: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    indices?: Uint16Array;
    joints?: Float32Array;
    weights?: Float32Array;
    tangents?: Float32Array;
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
    this.tangents = opts.tangents ?? null;
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

  get hasTangents(): boolean {
    return this.tangents !== null;
  }

  /** 深拷贝所有 buffer，返回独立的 Geometry 副本 */
  clone(): Geometry {
    return new Geometry({
      positions: new Float32Array(this.positions),
      colors:    new Float32Array(this.colors),
      normals:   this.normals  ? new Float32Array(this.normals)  : undefined,
      uvs:       this.uvs      ? new Float32Array(this.uvs)      : undefined,
      indices:   this.indices  ? new Uint16Array(this.indices)   : undefined,
      joints:    this.joints   ? new Float32Array(this.joints)   : undefined,
      weights:   this.weights  ? new Float32Array(this.weights)  : undefined,
      tangents:  this.tangents ? new Float32Array(this.tangents) : undefined,
    });
  }

  /**
   * Compute per-vertex tangent vectors from positions, normals, and UVs.
   * Uses Mikktspace-like algorithm. Stores result in this.tangents as vec4
   * (xyz = tangent direction, w = handedness ±1).
   * @throws if normals or uvs are null
   */
  computeTangents(): void {
    if (!this.normals) throw new Error('computeTangents requires normals');
    if (!this.uvs) throw new Error('computeTangents requires uvs');

    const positions = this.positions;
    const normals = this.normals;
    const uvs = this.uvs;
    const vertexCount = positions.length / 3;

    // 每顶点切线/副切线累加器
    const tan1 = new Float32Array(vertexCount * 3);
    const tan2 = new Float32Array(vertexCount * 3);

    // 构建三角形迭代器
    const triangleCount = this.indices
      ? this.indices.length / 3
      : vertexCount / 3;
    const getIndex = this.indices
      ? (i: number) => this.indices![i]
      : (i: number) => i;

    for (let t = 0; t < triangleCount; t++) {
      const i0 = getIndex(t * 3 + 0);
      const i1 = getIndex(t * 3 + 1);
      const i2 = getIndex(t * 3 + 2);

      const p0x = positions[i0 * 3], p0y = positions[i0 * 3 + 1], p0z = positions[i0 * 3 + 2];
      const p1x = positions[i1 * 3], p1y = positions[i1 * 3 + 1], p1z = positions[i1 * 3 + 2];
      const p2x = positions[i2 * 3], p2y = positions[i2 * 3 + 1], p2z = positions[i2 * 3 + 2];

      const uv0u = uvs[i0 * 2], uv0v = uvs[i0 * 2 + 1];
      const uv1u = uvs[i1 * 2], uv1v = uvs[i1 * 2 + 1];
      const uv2u = uvs[i2 * 2], uv2v = uvs[i2 * 2 + 1];

      const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
      const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;

      const duv1u = uv1u - uv0u, duv1v = uv1v - uv0v;
      const duv2u = uv2u - uv0u, duv2v = uv2v - uv0v;

      const det = duv1u * duv2v - duv2u * duv1v;
      // 跳过退化三角形（UV 面积近零）
      if (Math.abs(det) < 1e-8) continue;

      const f = 1.0 / det;

      const tx = f * (e1x * duv2v - e2x * duv1v);
      const ty = f * (e1y * duv2v - e2y * duv1v);
      const tz = f * (e1z * duv2v - e2z * duv1v);

      const bx = f * (e2x * duv1u - e1x * duv2u);
      const by = f * (e2y * duv1u - e1y * duv2u);
      const bz = f * (e2z * duv1u - e1z * duv2u);

      for (const vi of [i0, i1, i2]) {
        tan1[vi * 3 + 0] += tx;
        tan1[vi * 3 + 1] += ty;
        tan1[vi * 3 + 2] += tz;
        tan2[vi * 3 + 0] += bx;
        tan2[vi * 3 + 1] += by;
        tan2[vi * 3 + 2] += bz;
      }
    }

    const tangents = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
      const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
      const tx = tan1[i * 3],    ty = tan1[i * 3 + 1],    tz = tan1[i * 3 + 2];
      const bx = tan2[i * 3],    by = tan2[i * 3 + 1],    bz = tan2[i * 3 + 2];

      // Gram-Schmidt 正交化：T' = normalize(T - N * dot(N, T))
      const dot = nx * tx + ny * ty + nz * tz;
      let ox = tx - nx * dot;
      let oy = ty - ny * dot;
      let oz = tz - nz * dot;

      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      if (len > 1e-8) {
        ox /= len; oy /= len; oz /= len;
      } else {
        // 退化情况：选一个与法线垂直的任意切线
        const ax = Math.abs(nx) < 0.9 ? 1 : 0;
        const ay = Math.abs(nx) < 0.9 ? 0 : 1;
        const d2 = nx * ax + ny * ay;
        ox = ax - nx * d2; oy = ay - ny * d2; oz = -nz * d2;
        const l2 = Math.sqrt(ox * ox + oy * oy + oz * oz);
        ox /= l2; oy /= l2; oz /= l2;
      }

      // 手性：sign(dot(cross(N, T'), B))
      const crossX = ny * oz - nz * oy;
      const crossY = nz * ox - nx * oz;
      const crossZ = nx * oy - ny * ox;
      const handedness = (crossX * bx + crossY * by + crossZ * bz) >= 0 ? 1 : -1;

      tangents[i * 4 + 0] = ox;
      tangents[i * 4 + 1] = oy;
      tangents[i * 4 + 2] = oz;
      tangents[i * 4 + 3] = handedness;
    }

    this.tangents = tangents;
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
