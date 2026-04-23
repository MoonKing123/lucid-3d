/**
 * TubeGeometry — 沿 Curve3 路径扫掠的管道几何体。
 * 为 Curve3 (Phase 35) 提供可视化管道表面：轨道、蛇形路径、电缆、河流等。
 *
 * 实现思路：
 * 1. 沿 curve 采样 tubularSegments+1 个环
 * 2. 每个环使用平行传输 (parallel transport) frame 生成 radialSegments+1 个顶点
 * 3. 顶点环展开为四边形带 (2 三角形/四边形)
 */

import { Geometry } from './geometry';
import type { Curve3 } from '../math/curve3';

export interface TubeGeometryOptions {
  curve: Curve3;
  tubularSegments?: number; // 沿 curve 方向分段数，默认 64
  radius?: number;           // 管道半径，默认 0.1
  radialSegments?: number;   // 每环分段数，默认 8
  closed?: boolean;          // 首尾相连，默认 false
}

export function createTubeGeometry(opts: TubeGeometryOptions): Geometry {
  const { curve } = opts;
  if (curve == null) throw new Error('curve is required');

  const tubularSegments = opts.tubularSegments ?? 64;
  const radius = opts.radius ?? 0.1;
  const radialSegments = opts.radialSegments ?? 8;

  if (radius <= 0) throw new Error('radius must be > 0');
  if (tubularSegments < 1) throw new Error('tubularSegments must be >= 1');
  if (radialSegments < 3) throw new Error('radialSegments must be >= 3');

  const numRings = tubularSegments + 1;

  // 采样每个环的中心点和切线
  const centers: [number, number, number][] = [];
  const tangents: [number, number, number][] = [];
  for (let i = 0; i < numRings; i++) {
    const t = i / tubularSegments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    centers.push([p[0], p[1], p[2]]);
    tangents.push([tan[0], tan[1], tan[2]]);
  }

  // 使用平行传输构造稳定法线序列
  const frameNormals: [number, number, number][] = [];

  // 第一帧：选择与切线不平行的参考向量，叉乘得 binormal，再叉乘切线得 normal
  const t0 = tangents[0];
  let up: [number, number, number] = [0, 1, 0];
  if (Math.abs(t0[0] * up[0] + t0[1] * up[1] + t0[2] * up[2]) > 0.9) {
    up = [1, 0, 0];
  }
  let bx = t0[1] * up[2] - t0[2] * up[1];
  let by = t0[2] * up[0] - t0[0] * up[2];
  let bz = t0[0] * up[1] - t0[1] * up[0];
  const bLen = Math.sqrt(bx * bx + by * by + bz * bz);
  bx /= bLen; by /= bLen; bz /= bLen;
  // normal = binormal × tangent，方向指向管道表面外侧
  let n0x = by * t0[2] - bz * t0[1];
  let n0y = bz * t0[0] - bx * t0[2];
  let n0z = bx * t0[1] - by * t0[0];
  const n0Len = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);
  frameNormals.push([n0x / n0Len, n0y / n0Len, n0z / n0Len]);

  // 后续帧：Rodrigues 旋转公式绕 (prevT × currT) 轴旋转上一帧 normal
  for (let i = 1; i < numRings; i++) {
    const prevT = tangents[i - 1];
    const currT = tangents[i];
    const prevN = frameNormals[i - 1];

    let ax = prevT[1] * currT[2] - prevT[2] * currT[1];
    let ay = prevT[2] * currT[0] - prevT[0] * currT[2];
    let az = prevT[0] * currT[1] - prevT[1] * currT[0];
    const aLen = Math.sqrt(ax * ax + ay * ay + az * az);

    if (aLen < 1e-6) {
      // 切线几乎不变，保留上一帧 normal
      frameNormals.push([...prevN]);
      continue;
    }

    ax /= aLen; ay /= aLen; az /= aLen;

    const cosA = Math.max(-1, Math.min(1, prevT[0] * currT[0] + prevT[1] * currT[1] + prevT[2] * currT[2]));
    const angle = Math.acos(cosA);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const [px, py, pz] = prevN;
    const dotPA = px * ax + py * ay + pz * az;
    const crossX = ay * pz - az * py;
    const crossY = az * px - ax * pz;
    const crossZ = ax * py - ay * px;

    const rnx = cos * px + sin * crossX + (1 - cos) * dotPA * ax;
    const rny = cos * py + sin * crossY + (1 - cos) * dotPA * ay;
    const rnz = cos * pz + sin * crossZ + (1 - cos) * dotPA * az;
    const rnLen = Math.sqrt(rnx * rnx + rny * rny + rnz * rnz);
    frameNormals.push([rnx / rnLen, rny / rnLen, rnz / rnLen]);
  }

  // 生成顶点、法线、UV
  const vertexCount = numRings * (radialSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < numRings; i++) {
    const [cx, cy, cz] = centers[i];
    const [tx, ty, tz] = tangents[i];
    const [nx, ny, nz] = frameNormals[i];
    // binormal = tangent × normal
    const binX = ty * nz - tz * ny;
    const binY = tz * nx - tx * nz;
    const binZ = tx * ny - ty * nx;

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // 顶点 = 圆心 + radius * (cos*normal + sin*binormal)
      const vx = cx + radius * (cos * nx + sin * binX);
      const vy = cy + radius * (cos * ny + sin * binY);
      const vz = cz + radius * (cos * nz + sin * binZ);

      const vi = (i * (radialSegments + 1) + j) * 3;
      positions[vi]     = vx;
      positions[vi + 1] = vy;
      positions[vi + 2] = vz;

      // 法线：从圆心指向顶点，归一化
      const dnx = vx - cx;
      const dny = vy - cy;
      const dnz = vz - cz;
      const dnLen = Math.sqrt(dnx * dnx + dny * dny + dnz * dnz);
      normals[vi]     = dnx / dnLen;
      normals[vi + 1] = dny / dnLen;
      normals[vi + 2] = dnz / dnLen;

      // UV：u 沿曲线方向，v 绕环
      const uvi = (i * (radialSegments + 1) + j) * 2;
      uvs[uvi]     = i / tubularSegments;
      uvs[uvi + 1] = j / radialSegments;
    }
  }

  // 构建索引缓冲
  const indices = new Uint16Array(tubularSegments * radialSegments * 2 * 3);
  let idx = 0;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (radialSegments + 1) + j;
      const d = c + 1;
      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = b;
      indices[idx++] = d;
      indices[idx++] = c;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}
