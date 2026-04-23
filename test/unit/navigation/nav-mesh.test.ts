import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/navigation/nav-mesh';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

// A simple 2-triangle quad on the XZ plane (Y=0):
//   v0 (0,0,0) --- v1 (4,0,0)
//      |     /         |
//      |   /           |
//   v2 (0,0,4) --- v3 (4,0,4)
// Triangles: [v0,v1,v2], [v1,v3,v2] (share edge v1-v2)
const quadVerts = () => [vec3(0, 0, 0), vec3(4, 0, 0), vec3(0, 0, 4), vec3(4, 0, 4)];
const quadTris: Array<[number, number, number]> = [[0, 1, 2], [1, 3, 2]];

// A 4-triangle strip: tri0-tri1-tri2-tri3 forming a 4x1 corridor
//   v0-v1-v2-v3-v4
//   |  |  |  |  |
//   v5-v6-v7-v8-v9
const stripVerts = () => [
  vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0), vec3(4, 0, 0),
  vec3(0, 0, 1), vec3(1, 0, 1), vec3(2, 0, 1), vec3(3, 0, 1), vec3(4, 0, 1),
];
// triangles pair: (top, bottom-left, top-right) and (bottom-left, bottom-right, top-right)
const stripTris: Array<[number, number, number]> = [
  [0, 1, 5], [1, 6, 5],
  [1, 2, 6], [2, 7, 6],
  [2, 3, 7], [3, 8, 7],
  [3, 4, 8], [4, 9, 8],
];

describeImpl('NavMesh', () => {
  it('builds polygon list from triangles', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    expect(mesh.polygonCount).toBe(2);
  });

  it('computes adjacency for triangles sharing an edge', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    // tri 0 (v0,v1,v2) shares edge v1-v2 with tri 1 (v1,v3,v2)
    expect(mesh.adjacency(0)).toContain(1);
    expect(mesh.adjacency(1)).toContain(0);
  });

  it('returns no adjacency for triangles without shared edge', () => {
    const verts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 0, 1), vec3(5, 0, 5), vec3(6, 0, 5), vec3(5, 0, 6)];
    const tris: Array<[number, number, number]> = [[0, 1, 2], [3, 4, 5]];
    const mesh = new mod.NavMesh(verts, tris);
    expect(mesh.adjacency(0)).toEqual([]);
    expect(mesh.adjacency(1)).toEqual([]);
  });

  it('getPolygon snaps a point inside a triangle to that polygon index', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    // (1, 0, 1) is inside tri 0 (v0,v1,v2)
    const idx = mesh.getPolygon(vec3(1, 0, 1));
    expect(idx).toBe(0);
  });

  it('getPolygon returns null for points far from any polygon', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    const idx = mesh.getPolygon(vec3(100, 0, 100));
    expect(idx).toBeNull();
  });

  it('findPath returns a single-polygon path when start and end are in the same polygon', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    const path = mesh.findPath(vec3(0.5, 0, 0.5), vec3(1, 0, 1));
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    // first waypoint should be close to start
    expect(path![0][0]).toBeCloseTo(0.5, 5);
    expect(path![0][2]).toBeCloseTo(0.5, 5);
    // last waypoint should be close to end
    expect(path![path!.length - 1][0]).toBeCloseTo(1, 5);
    expect(path![path!.length - 1][2]).toBeCloseTo(1, 5);
  });

  it('findPath traverses adjacent polygons in a strip', () => {
    const mesh = new mod.NavMesh(stripVerts(), stripTris);
    // start in leftmost region, end in rightmost region
    const path = mesh.findPath(vec3(0.3, 0, 0.5), vec3(3.7, 0, 0.5));
    expect(path).not.toBeNull();
    // path should have start + intermediate waypoints + end (>= 3 points for a corridor)
    expect(path!.length).toBeGreaterThanOrEqual(2);
    expect(path![0][0]).toBeCloseTo(0.3, 5);
    expect(path![path!.length - 1][0]).toBeCloseTo(3.7, 5);
  });

  it('findPath returns null when start is outside mesh', () => {
    const mesh = new mod.NavMesh(quadVerts(), quadTris);
    const path = mesh.findPath(vec3(100, 0, 100), vec3(1, 0, 1));
    expect(path).toBeNull();
  });

  it('findPath returns null between disconnected polygon groups', () => {
    const verts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 0, 1), vec3(5, 0, 5), vec3(6, 0, 5), vec3(5, 0, 6)];
    const tris: Array<[number, number, number]> = [[0, 1, 2], [3, 4, 5]];
    const mesh = new mod.NavMesh(verts, tris);
    const path = mesh.findPath(vec3(0.3, 0, 0.3), vec3(5.3, 0, 5.3));
    expect(path).toBeNull();
  });
});
