import { describe, it, expect } from 'vitest';
import { Geometry } from '../../../src/renderer/geometry';

// 动态导入以检查函数是否存在
let createConeGeometry: any;
let createTorusGeometry: any;
let createRingGeometry: any;

try {
  const mod = await import('../../../src/renderer/primitives');
  createConeGeometry = mod.createConeGeometry;
  createTorusGeometry = mod.createTorusGeometry;
  createRingGeometry = mod.createRingGeometry;
} catch { /* will skip */ }

const hasCone = typeof createConeGeometry === 'function';
const hasTorus = typeof createTorusGeometry === 'function';
const hasRing = typeof createRingGeometry === 'function';

describe.skipIf(!hasCone)('createConeGeometry', () => {
  it('should return a Geometry instance', () => {
    const geo = createConeGeometry();
    expect(geo).toBeInstanceOf(Geometry);
  });

  it('should have positions, normals, uvs, and indices', () => {
    const geo = createConeGeometry();
    expect(geo.positions.length).toBeGreaterThan(0);
    expect(geo.normals.length).toBe(geo.positions.length);
    expect(geo.uvs.length).toBe((geo.positions.length / 3) * 2);
    expect(geo.indices).toBeDefined();
    expect(geo.indices!.length).toBeGreaterThan(0);
  });

  it('should accept custom radius, height, and segments', () => {
    const geo = createConeGeometry({ radius: 2, height: 3, radialSegments: 8 });
    expect(geo.positions.length).toBeGreaterThan(0);
    // 顶部顶点 Y 应 = height/2 = 1.5
    let maxY = -Infinity;
    for (let i = 1; i < geo.positions.length; i += 3) {
      if (geo.positions[i] > maxY) maxY = geo.positions[i];
    }
    expect(maxY).toBeCloseTo(1.5, 1);
  });

  it('should have apex at top (Y = height/2)', () => {
    const geo = createConeGeometry({ height: 4 });
    let maxY = -Infinity;
    for (let i = 1; i < geo.positions.length; i += 3) {
      if (geo.positions[i] > maxY) maxY = geo.positions[i];
    }
    expect(maxY).toBeCloseTo(2, 1);
  });

  it('should have base radius at bottom', () => {
    const geo = createConeGeometry({ radius: 3, height: 2 });
    // 找底部顶点（Y ≈ -1），检查距离中心
    let maxDist = 0;
    for (let i = 0; i < geo.positions.length; i += 3) {
      const y = geo.positions[i + 1];
      if (y < -0.9) {
        const x = geo.positions[i];
        const z = geo.positions[i + 2];
        const dist = Math.sqrt(x * x + z * z);
        if (dist > maxDist) maxDist = dist;
      }
    }
    expect(maxDist).toBeCloseTo(3, 0.5);
  });
});

describe.skipIf(!hasTorus)('createTorusGeometry', () => {
  it('should return a Geometry instance', () => {
    const geo = createTorusGeometry();
    expect(geo).toBeInstanceOf(Geometry);
  });

  it('should have positions, normals, uvs, and indices', () => {
    const geo = createTorusGeometry();
    expect(geo.positions.length).toBeGreaterThan(0);
    expect(geo.normals.length).toBe(geo.positions.length);
    expect(geo.uvs.length).toBe((geo.positions.length / 3) * 2);
    expect(geo.indices).toBeDefined();
  });

  it('should accept custom parameters', () => {
    const geo = createTorusGeometry({ radius: 2, tubeRadius: 0.5, radialSegments: 8, tubularSegments: 16 });
    expect(geo.positions.length).toBeGreaterThan(0);
  });

  it('should have vertices at expected distance from origin', () => {
    const R = 3, r = 0.5;
    const geo = createTorusGeometry({ radius: R, tubeRadius: r, radialSegments: 16, tubularSegments: 32 });
    // 每个顶点到原点的距离应在 [R-r, R+r] 范围（在 XZ 平面投影意义上）
    for (let i = 0; i < geo.positions.length; i += 3) {
      const x = geo.positions[i];
      const z = geo.positions[i + 2];
      const distXZ = Math.sqrt(x * x + z * z);
      expect(distXZ).toBeGreaterThanOrEqual(R - r - 0.01);
      expect(distXZ).toBeLessThanOrEqual(R + r + 0.01);
    }
  });

  it('normals should be unit length', () => {
    const geo = createTorusGeometry();
    for (let i = 0; i < geo.normals.length; i += 3) {
      const len = Math.sqrt(
        geo.normals[i] ** 2 + geo.normals[i + 1] ** 2 + geo.normals[i + 2] ** 2
      );
      expect(len).toBeCloseTo(1, 2);
    }
  });
});

describe.skipIf(!hasRing)('createRingGeometry', () => {
  it('should return a Geometry instance', () => {
    const geo = createRingGeometry();
    expect(geo).toBeInstanceOf(Geometry);
  });

  it('should have positions, normals, uvs, and indices', () => {
    const geo = createRingGeometry();
    expect(geo.positions.length).toBeGreaterThan(0);
    expect(geo.normals.length).toBe(geo.positions.length);
    expect(geo.uvs.length).toBe((geo.positions.length / 3) * 2);
    expect(geo.indices).toBeDefined();
  });

  it('should lie in XZ plane (all Y ≈ 0)', () => {
    const geo = createRingGeometry();
    for (let i = 1; i < geo.positions.length; i += 3) {
      expect(geo.positions[i]).toBeCloseTo(0, 5);
    }
  });

  it('should have normals pointing +Y', () => {
    const geo = createRingGeometry();
    for (let i = 0; i < geo.normals.length; i += 3) {
      expect(geo.normals[i]).toBeCloseTo(0, 5);
      expect(geo.normals[i + 1]).toBeCloseTo(1, 5);
      expect(geo.normals[i + 2]).toBeCloseTo(0, 5);
    }
  });

  it('should respect inner and outer radius', () => {
    const geo = createRingGeometry({ innerRadius: 1, outerRadius: 3 });
    for (let i = 0; i < geo.positions.length; i += 3) {
      const x = geo.positions[i];
      const z = geo.positions[i + 2];
      const dist = Math.sqrt(x * x + z * z);
      expect(dist).toBeGreaterThanOrEqual(1 - 0.01);
      expect(dist).toBeLessThanOrEqual(3 + 0.01);
    }
  });
});
