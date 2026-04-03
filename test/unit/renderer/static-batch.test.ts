/**
 * StaticBatch 测试
 * 验证同材质 Mesh 合并为单次 draw call 的批量渲染逻辑。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/renderer/static-batch';
import { Geometry } from '../../src/renderer/geometry';
import { Material } from '../../src/renderer/material';
import { Mesh } from '../../src/renderer/mesh';
import { vec3 } from '../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- helpers ---------- */

/** 3 个顶点的三角形 */
function triGeo(): Geometry {
  return new Geometry({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  });
}

/** 带索引的四边形（两个三角形, 4 顶点, 6 索引） */
function quadGeo(): Geometry {
  return new Geometry({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
    colors: new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  });
}

function matA(): Material {
  return new Material(
    'precision mediump float;attribute vec3 a_position;uniform mat4 u_mvp;void main(){gl_Position=u_mvp*vec4(a_position,1.0);}',
    'precision mediump float;void main(){gl_FragColor=vec4(1.0,0.0,0.0,1.0);}',
  );
}

function matB(): Material {
  return new Material(
    'precision mediump float;attribute vec3 a_position;uniform mat4 u_mvp;void main(){gl_Position=u_mvp*vec4(a_position,1.0);}',
    'precision mediump float;void main(){gl_FragColor=vec4(0.0,1.0,0.0,1.0);}',
  );
}

/* ---------- StaticBatch 构造 ---------- */

describeImpl('StaticBatch construction', () => {
  it('should merge two meshes with same material', () => {
    const m = matA();
    const mesh1 = new Mesh(triGeo(), m);
    const mesh2 = new Mesh(triGeo(), m);
    mesh2.position = vec3(5, 0, 0);

    const batch = new mod.StaticBatch([mesh1, mesh2]);
    expect(batch.sourceCount).toBe(2);
    expect(batch.material).toBe(m);
    expect(batch.mesh).toBeInstanceOf(Mesh);
  });

  it('should throw if meshes array is empty', () => {
    expect(() => new mod.StaticBatch([])).toThrow();
  });

  it('should throw if materials differ', () => {
    const mesh1 = new Mesh(triGeo(), matA());
    const mesh2 = new Mesh(triGeo(), matB());
    expect(() => new mod.StaticBatch([mesh1, mesh2])).toThrow();
  });

  it('should merge vertex positions with baked world transform', () => {
    const m = matA();
    const mesh1 = new Mesh(triGeo(), m);
    // mesh1 at origin — vertices: (0,0,0), (1,0,0), (0,1,0)

    const mesh2 = new Mesh(triGeo(), m);
    mesh2.position = vec3(10, 0, 0);
    // mesh2 at (10,0,0) — world vertices: (10,0,0), (11,0,0), (10,1,0)

    const batch = new mod.StaticBatch([mesh1, mesh2]);
    const pos = batch.mergedGeometry.positions;

    // 合并后应有 6 个顶点 (2*3)
    expect(pos.length).toBe(6 * 3);

    // 第二组顶点应该包含偏移后的位置
    // 顶点 3 (index 3): (10, 0, 0)
    expect(pos[9]).toBeCloseTo(10);
    expect(pos[10]).toBeCloseTo(0);
    expect(pos[11]).toBeCloseTo(0);
  });

  it('should merge colors from all meshes', () => {
    const m = matA();
    const mesh1 = new Mesh(triGeo(), m);
    const mesh2 = new Mesh(triGeo(), m);

    const batch = new mod.StaticBatch([mesh1, mesh2]);
    expect(batch.mergedGeometry.colors.length).toBe(6 * 3);
  });

  it('should handle indexed geometry with correct index offset', () => {
    const m = matA();
    const mesh1 = new Mesh(quadGeo(), m);
    const mesh2 = new Mesh(quadGeo(), m);
    mesh2.position = vec3(5, 0, 0);

    const batch = new mod.StaticBatch([mesh1, mesh2]);
    const indices = batch.mergedGeometry.indices!;

    // 合并后 8 顶点, 12 索引
    expect(batch.mergedGeometry.positions.length).toBe(8 * 3);
    expect(indices.length).toBe(12);

    // 第二组索引应偏移 4（第一个 quad 有 4 个顶点）
    expect(indices[6]).toBe(4);  // 0 + 4
    expect(indices[7]).toBe(5);  // 1 + 4
    expect(indices[8]).toBe(6);  // 2 + 4
    expect(indices[9]).toBe(4);  // 0 + 4
    expect(indices[10]).toBe(6); // 2 + 4
    expect(indices[11]).toBe(7); // 3 + 4
  });

  it('should merge normals when present', () => {
    const m = matA();
    const geo1 = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    });
    const geo2 = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]),
    });
    const mesh1 = new Mesh(geo1, m);
    const mesh2 = new Mesh(geo2, m);

    const batch = new mod.StaticBatch([mesh1, mesh2]);
    expect(batch.mergedGeometry.normals).not.toBeNull();
    expect(batch.mergedGeometry.normals!.length).toBe(6 * 3);
  });
});

/* ---------- batchMeshes ---------- */

describeImpl('batchMeshes', () => {
  it('should group meshes by material', () => {
    const ma = matA();
    const mb = matB();
    const meshes = [
      new Mesh(triGeo(), ma),
      new Mesh(triGeo(), mb),
      new Mesh(triGeo(), ma),
      new Mesh(triGeo(), mb),
    ];
    const batches = mod.batchMeshes(meshes);
    expect(batches.length).toBe(2);

    // 每个 batch 包含 2 个源 mesh
    const counts = batches.map(b => b.sourceCount).sort();
    expect(counts).toEqual([2, 2]);
  });

  it('should return single batch for all same-material meshes', () => {
    const m = matA();
    const meshes = [
      new Mesh(triGeo(), m),
      new Mesh(triGeo(), m),
      new Mesh(triGeo(), m),
    ];
    const batches = mod.batchMeshes(meshes);
    expect(batches.length).toBe(1);
    expect(batches[0].sourceCount).toBe(3);
  });

  it('should return empty array for empty input', () => {
    const batches = mod.batchMeshes([]);
    expect(batches).toEqual([]);
  });

  it('should handle single mesh', () => {
    const m = matA();
    const batches = mod.batchMeshes([new Mesh(triGeo(), m)]);
    expect(batches.length).toBe(1);
    expect(batches[0].sourceCount).toBe(1);
  });
});
