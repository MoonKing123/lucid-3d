export interface TerrainOptions {
  heightmap: Float32Array;
  widthSegments: number;
  depthSegments: number;
  width?: number;
  depth?: number;
  heightScale?: number;
}

export class Terrain {
  geometry: {
    positions: Float32Array;
    uvs: Float32Array;
    normals: Float32Array;
  };

  private _heightmap: Float32Array;
  private _widthSegments: number;
  private _depthSegments: number;
  private _width: number;
  private _depth: number;
  private _heightScale: number;

  constructor(opts: TerrainOptions) {
    const {
      heightmap,
      widthSegments,
      depthSegments,
      width = widthSegments,
      depth = depthSegments,
      heightScale = 1,
    } = opts;

    const expectedLength = (widthSegments + 1) * (depthSegments + 1);
    if (heightmap.length !== expectedLength) {
      throw new Error(
        `heightmap 长度 ${heightmap.length} 与期望 ${expectedLength} 不匹配`,
      );
    }

    this._heightmap = heightmap;
    this._widthSegments = widthSegments;
    this._depthSegments = depthSegments;
    this._width = width;
    this._depth = depth;
    this._heightScale = heightScale;

    const vertexCount = (widthSegments + 1) * (depthSegments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const normals = new Float32Array(vertexCount * 3);

    // 行主序：行 i → x 方向，列 j → z 方向
    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= depthSegments; j++) {
        const idx = i * (depthSegments + 1) + j;
        const x = (i / widthSegments) * width;
        const z = (j / depthSegments) * depth;
        const y = heightmap[idx] * heightScale;

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        uvs[idx * 2 + 0] = i / widthSegments;
        uvs[idx * 2 + 1] = j / depthSegments;
      }
    }

    // 有限差分法推导法线（斜率 → 切线叉积）
    const dx = width / widthSegments;
    const dz = depth / depthSegments;

    const getH = (i: number, j: number): number => {
      const ci = Math.max(0, Math.min(widthSegments, i));
      const cj = Math.max(0, Math.min(depthSegments, j));
      return heightmap[ci * (depthSegments + 1) + cj] * heightScale;
    };

    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= depthSegments; j++) {
        const idx = i * (depthSegments + 1) + j;

        const nx = -(getH(i + 1, j) - getH(i - 1, j)) / (2 * dx);
        const ny = 1;
        const nz = -(getH(i, j + 1) - getH(i, j - 1)) / (2 * dz);

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals[idx * 3 + 0] = nx / len;
        normals[idx * 3 + 1] = ny / len;
        normals[idx * 3 + 2] = nz / len;
      }
    }

    this.geometry = { positions, uvs, normals };
  }

  getHeightAt(x: number, z: number): number {
    const { _heightmap, _widthSegments, _depthSegments, _width, _depth, _heightScale } = this;

    // 世界坐标 → 网格浮点坐标，并夹紧边界
    const gx = Math.max(0, Math.min(_widthSegments, (x / _width) * _widthSegments));
    const gz = Math.max(0, Math.min(_depthSegments, (z / _depth) * _depthSegments));

    const ix = Math.min(Math.floor(gx), _widthSegments - 1);
    const iz = Math.min(Math.floor(gz), _depthSegments - 1);
    const fx = gx - ix;
    const fz = gz - iz;

    const cols = _depthSegments + 1;
    const h00 = _heightmap[ix * cols + iz];
    const h10 = _heightmap[(ix + 1) * cols + iz];
    const h01 = _heightmap[ix * cols + (iz + 1)];
    const h11 = _heightmap[(ix + 1) * cols + (iz + 1)];

    // 双线性插值
    return (
      h00 * (1 - fx) * (1 - fz) +
      h10 * fx * (1 - fz) +
      h01 * (1 - fx) * fz +
      h11 * fx * fz
    ) * _heightScale;
  }
}
