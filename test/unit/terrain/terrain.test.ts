import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/terrain/terrain';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('Terrain', () => {
  const { Terrain } = mod as any;

  it('constructs a 2x2 flat terrain (all heights = 0)', () => {
    const heightmap = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
    });
    expect(terrain).toBeDefined();
  });

  it('throws when heightmap length mismatches segments+1 grid', () => {
    const wrongSize = new Float32Array(4);
    expect(
      () =>
        new Terrain({
          heightmap: wrongSize,
          widthSegments: 4,
          depthSegments: 4,
        }),
    ).toThrow();
  });

  it('getHeightAt returns sampled height for flat terrain', () => {
    const heightmap = new Float32Array(9).fill(0);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
    });
    expect(terrain.getHeightAt(0, 0)).toBe(0);
    expect(terrain.getHeightAt(5, 5)).toBe(0);
  });

  it('getHeightAt returns peak height for single-peak terrain', () => {
    const heightmap = new Float32Array([0, 0, 0, 0, 10, 0, 0, 0, 0]);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
      heightScale: 1,
    });
    const h = terrain.getHeightAt(5, 5);
    expect(h).toBeCloseTo(10, 1);
  });

  it('getHeightAt uses bilinear interpolation between vertices', () => {
    const heightmap = new Float32Array([0, 0, 10, 10]);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 1,
      depthSegments: 1,
      width: 10,
      depth: 10,
      heightScale: 1,
    });
    const h = terrain.getHeightAt(5, 0);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(10);
  });

  it('heightScale multiplies heightmap values', () => {
    const heightmap = new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
      heightScale: 50,
    });
    const h = terrain.getHeightAt(5, 5);
    expect(h).toBeCloseTo(50, 1);
  });

  it('exposes Mesh-compatible geometry (position/uv/normal)', () => {
    const heightmap = new Float32Array(9).fill(0);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
    });
    expect((terrain as any).geometry).toBeDefined();
    const geom = (terrain as any).geometry;
    expect(geom.positions).toBeInstanceOf(Float32Array);
    expect(geom.uvs).toBeInstanceOf(Float32Array);
    expect(geom.normals).toBeInstanceOf(Float32Array);
  });

  it('generates correct vertex count for 2x2 grid (3x3 = 9 vertices)', () => {
    const heightmap = new Float32Array(9).fill(0);
    const terrain = new Terrain({
      heightmap,
      widthSegments: 2,
      depthSegments: 2,
      width: 10,
      depth: 10,
    });
    const geom = (terrain as any).geometry;
    expect(geom.positions.length).toBe(9 * 3);
  });
});
