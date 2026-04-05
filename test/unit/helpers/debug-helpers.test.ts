/**
 * Pre-written tests for Debug Visualization Helpers:
 * - AxesHelper: XYZ 坐标轴线段
 * - GridHelper: XZ 平面参考网格
 * - BoundingBoxHelper: AABB 包围盒线框
 *
 * AI must implement:
 *   - src/helpers/axes-helper.ts
 *   - src/helpers/grid-helper.ts
 *   - src/helpers/bounding-box-helper.ts
 *
 * All helpers extend Node3D and use Line/LineGeometry/LineMaterial
 * from the existing LineRenderer module. They add Line children to themselves.
 *
 * AxesHelper API:
 *   class AxesHelper extends Node3D {
 *     constructor(size?: number);  // default 1
 *     get size(): number;
 *   }
 *   - children: 3 Line objects (LINES mode, 2 points each)
 *   - X axis: red (1,0,0), from (0,0,0) to (size,0,0)
 *   - Y axis: green (0,1,0), from (0,0,0) to (0,size,0)
 *   - Z axis: blue (0,0,1), from (0,0,0) to (0,0,size)
 *
 * GridHelper API:
 *   class GridHelper extends Node3D {
 *     constructor(size?: number, divisions?: number);  // defaults: 10, 10
 *     get size(): number;
 *     get divisions(): number;
 *   }
 *   - children: 1 or more Line objects
 *   - Grid on XZ plane (Y=0), centered at origin
 *   - Total line segments: (divisions + 1) * 2 lines (X-parallel + Z-parallel)
 *   - Grid spans from -size/2 to +size/2 on both X and Z
 *
 * BoundingBoxHelper API:
 *   class BoundingBoxHelper extends Node3D {
 *     readonly target: Node3D;
 *     constructor(target: Node3D, color?: Vec3);  // default color: green (0,1,0)
 *     update(): void;
 *   }
 *   - children: 1 Line object (LINES mode, 24 points = 12 edges)
 *   - Renders wireframe AABB of target's geometry
 *   - update() recomputes from target's geometry/worldMatrix
 */

import { describe, it, expect } from 'vitest';
import * as axesMod from '../../../src/helpers/axes-helper';
import * as gridMod from '../../../src/helpers/grid-helper';
import * as bboxMod from '../../../src/helpers/bounding-box-helper';
import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { Line, LineGeometry } from '../../../src/renderer/line-renderer';
import { vec3 } from '../../../src/math/vec3';

const isStub =
  ('__STUB__' in axesMod && (axesMod as any).__STUB__ === true) ||
  ('__STUB__' in gridMod && (gridMod as any).__STUB__ === true) ||
  ('__STUB__' in bboxMod && (bboxMod as any).__STUB__ === true);
const describeImpl = isStub ? describe.skip : describe;

const { AxesHelper } = axesMod;
const { GridHelper } = gridMod;
const { BoundingBoxHelper } = bboxMod;

/* ─── AxesHelper ─── */

describeImpl('AxesHelper', () => {
  it('should extend Node3D', () => {
    const axes = new AxesHelper();
    expect(axes).toBeInstanceOf(Node3D);
    expect(axes.name).toBe('axes-helper');
  });

  it('should default size to 1', () => {
    const axes = new AxesHelper();
    expect(axes.size).toBe(1);
  });

  it('should accept custom size', () => {
    const axes = new AxesHelper(5);
    expect(axes.size).toBe(5);
  });

  it('should have 3 Line children (one per axis)', () => {
    const axes = new AxesHelper(2);
    const lines = axes.children.filter(c => c instanceof Line);
    expect(lines.length).toBe(3);
  });

  it('X axis should extend along +X in red', () => {
    const axes = new AxesHelper(3);
    const lines = axes.children.filter(c => c instanceof Line) as Line[];
    // Find the X-axis line: endpoint at (size, 0, 0)
    const xLine = lines.find(l => {
      const pos = l.geometry.positions;
      // Second point (index 3,4,5) should be (3, 0, 0)
      return Math.abs(pos[3] - 3) < 0.001 && Math.abs(pos[4]) < 0.001 && Math.abs(pos[5]) < 0.001;
    });
    expect(xLine).toBeDefined();
    // Color should be red
    const colors = xLine!.geometry.colors;
    expect(colors[0]).toBe(1); // r
    expect(colors[1]).toBe(0); // g
    expect(colors[2]).toBe(0); // b
  });
});

/* ─── GridHelper ─── */

describeImpl('GridHelper', () => {
  it('should extend Node3D', () => {
    const grid = new GridHelper();
    expect(grid).toBeInstanceOf(Node3D);
    expect(grid.name).toBe('grid-helper');
  });

  it('should default to size=10, divisions=10', () => {
    const grid = new GridHelper();
    expect(grid.size).toBe(10);
    expect(grid.divisions).toBe(10);
  });

  it('should accept custom size and divisions', () => {
    const grid = new GridHelper(20, 5);
    expect(grid.size).toBe(20);
    expect(grid.divisions).toBe(5);
  });

  it('should have Line children', () => {
    const grid = new GridHelper(10, 10);
    const hasLines = grid.children.some(c => c instanceof Line);
    expect(hasLines).toBe(true);
  });

  it('should generate correct number of line segments', () => {
    const grid = new GridHelper(10, 4);
    // 4 divisions → 5 X-parallel + 5 Z-parallel = 10 lines
    // Each line = 2 points in LINES mode, so total points = 20 * 3 coords
    // Or if using single Line with LINES mode: 10 segments = 20 points
    const lines = grid.children.filter(c => c instanceof Line) as Line[];
    let totalSegments = 0;
    for (const line of lines) {
      if (line.drawMode === 'LINES') {
        totalSegments += line.geometry.pointCount / 2;
      } else {
        // LINE_STRIP: points - 1 segments
        totalSegments += line.geometry.pointCount - 1;
      }
    }
    // (divisions + 1) * 2 = (4 + 1) * 2 = 10 line segments
    expect(totalSegments).toBe(10);
  });

  it('grid should be on XZ plane (Y=0)', () => {
    const grid = new GridHelper(6, 2);
    const lines = grid.children.filter(c => c instanceof Line) as Line[];
    for (const line of lines) {
      const pos = line.geometry.positions;
      for (let i = 0; i < pos.length; i += 3) {
        expect(Math.abs(pos[i + 1])).toBeLessThan(0.001); // Y should be 0
      }
    }
  });
});

/* ─── BoundingBoxHelper ─── */

describeImpl('BoundingBoxHelper', () => {
  function createTestMesh(): Mesh {
    // 2x2x2 cube centered at origin
    const geo = new Geometry({
      positions: new Float32Array([
        -1, -1, -1,  1, -1, -1,  1, 1, -1,  -1, 1, -1,
        -1, -1, 1,   1, -1, 1,   1, 1, 1,   -1, 1, 1,
      ]),
    });
    return new Mesh(geo, new Material());
  }

  it('should extend Node3D', () => {
    const mesh = createTestMesh();
    const helper = new BoundingBoxHelper(mesh);
    expect(helper).toBeInstanceOf(Node3D);
    expect(helper.name).toBe('bbox-helper');
  });

  it('should store target reference', () => {
    const mesh = createTestMesh();
    const helper = new BoundingBoxHelper(mesh);
    expect(helper.target).toBe(mesh);
  });

  it('should have Line children with LINES draw mode', () => {
    const mesh = createTestMesh();
    const helper = new BoundingBoxHelper(mesh);
    helper.update();
    const lines = helper.children.filter(c => c instanceof Line) as Line[];
    expect(lines.length).toBeGreaterThan(0);
    // AABB box has 12 edges → 24 points in LINES mode
    let totalPoints = 0;
    for (const line of lines) {
      expect(line.drawMode).toBe('LINES');
      totalPoints += line.geometry.pointCount;
    }
    expect(totalPoints).toBe(24); // 12 edges * 2 endpoints
  });

  it('update() should match target geometry AABB', () => {
    const mesh = createTestMesh();
    const helper = new BoundingBoxHelper(mesh);
    helper.update();

    const lines = helper.children.filter(c => c instanceof Line) as Line[];
    const allPositions: number[] = [];
    for (const line of lines) {
      for (let i = 0; i < line.geometry.positions.length; i++) {
        allPositions.push(line.geometry.positions[i]);
      }
    }

    // All X coordinates should be either -1 or 1
    for (let i = 0; i < allPositions.length; i += 3) {
      const x = allPositions[i];
      const y = allPositions[i + 1];
      const z = allPositions[i + 2];
      expect(Math.abs(x) - 1).toBeLessThan(0.001);
      expect(Math.abs(y) - 1).toBeLessThan(0.001);
      expect(Math.abs(z) - 1).toBeLessThan(0.001);
    }
  });

  it('should work with non-Mesh target (fallback unit box)', () => {
    const node = new Node3D('empty');
    const helper = new BoundingBoxHelper(node);
    helper.update();
    // Should not crash, renders a default unit box
    const lines = helper.children.filter(c => c instanceof Line) as Line[];
    expect(lines.length).toBeGreaterThan(0);
  });
});
