/**
 * CapsuleGeometry — 胶囊体几何（两半球 + 中段圆柱）。
 * 角色碰撞代理、胶囊关节、快速角色模型、药丸形物体的标准形状。
 *
 * 结构（中心在原点，Y 轴为胶囊轴）：
 * - 上半球：capSegments+1 环，从极点 (0, halfL+radius, 0) 到赤道 (halfL, radius 水平圆)
 * - 下半球：capSegments+1 环，从赤道 (-halfL, radius 水平圆) 到极点 (0, -halfL-radius, 0)
 * - 中段圆柱通过上下赤道环之间的四边形带隐式存在（若 length=0 退化为球体）
 *
 * 总环数 = 2*(capSegments+1)，每环 radialSegments+1 顶点。
 */

import { Geometry } from './geometry';

export interface CapsuleGeometryOptions {
  radius?: number; // 半球半径 + 圆柱半径，默认 0.5
  length?: number; // 中段圆柱长度 (不含两端半球)，默认 1
  capSegments?: number; // 每个半球沿经度分段数，默认 4
  radialSegments?: number; // 绕 Y 轴分段数，默认 16
}

export function createCapsuleGeometry(opts: CapsuleGeometryOptions = {}): Geometry {
  const radius = opts.radius ?? 0.5;
  const length = opts.length ?? 1;
  const capSegments = opts.capSegments ?? 4;
  const radialSegments = opts.radialSegments ?? 16;

  if (radius <= 0) throw new Error('CapsuleGeometry: radius must be > 0');
  if (length < 0) throw new Error('CapsuleGeometry: length must be >= 0');
  if (capSegments < 1) throw new Error('CapsuleGeometry: capSegments must be >= 1');
  if (radialSegments < 3) throw new Error('CapsuleGeometry: radialSegments must be >= 3');

  const halfL = length / 2;
  const totalHeight = 2 * radius + length;

  // 总环数：上半球 (capSegments+1) + 下半球 (capSegments+1)
  const numRings = 2 * (capSegments + 1);
  const vertsPerRing = radialSegments + 1;
  const numVerts = numRings * vertsPerRing;

  const positions = new Float32Array(numVerts * 3);
  const normals = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);

  let vi = 0;

  // 上半球：k=0 极点, k=capSegments 赤道
  for (let k = 0; k <= capSegments; k++) {
    const phi = ((capSegments - k) / capSegments) * (Math.PI / 2); // π/2 → 0
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const y = halfL + radius * sinPhi;
    const rXZ = radius * cosPhi;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      positions[vi * 3 + 0] = rXZ * cosTheta;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = rXZ * sinTheta;
      // 上半球法线：从 (0, halfL, 0) 指向顶点的单位向量
      normals[vi * 3 + 0] = cosPhi * cosTheta;
      normals[vi * 3 + 1] = sinPhi;
      normals[vi * 3 + 2] = cosPhi * sinTheta;
      uvs[vi * 2 + 0] = j / radialSegments;
      uvs[vi * 2 + 1] = (y + halfL + radius) / totalHeight;
      vi++;
    }
  }

  // 下半球：k=0 赤道, k=capSegments 极点
  for (let k = 0; k <= capSegments; k++) {
    const phi = (k / capSegments) * (Math.PI / 2); // 0 → π/2
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const y = -halfL - radius * sinPhi;
    const rXZ = radius * cosPhi;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      positions[vi * 3 + 0] = rXZ * cosTheta;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = rXZ * sinTheta;
      // 下半球法线：从 (0, -halfL, 0) 指向顶点的单位向量
      normals[vi * 3 + 0] = cosPhi * cosTheta;
      normals[vi * 3 + 1] = -sinPhi;
      normals[vi * 3 + 2] = cosPhi * sinTheta;
      uvs[vi * 2 + 0] = j / radialSegments;
      uvs[vi * 2 + 1] = (y + halfL + radius) / totalHeight;
      vi++;
    }
  }

  // indices：相邻两环之间的四边形带
  const numQuadRows = numRings - 1;
  const indices = new Uint16Array(numQuadRows * radialSegments * 2 * 3);
  let idx = 0;
  for (let ri = 0; ri < numQuadRows; ri++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = ri * vertsPerRing + j;
      const b = a + 1;
      const c = (ri + 1) * vertsPerRing + j;
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
