/**
 * LatheGeometry — 2D profile 绕 Y 轴旋转成型几何体。
 * 用于生成花瓶、酒杯、陶罐、灯罩等旋转对称模型。
 */

import { Geometry } from './geometry';

export interface LatheGeometryOptions {
  points: Array<[number, number]>; // (x=半径, y=高度) 沿 Y 轴从下到上
  segments?: number;   // 绕 Y 轴分段数，默认 12
  phiStart?: number;   // 起始角度（弧度），默认 0
  phiLength?: number;  // 角度跨度（弧度），默认 2π
}

export function createLatheGeometry(opts: LatheGeometryOptions): Geometry {
  const {
    points,
    segments = 12,
    phiStart = 0,
    phiLength = Math.PI * 2,
  } = opts;

  if (points.length < 2) throw new Error('LatheGeometry: points 至少需要 2 个');
  if (segments < 3) throw new Error('LatheGeometry: segments 必须 >= 3');
  if (phiLength <= 0) throw new Error('LatheGeometry: phiLength 必须 > 0');

  const n = points.length;
  const rings = segments + 1;
  const vertexCount = n * rings;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  // 用有限差分计算每个 profile 点的切线 (dr, dy)
  // 外法线 = 将切线旋转 -90°: (dy, -dr)，即 radial 分量=dy，y 分量=-dr
  for (let i = 0; i < n; i++) {
    let dr: number, dy: number;
    if (i === 0) {
      dr = points[1][0] - points[0][0];
      dy = points[1][1] - points[0][1];
    } else if (i === n - 1) {
      dr = points[n - 1][0] - points[n - 2][0];
      dy = points[n - 1][1] - points[n - 2][1];
    } else {
      dr = points[i + 1][0] - points[i - 1][0];
      dy = points[i + 1][1] - points[i - 1][1];
    }

    const len = Math.sqrt(dr * dr + dy * dy);
    // 外法线 2D: (dy, -dr) 归一化 → radial 分量 nr, y 分量 ny
    const nr = len > 1e-8 ? dy / len : 1;
    const ny = len > 1e-8 ? -dr / len : 0;

    const radius = points[i][0];
    const y = points[i][1];
    const v = i / (n - 1);

    for (let j = 0; j <= segments; j++) {
      const phi = phiStart + (j / segments) * phiLength;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const vi = (i * rings + j) * 3;
      positions[vi]     = radius * cosP;
      positions[vi + 1] = y;
      positions[vi + 2] = radius * sinP;

      normals[vi]     = nr * cosP;
      normals[vi + 1] = ny;
      normals[vi + 2] = nr * sinP;

      const ui = (i * rings + j) * 2;
      uvs[ui]     = j / segments;
      uvs[ui + 1] = v;
    }
  }

  // 每对相邻 profile 环之间生成四边形带 (2 个三角形 / 四边形)
  const indexCount = (n - 1) * segments * 6;
  const indices = new Uint16Array(indexCount);
  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * rings + j;
      const b = i * rings + j + 1;
      const c = (i + 1) * rings + j + 1;
      const d = (i + 1) * rings + j;
      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = d;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}
