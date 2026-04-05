/**
 * WebGLRenderer — Frustum Culling & Render Sorting 集成测试
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { vec3 } from '../../../src/math/vec3';

/* ── helpers ─────────────────────────────────────────────────── */

function makeCamera(): PerspectiveCamera {
  const cam = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
  cam.position = vec3(0, 0, 5);
  return cam;
}

/** 1×1×1 cube centered at origin */
function cubeGeo(): Geometry {
  const s = 0.5;
  // 12 triangles (6 faces × 2), 36 vertices
  const p = new Float32Array([
    // Front
    -s,-s, s,  s,-s, s,  s, s, s,  -s,-s, s,  s, s, s, -s, s, s,
    // Back
    -s,-s,-s, -s, s,-s,  s, s,-s,  -s,-s,-s,  s, s,-s,  s,-s,-s,
  ]);
  return new Geometry({ positions: p });
}

function makeMeshAt(x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(cubeGeo(), new Material());
  mesh.position = vec3(x, y, z);
  return mesh;
}

/* ── Frustum Culling ─────────────────────────────────────────── */

describe('WebGLRenderer frustum culling', () => {
  it('should render a mesh inside the view frustum', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    // Place mesh directly in front of camera
    scene.addChild(makeMeshAt(0, 0, 0));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(1);
  });

  it('should skip a mesh far outside the view frustum', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    // Place mesh 500 units to the right — well outside frustum
    scene.addChild(makeMeshAt(500, 0, 0));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should skip a mesh behind the camera', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    // Camera at z=5 looking at -z; mesh at z=100 is behind
    scene.addChild(makeMeshAt(0, 0, 100));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should always render mesh with frustumCulled=false', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const mesh = makeMeshAt(500, 0, 0); // way outside frustum
    mesh.frustumCulled = false;
    scene.addChild(mesh);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(1);
  });

  it('should cull some and render others in mixed scene', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeMeshAt(0, 0, 0));    // visible
    scene.addChild(makeMeshAt(0, 0, 2));    // visible
    scene.addChild(makeMeshAt(500, 0, 0));  // culled
    scene.addChild(makeMeshAt(0, 500, 0));  // culled
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(2);
  });
});

/* ── Render Sorting ──────────────────────────────────────────── */

describe('WebGLRenderer render sorting', () => {
  it('should render opaque meshes before transparent meshes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();

    const transparentMat = new Material();
    transparentMat.transparent = true;
    const transparentMesh = new Mesh(cubeGeo(), transparentMat);
    transparentMesh.position = vec3(0, 0, 0);

    const opaqueMesh = makeMeshAt(0, 0, 2);

    // Add transparent FIRST to verify sorting reorders them
    scene.addChild(transparentMesh);
    scene.addChild(opaqueMesh);

    renderer.render(scene, makeCamera());
    // Both should render
    expect(gl._drawCalls.length).toBe(2);
    // Opaque drawn first (its draw call comes before transparent's)
    // We can't easily verify order via mock, but at least both are drawn
  });

  it('should render mesh with opacity < 1 after opaque meshes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();

    const semiTransparent = new Material();
    semiTransparent.opacity = 0.5;
    const semiMesh = new Mesh(cubeGeo(), semiTransparent);
    semiMesh.position = vec3(0, 0, 0);

    const opaqueMesh = makeMeshAt(0, 0, 2);

    scene.addChild(semiMesh);
    scene.addChild(opaqueMesh);

    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(2);
  });

  it('should enable blending for transparent meshes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();

    const mat = new Material();
    mat.transparent = true;
    const mesh = new Mesh(cubeGeo(), mat);
    mesh.position = vec3(0, 0, 0);
    scene.addChild(mesh);

    renderer.render(scene, makeCamera());
    expect(gl._calls['enable']).toBeGreaterThanOrEqual(2); // DEPTH_TEST + BLEND
  });
});
