/**
 * Pre-written tests for Ray and Raycaster.
 * AI must create src/core/ray.ts to make these pass.
 *
 * API — Ray:
 *   class Ray {
 *     origin: Vec3; direction: Vec3;
 *     constructor(origin?: Vec3, direction?: Vec3);
 *     at(t: number): Vec3;
 *     intersectAABB(aabb: AABB): number | null;
 *     intersectTriangle(v0: Vec3, v1: Vec3, v2: Vec3): number | null;
 *   }
 *
 * API — Raycaster:
 *   interface RaycastHit { object: Node3D; distance: number; point: Vec3; }
 *   class Raycaster {
 *     ray: Ray; near: number; far: number;
 *     constructor(origin?: Vec3, direction?: Vec3);
 *     setFromCamera(ndc: {x:number,y:number}, camera: PerspectiveCamera): void;
 *     intersectObject(object: Node3D, recursive?: boolean): RaycastHit[];
 *     intersectObjects(objects: Node3D[], recursive?: boolean): RaycastHit[];
 *   }
 *
 * Depends on: AABB, Mesh, PerspectiveCamera, Mat4.invert
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/ray';
import { Ray, Raycaster } from '../../../src/core/ray';
import { vec3 } from '../../../src/math/vec3';
import { AABB } from '../../../src/math/aabb';
import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { createCubeGeometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { PerspectiveCamera } from '../../../src/core/camera';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ═══════════════ Ray ═══════════════ */

describeImpl('Ray — construction', () => {
  it('should default origin=(0,0,0) dir=(0,0,-1)', () => {
    const r = new Ray();
    expect(r.origin[2]).toBeCloseTo(0);
    expect(r.direction[2]).toBeCloseTo(-1);
  });

  it('should accept custom values', () => {
    const r = new Ray(vec3(1, 2, 3), vec3(0, 1, 0));
    expect(r.origin[0]).toBeCloseTo(1);
    expect(r.direction[1]).toBeCloseTo(1);
  });
});

describeImpl('Ray — at(t)', () => {
  it('should return origin at t=0', () => {
    const p = new Ray(vec3(1, 2, 3), vec3(0, 0, -1)).at(0);
    expect(p[0]).toBeCloseTo(1);
    expect(p[1]).toBeCloseTo(2);
    expect(p[2]).toBeCloseTo(3);
  });

  it('should travel along direction', () => {
    const p = new Ray(vec3(0, 0, 5), vec3(0, 0, -1)).at(3);
    expect(p[2]).toBeCloseTo(2);
  });
});

describeImpl('Ray — intersectAABB', () => {
  const box = new AABB(vec3(-1, -1, -1), vec3(1, 1, 1));

  it('should hit box in front', () => {
    const t = new Ray(vec3(0, 0, 5), vec3(0, 0, -1)).intersectAABB(box);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(4);
  });

  it('should miss for ray pointing away', () => {
    expect(new Ray(vec3(0, 0, 5), vec3(0, 0, 1)).intersectAABB(box)).toBeNull();
  });

  it('should miss for ray off to the side', () => {
    expect(new Ray(vec3(5, 5, 0), vec3(0, 0, -1)).intersectAABB(box)).toBeNull();
  });

  it('should handle origin inside box', () => {
    const t = new Ray(vec3(0, 0, 0), vec3(1, 0, 0)).intersectAABB(box);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThanOrEqual(0);
  });
});

describeImpl('Ray — intersectTriangle', () => {
  const v0 = vec3(-1, -1, 0), v1 = vec3(1, -1, 0), v2 = vec3(0, 1, 0);

  it('should hit triangle head-on', () => {
    const t = new Ray(vec3(0, 0, 5), vec3(0, 0, -1)).intersectTriangle(v0, v1, v2);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(5);
  });

  it('should miss when off target', () => {
    expect(new Ray(vec3(5, 5, 5), vec3(0, 0, -1)).intersectTriangle(v0, v1, v2)).toBeNull();
  });

  it('should miss for parallel ray', () => {
    expect(new Ray(vec3(0, 0, 1), vec3(1, 0, 0)).intersectTriangle(v0, v1, v2)).toBeNull();
  });

  it('should miss when pointing away', () => {
    expect(new Ray(vec3(0, 0, 5), vec3(0, 0, 1)).intersectTriangle(v0, v1, v2)).toBeNull();
  });

  it('should hit offset triangle at correct distance', () => {
    const t = new Ray(vec3(0.1, 0.1, 0), vec3(0, 0, -1))
      .intersectTriangle(vec3(0, 0, -3), vec3(1, 0, -3), vec3(0, 1, -3));
    expect(t!).toBeCloseTo(3);
  });
});

/* ═══════════════ Raycaster ═══════════════ */

describeImpl('Raycaster — construction', () => {
  it('should create with defaults', () => {
    const rc = new Raycaster();
    expect(rc.ray).toBeInstanceOf(Ray);
    expect(rc.near).toBe(0);
    expect(rc.far).toBe(Infinity);
  });
});

describeImpl('Raycaster — setFromCamera', () => {
  it('should create ray from camera center', () => {
    const cam = new PerspectiveCamera({ fov: Math.PI / 4, aspect: 1, near: 0.1, far: 100 });
    cam.position = vec3(0, 0, 5);
    cam.lookAt(vec3(0, 0, 0));
    const rc = new Raycaster();
    rc.setFromCamera({ x: 0, y: 0 }, cam);
    expect(rc.ray.origin[2]).toBeCloseTo(5);
    expect(rc.ray.direction[2]).toBeLessThan(0);
  });

  it('should vary with NDC coords', () => {
    const cam = new PerspectiveCamera({ fov: Math.PI / 2, aspect: 1, near: 0.1, far: 100 });
    cam.position = vec3(0, 0, 10);
    cam.lookAt(vec3(0, 0, 0));
    const rc1 = new Raycaster();
    rc1.setFromCamera({ x: -1, y: -1 }, cam);
    const rc2 = new Raycaster();
    rc2.setFromCamera({ x: 1, y: 1 }, cam);
    expect(rc1.ray.direction[0]).not.toBeCloseTo(rc2.ray.direction[0]);
  });
});

describeImpl('Raycaster — intersectObject', () => {
  it('should hit mesh in front', () => {
    const mesh = new Mesh(createCubeGeometry(), new Material());
    const hits = new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1)).intersectObject(mesh);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].object).toBe(mesh);
    expect(hits[0].distance).toBeCloseTo(4.5);
  });

  it('should return empty when missing', () => {
    const mesh = new Mesh(createCubeGeometry(), new Material());
    expect(new Raycaster(vec3(10, 10, 5), vec3(0, 0, -1)).intersectObject(mesh)).toHaveLength(0);
  });

  it('should respect near/far', () => {
    const mesh = new Mesh(createCubeGeometry(), new Material());
    const rc = new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1));
    rc.far = 3;
    expect(rc.intersectObject(mesh)).toHaveLength(0);
  });

  it('should traverse children when recursive', () => {
    const parent = new Node3D();
    parent.addChild(new Mesh(createCubeGeometry(), new Material()));
    const hits = new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1)).intersectObject(parent, true);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('should not traverse when not recursive', () => {
    const parent = new Node3D();
    parent.addChild(new Mesh(createCubeGeometry(), new Material()));
    expect(new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1)).intersectObject(parent, false)).toHaveLength(0);
  });
});

describeImpl('Raycaster — intersectObjects', () => {
  it('should sort by distance (nearest first)', () => {
    const mat = new Material();
    const m1 = new Mesh(createCubeGeometry(), mat); m1.position = vec3(0, 0, -2);
    const m2 = new Mesh(createCubeGeometry(), mat); m2.position = vec3(0, 0, 0);
    const hits = new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1)).intersectObjects([m1, m2]);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0].distance).toBeLessThanOrEqual(hits[1].distance);
    expect(hits[0].object).toBe(m2);
  });

  it('should include hit point', () => {
    const hits = new Raycaster(vec3(0, 0, 5), vec3(0, 0, -1)).intersectObjects([new Mesh(createCubeGeometry(), new Material())]);
    expect(hits[0].point[2]).toBeCloseTo(0.5);
  });
});
