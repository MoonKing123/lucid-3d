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
      indices[ii++] = a; indices[ii++] = d; indices[ii++] = b;
      indices[ii++] = b; indices[ii++] = d; indices[ii++] = c;
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

/**
 * 锥体，尖端朝 +Y（height/2），底面朝 -Y（-height/2），以原点为中心。
 * 默认：radius=1, height=1, radialSegments=16, openEnded=false
 */
export function createConeGeometry(opts?: {
  radius?: number;
  height?: number;
  radialSegments?: number;
  openEnded?: boolean;
}): Geometry {
  const radius = opts?.radius ?? 1;
  const height = opts?.height ?? 1;
  const rSeg = opts?.radialSegments ?? 16;
  const openEnded = opts?.openEnded ?? false;

  // 侧面法线参数
  const slant = Math.sqrt(radius * radius + height * height);
  const normalR = height / slant;  // 径向分量
  const normalY = radius / slant;  // Y 分量

  const sideVertCount = (rSeg + 1) * 2;
  const capVertCount = openEnded ? 0 : (rSeg + 2);
  const totalVerts = sideVertCount + capVertCount;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  const sideIdxCount = rSeg * 3;
  const capIdxCount = openEnded ? 0 : rSeg * 3;
  const indices = new Uint16Array(sideIdxCount + capIdxCount);

  let vc = 0;
  let ii = 0;

  // ── 侧面：apex 行（所有顶点位于尖端，但法线不同）
  for (let ir = 0; ir <= rSeg; ir++) {
    const theta = (ir / rSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = 0;
    positions[vc * 3 + 1] = height / 2;
    positions[vc * 3 + 2] = 0;
    normals[vc * 3] = cosT * normalR;
    normals[vc * 3 + 1] = normalY;
    normals[vc * 3 + 2] = sinT * normalR;
    uvs[vc * 2] = ir / rSeg;
    uvs[vc * 2 + 1] = 1;
    vc++;
  }

  // ── 侧面：base 行
  for (let ir = 0; ir <= rSeg; ir++) {
    const theta = (ir / rSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = radius * cosT;
    positions[vc * 3 + 1] = -height / 2;
    positions[vc * 3 + 2] = radius * sinT;
    normals[vc * 3] = cosT * normalR;
    normals[vc * 3 + 1] = normalY;
    normals[vc * 3 + 2] = sinT * normalR;
    uvs[vc * 2] = ir / rSeg;
    uvs[vc * 2 + 1] = 0;
    vc++;
  }

  // 侧面索引（apex → base 三角形）
  for (let ir = 0; ir < rSeg; ir++) {
    const apex = ir;
    const base0 = (rSeg + 1) + ir;
    const base1 = (rSeg + 1) + ir + 1;
    indices[ii++] = apex;
    indices[ii++] = base0;
    indices[ii++] = base1;
  }

  // ── 底盖
  if (!openEnded) {
    const capStart = sideVertCount;
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
      positions[vc * 3] = radius * cosT;
      positions[vc * 3 + 1] = -height / 2;
      positions[vc * 3 + 2] = radius * sinT;
      normals[vc * 3] = 0; normals[vc * 3 + 1] = -1; normals[vc * 3 + 2] = 0;
      uvs[vc * 2] = 0.5 + 0.5 * cosT;
      uvs[vc * 2 + 1] = 0.5 - 0.5 * sinT;
      vc++;
    }
    // 底盖扇形索引
    for (let ir = 0; ir < rSeg; ir++) {
      const center = capStart;
      const v0 = capStart + 1 + ir;
      const v1 = capStart + 1 + ir + 1;
      indices[ii++] = center;
      indices[ii++] = v0;
      indices[ii++] = v1;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}

/**
 * 圆环（甜甜圈），在 XZ 平面围绕 Y 轴。
 * 参数方程：P = ((R + r·cosV)·cosU, r·sinV, (R + r·cosV)·sinU)
 * 默认：radius=1, tubeRadius=0.4, radialSegments=16, tubularSegments=32
 */
export function createTorusGeometry(opts?: {
  radius?: number;
  tubeRadius?: number;
  radialSegments?: number;
  tubularSegments?: number;
}): Geometry {
  const R = opts?.radius ?? 1;
  const r = opts?.tubeRadius ?? 0.4;
  const radSeg = opts?.radialSegments ?? 16;   // 管截面分段
  const tubSeg = opts?.tubularSegments ?? 32;  // 环周分段

  const vertCount = (radSeg + 1) * (tubSeg + 1);
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint16Array(radSeg * tubSeg * 6);

  let vc = 0;
  // u：绕主环角度（0 ~ 2π），v：绕管截面角度（0 ~ 2π）
  for (let it = 0; it <= tubSeg; it++) {
    const u = (it / tubSeg) * 2 * Math.PI;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let ir = 0; ir <= radSeg; ir++) {
      const v = (ir / radSeg) * 2 * Math.PI;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      positions[vc * 3] = (R + r * cosV) * cosU;
      positions[vc * 3 + 1] = r * sinV;
      positions[vc * 3 + 2] = (R + r * cosV) * sinU;

      // 法线 = (P - 管中心) / r = (cosV·cosU, sinV, cosV·sinU)，已是单位向量
      normals[vc * 3] = cosV * cosU;
      normals[vc * 3 + 1] = sinV;
      normals[vc * 3 + 2] = cosV * sinU;

      uvs[vc * 2] = it / tubSeg;
      uvs[vc * 2 + 1] = ir / radSeg;
      vc++;
    }
  }

  let ii = 0;
  for (let it = 0; it < tubSeg; it++) {
    for (let ir = 0; ir < radSeg; ir++) {
      const a = it * (radSeg + 1) + ir;
      const b = (it + 1) * (radSeg + 1) + ir;
      const c = (it + 1) * (radSeg + 1) + ir + 1;
      const d = it * (radSeg + 1) + ir + 1;
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
      indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
    }
  }

  return new Geometry({ positions, normals, uvs, indices });
}

/**
 * 环形平面（准心/地面标记），位于 XZ 平面，法线 +Y。
 * 默认：innerRadius=0.5, outerRadius=1, thetaSegments=32
 */
export function createRingGeometry(opts?: {
  innerRadius?: number;
  outerRadius?: number;
  thetaSegments?: number;
}): Geometry {
  const innerR = opts?.innerRadius ?? 0.5;
  const outerR = opts?.outerRadius ?? 1;
  const tSeg = opts?.thetaSegments ?? 32;

  // 内环 (tSeg+1) + 外环 (tSeg+1) 顶点
  const vertCount = (tSeg + 1) * 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint16Array(tSeg * 6);

  let vc = 0;

  // 内环顶点
  for (let it = 0; it <= tSeg; it++) {
    const theta = (it / tSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = innerR * cosT;
    positions[vc * 3 + 1] = 0;
    positions[vc * 3 + 2] = innerR * sinT;
    normals[vc * 3] = 0; normals[vc * 3 + 1] = 1; normals[vc * 3 + 2] = 0;
    uvs[vc * 2] = 0.5 + 0.5 * cosT * (innerR / outerR);
    uvs[vc * 2 + 1] = 0.5 + 0.5 * sinT * (innerR / outerR);
    vc++;
  }

  // 外环顶点
  for (let it = 0; it <= tSeg; it++) {
    const theta = (it / tSeg) * 2 * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions[vc * 3] = outerR * cosT;
    positions[vc * 3 + 1] = 0;
    positions[vc * 3 + 2] = outerR * sinT;
    normals[vc * 3] = 0; normals[vc * 3 + 1] = 1; normals[vc * 3 + 2] = 0;
    uvs[vc * 2] = 0.5 + 0.5 * cosT;
    uvs[vc * 2 + 1] = 0.5 + 0.5 * sinT;
    vc++;
  }

  // 每段一个 quad（内环 → 外环）
  let ii = 0;
  for (let it = 0; it < tSeg; it++) {
    const inner0 = it;
    const inner1 = it + 1;
    const outer0 = (tSeg + 1) + it;
    const outer1 = (tSeg + 1) + it + 1;
    indices[ii++] = inner0; indices[ii++] = outer0; indices[ii++] = outer1;
    indices[ii++] = inner0; indices[ii++] = outer1; indices[ii++] = inner1;
  }

  return new Geometry({ positions, normals, uvs, indices });
}
