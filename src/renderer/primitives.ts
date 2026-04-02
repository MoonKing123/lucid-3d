import { Geometry } from './geometry';

/**
 * 平面几何体，位于 XZ 平面，以原点为中心，法线朝 +Y。
 * 默认：1×1，1×1 分段。
 */
export function createPlaneGeometry(
  width = 1,
  height = 1,
  widthSegments = 1,
  heightSegments = 1
): Geometry {
  const wSeg = widthSegments;
  const hSeg = heightSegments;
  const vertCount = (wSeg + 1) * (hSeg + 1);

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  let vc = 0;
  for (let iz = 0; iz <= hSeg; iz++) {
    const t = iz / hSeg;
    const z = (t - 0.5) * height;
    for (let ix = 0; ix <= wSeg; ix++) {
      const s = ix / wSeg;
      const x = (s - 0.5) * width;
      positions[vc * 3] = x;
      positions[vc * 3 + 1] = 0;
      positions[vc * 3 + 2] = z;
      normals[vc * 3] = 0;
      normals[vc * 3 + 1] = 1;
      normals[vc * 3 + 2] = 0;
      uvs[vc * 2] = s;
      uvs[vc * 2 + 1] = 1 - t;
      vc++;
    }
  }

  const indices = new Uint16Array(wSeg * hSeg * 6);
  let ii = 0;
  for (let iz = 0; iz < hSeg; iz++) {
    for (let ix = 0; ix < wSeg; ix++) {
      const a = iz * (wSeg + 1) + ix;
      const b = (iz + 1) * (wSeg + 1) + ix;
      const c = (iz + 1) * (wSeg + 1) + (ix + 1);
      const d = iz * (wSeg + 1) + (ix + 1);
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}

/**
 * UV 球体，以原点为中心，极点在 Y 轴。
 * 默认：radius=1，16 宽度分段，8 高度分段。
 * 顶点数：(widthSegments+1) * (heightSegments+1)。
 */
export function createSphereGeometry(
  radius = 1,
  widthSegments = 16,
  heightSegments = 8
): Geometry {
  const wSeg = widthSegments;
  const hSeg = heightSegments;
  const vertCount = (wSeg + 1) * (hSeg + 1);

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  let vc = 0;
  for (let ih = 0; ih <= hSeg; ih++) {
    const phi = (ih / hSeg) * Math.PI; // 0（顶部）→ π（底部）
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let iw = 0; iw <= wSeg; iw++) {
      const theta = (iw / wSeg) * 2 * Math.PI;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // 单位法线即顶点归一化方向
      const nx = sinPhi * cosTheta;
      const ny = cosPhi;
      const nz = sinPhi * sinTheta;

      positions[vc * 3] = radius * nx;
      positions[vc * 3 + 1] = radius * ny;
      positions[vc * 3 + 2] = radius * nz;
      normals[vc * 3] = nx;
      normals[vc * 3 + 1] = ny;
      normals[vc * 3 + 2] = nz;
      uvs[vc * 2] = iw / wSeg;
      uvs[vc * 2 + 1] = 1 - ih / hSeg;
      vc++;
    }
  }

  const indices = new Uint16Array(hSeg * wSeg * 6);
  let ii = 0;
  for (let ih = 0; ih < hSeg; ih++) {
    for (let iw = 0; iw < wSeg; iw++) {
      const a = ih * (wSeg + 1) + iw;
      const b = (ih + 1) * (wSeg + 1) + iw;
      const c = (ih + 1) * (wSeg + 1) + (iw + 1);
      const d = ih * (wSeg + 1) + (iw + 1);
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}

/**
 * 圆柱体，沿 Y 轴，以原点为中心。
 * 默认：radiusTop=1, radiusBottom=1, height=1, 12 径向分段，1 高度分段。
 * radiusTop=0 时退化为圆锥。
 */
export function createCylinderGeometry(opts: {
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  radialSegments?: number;
  heightSegments?: number;
} = {}): Geometry {
  const radiusTop = opts.radiusTop ?? 1;
  const radiusBottom = opts.radiusBottom ?? 1;
  const height = opts.height ?? 1;
  const rSeg = opts.radialSegments ?? 12;
  const hSeg = opts.heightSegments ?? 1;

  // 侧面：(hSeg+1) 圈 × (rSeg+1) 顶点（首尾各保留一个接缝顶点）
  const sideVertCount = (hSeg + 1) * (rSeg + 1);
  // 顶盖：中心 + (rSeg+1) 个边缘顶点
  const capVertCount = rSeg + 2;
  const totalVerts = sideVertCount + capVertCount * 2;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  // 侧面索引 + 两个端盖索引
  const sideIdxCount = hSeg * rSeg * 6;
  const capIdxCount = rSeg * 3;
  const indices = new Uint16Array(sideIdxCount + capIdxCount * 2);

  // 圆台侧面法线的 Y 分量斜率：slope = (rB - rT) / h
  const slope = (radiusBottom - radiusTop) / height;
  const nLen = Math.sqrt(1 + slope * slope);

  let vc = 0;
  let ii = 0;

  // ── 侧面顶点 ──
  for (let ih = 0; ih <= hSeg; ih++) {
    const t = ih / hSeg; // 0 = 顶，1 = 底
    const y = height / 2 - t * height;
    const r = radiusTop + (radiusBottom - radiusTop) * t;
    for (let ir = 0; ir <= rSeg; ir++) {
      const theta = (ir / rSeg) * 2 * Math.PI;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      positions[vc * 3] = r * cosT;
      positions[vc * 3 + 1] = y;
      positions[vc * 3 + 2] = r * sinT;
      normals[vc * 3] = cosT / nLen;
      normals[vc * 3 + 1] = slope / nLen;
      normals[vc * 3 + 2] = sinT / nLen;
      uvs[vc * 2] = ir / rSeg;
      uvs[vc * 2 + 1] = 1 - t;
      vc++;
    }
  }

  // 侧面索引（连接相邻两圈）
  for (let ih = 0; ih < hSeg; ih++) {
    for (let ir = 0; ir < rSeg; ir++) {
      const a = ih * (rSeg + 1) + ir;
      const b = (ih + 1) * (rSeg + 1) + ir;
      const c = (ih + 1) * (rSeg + 1) + (ir + 1);
      const d = ih * (rSeg + 1) + (ir + 1);
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
    }
  }

  // ── 顶盖顶点 ──
  const topCapStart = sideVertCount;
  // 中心
  positions[vc * 3] = 0; positions[vc * 3 + 1] = height / 2; positions[vc * 3 + 2] = 0;
  normals[vc * 3] = 0; normals[vc * 3 + 1] = 1; normals[vc * 3 + 2] = 0;
  uvs[vc * 2] = 0.5; uvs[vc * 2 + 1] = 0.5;
  vc++;
  // 边缘顶点
  for (let ir = 0; ir <= rSeg; ir++) {
    const theta = (ir / rSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = radiusTop * cosT;
    positions[vc * 3 + 1] = height / 2;
    positions[vc * 3 + 2] = radiusTop * sinT;
    normals[vc * 3] = 0; normals[vc * 3 + 1] = 1; normals[vc * 3 + 2] = 0;
    uvs[vc * 2] = 0.5 + 0.5 * cosT;
    uvs[vc * 2 + 1] = 0.5 + 0.5 * sinT;
    vc++;
  }
  // 顶盖扇形索引（从中心向外）
  for (let ir = 0; ir < rSeg; ir++) {
    const center = topCapStart;
    const v0 = topCapStart + 1 + ir;
    const v1 = topCapStart + 1 + ir + 1;
    indices[ii++] = center; indices[ii++] = v1; indices[ii++] = v0;
  }

  // ── 底盖顶点 ──
  const botCapStart = topCapStart + capVertCount;
  // 中心
  positions[vc * 3] = 0; positions[vc * 3 + 1] = -height / 2; positions[vc * 3 + 2] = 0;
  normals[vc * 3] = 0; normals[vc * 3 + 1] = -1; normals[vc * 3 + 2] = 0;
  uvs[vc * 2] = 0.5; uvs[vc * 2 + 1] = 0.5;
  vc++;
  // 边缘顶点
  for (let ir = 0; ir <= rSeg; ir++) {
    const theta = (ir / rSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = radiusBottom * cosT;
    positions[vc * 3 + 1] = -height / 2;
    positions[vc * 3 + 2] = radiusBottom * sinT;
    normals[vc * 3] = 0; normals[vc * 3 + 1] = -1; normals[vc * 3 + 2] = 0;
    uvs[vc * 2] = 0.5 + 0.5 * cosT;
    uvs[vc * 2 + 1] = 0.5 - 0.5 * sinT;
    vc++;
  }
  // 底盖扇形索引
  for (let ir = 0; ir < rSeg; ir++) {
    const center = botCapStart;
    const v0 = botCapStart + 1 + ir;
    const v1 = botCapStart + 1 + ir + 1;
    indices[ii++] = center; indices[ii++] = v0; indices[ii++] = v1;
  }

  return new Geometry({ positions, normals, uvs, indices });
}
