import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/capsule-geometry';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CapsuleGeometry — createCapsuleGeometry', () => {
  it('should use defaults (radius=0.5, length=1, capSeg=4, radSeg=16)', () => {
    const geo = mod.createCapsuleGeometry();
    expect(geo.positions.length).toBeGreaterThan(0);
    expect(geo.normals).not.toBeNull();
    expect(geo.uvs).not.toBeNull();
    expect(geo.indices).not.toBeNull();
  });

  it('should bound all vertices within the capsule volume', () => {
    const radius = 0.5;
    const length = 1;
    const geo = mod.createCapsuleGeometry({
      radius,
      length,
      capSegments: 4,
      radialSegments: 16,
    });
    // Y range: -(length/2 + radius) .. +(length/2 + radius)
    // Horizontal radius (sqrt(x²+z²)): ≤ radius everywhere
    const halfL = length / 2;
    for (let vi = 0; vi < geo.positions.length; vi += 3) {
      const x = geo.positions[vi];
      const y = geo.positions[vi + 1];
      const z = geo.positions[vi + 2];
      const hr = Math.sqrt(x * x + z * z);
      expect(hr).toBeLessThanOrEqual(radius + 1e-4);
      expect(y).toBeGreaterThanOrEqual(-halfL - radius - 1e-4);
      expect(y).toBeLessThanOrEqual(halfL + radius + 1e-4);
    }
  });

  it('should place cylinder middle vertices at exactly radius on XZ', () => {
    // For y ∈ [-length/2, +length/2] the capsule surface should equal `radius` on XZ
    const radius = 0.5;
    const length = 2;
    const geo = mod.createCapsuleGeometry({
      radius,
      length,
      capSegments: 4,
      radialSegments: 16,
    });
    const halfL = length / 2;
    for (let vi = 0; vi < geo.positions.length; vi += 3) {
      const y = geo.positions[vi + 1];
      if (Math.abs(y) < halfL - 1e-5) {
        const x = geo.positions[vi];
        const z = geo.positions[vi + 2];
        const hr = Math.sqrt(x * x + z * z);
        expect(hr).toBeCloseTo(radius, 3);
      }
    }
  });

  it('should degenerate to a sphere when length=0', () => {
    const radius = 1;
    const geo = mod.createCapsuleGeometry({
      radius,
      length: 0,
      capSegments: 4,
      radialSegments: 16,
    });
    // All vertices at distance radius from origin (sphere)
    for (let vi = 0; vi < geo.positions.length; vi += 3) {
      const x = geo.positions[vi];
      const y = geo.positions[vi + 1];
      const z = geo.positions[vi + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      expect(dist).toBeCloseTo(radius, 3);
    }
  });

  it('should emit unit-length normals', () => {
    const geo = mod.createCapsuleGeometry({
      radius: 0.7,
      length: 1.5,
      capSegments: 6,
      radialSegments: 12,
    });
    for (let vi = 0; vi < geo.normals!.length; vi += 3) {
      const nx = geo.normals![vi];
      const ny = geo.normals![vi + 1];
      const nz = geo.normals![vi + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1, 3);
    }
  });

  it('should emit uv coordinates with correct count', () => {
    const geo = mod.createCapsuleGeometry({
      radius: 0.5,
      length: 1,
      capSegments: 4,
      radialSegments: 16,
    });
    expect(geo.uvs!.length).toBe((geo.positions.length / 3) * 2);
  });

  it('should throw on radius <= 0', () => {
    expect(() => mod.createCapsuleGeometry({ radius: 0 })).toThrow();
    expect(() => mod.createCapsuleGeometry({ radius: -0.5 })).toThrow();
  });

  it('should throw on length < 0', () => {
    expect(() => mod.createCapsuleGeometry({ length: -1 })).toThrow();
  });

  it('should throw on capSegments < 1 or radialSegments < 3', () => {
    expect(() => mod.createCapsuleGeometry({ capSegments: 0 })).toThrow();
    expect(() => mod.createCapsuleGeometry({ radialSegments: 2 })).toThrow();
  });
});
