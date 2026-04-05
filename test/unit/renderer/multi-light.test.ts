/**
 * Pre-written tests for multi-light forward rendering support.
 *
 * Current limitation: renderer collects only the first DirectionalLight found.
 * Enhancement: support up to MAX_DIR_LIGHTS (4) directional lights and
 * MAX_POINT_LIGHTS (4) point lights in a single forward pass.
 *
 * Changes required:
 * 1. WebGLRenderer — collect all lights from scene (not just first-found)
 * 2. PhongMaterial shader — light arrays instead of single light uniforms
 * 3. PointLight uniform integration — position, color, distance, decay
 *
 * Shader uniforms (new):
 *   uniform int u_numDirLights;
 *   uniform vec3 u_dirLightDirs[4];
 *   uniform vec3 u_dirLightColors[4];
 *   uniform int u_numPointLights;
 *   uniform vec3 u_pointLightPositions[4];
 *   uniform vec3 u_pointLightColors[4];
 *   uniform float u_pointLightDistances[4];
 *   uniform float u_pointLightDecays[4];
 *
 * Depends on: PhongMaterial, DirectionalLight, PointLight, WebGLRenderer, mock-gl
 */
import { describe, it, expect } from 'vitest';
import * as mockGlMod from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../src/renderer/webgl-renderer';
import { Scene } from '../../src/core/scene';
import { PerspectiveCamera } from '../../src/core/camera';
import { Mesh } from '../../src/renderer/mesh';
import { PhongMaterial } from '../../src/renderer/phong-material';
import { Geometry, createCubeGeometry } from '../../src/renderer/geometry';
import { AmbientLight, DirectionalLight } from '../../src/core/light';
import { PointLight } from '../../src/core/point-light';
import { Node3D } from '../../src/core/node3d';
import { vec3 } from '../../src/math/vec3';

const isStub = '__STUB__' in mockGlMod && (mockGlMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ── helpers ─────────────────────────────────────────────────────── */

function makeCamera(): PerspectiveCamera {
  const cam = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
  cam.position = vec3(0, 0, 5);
  return cam;
}

function makePhongCube(): Mesh {
  return new Mesh(createCubeGeometry(), new PhongMaterial());
}

/* ── PhongMaterial shader — multi-light uniforms ──────────────── */

describeImpl('PhongMaterial shader — multi-light uniforms', () => {
  it('should declare directional light count uniform', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_numDirLights');
  });

  it('should declare directional light array uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_dirLightDirs');
    expect(mat.fragmentShader).toContain('u_dirLightColors');
  });

  it('should declare point light count uniform', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_numPointLights');
  });

  it('should declare point light array uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_pointLightPositions');
    expect(mat.fragmentShader).toContain('u_pointLightColors');
  });

  it('should declare point light attenuation uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_pointLightDistances');
    expect(mat.fragmentShader).toContain('u_pointLightDecays');
  });
});

/* ── Renderer — multi-light collection ───────────────────────── */

describeImpl('WebGLRenderer — multi-light collection', () => {
  it('should render scene with 2 directional lights without error', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const light1 = new DirectionalLight(vec3(1, 1, 1), 1, vec3(0, -1, 0));
    const light2 = new DirectionalLight(vec3(0.5, 0.5, 1), 0.8, vec3(-1, 0, 0));
    scene.addChild(light1);
    scene.addChild(light2);
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should render scene with 4 directional lights without error', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    for (let i = 0; i < 4; i++) {
      scene.addChild(new DirectionalLight(vec3(1, 1, 1), 0.5, vec3(0, -1, i * 0.1)));
    }
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should render scene with point lights without error', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const ambient = new AmbientLight(vec3(0.2, 0.2, 0.2));
    const point = new PointLight({ color: vec3(1, 0.8, 0.6), intensity: 1, distance: 10, decay: 2 });
    point.position = vec3(2, 3, 1);
    scene.addChild(ambient);
    scene.addChild(point);
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should render mixed directional + point lights', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new AmbientLight(vec3(0.1, 0.1, 0.1)));
    scene.addChild(new DirectionalLight(vec3(1, 1, 1), 1, vec3(0, -1, 0)));
    const pl = new PointLight({ color: vec3(1, 0, 0), distance: 5 });
    pl.position = vec3(3, 0, 0);
    scene.addChild(pl);
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should handle scene with more than 4 directional lights gracefully', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    for (let i = 0; i < 6; i++) {
      scene.addChild(new DirectionalLight(vec3(1, 1, 1), 0.3, vec3(0, -1, 0)));
    }
    scene.addChild(makePhongCube());

    // Should not throw — excess lights silently clamped
    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should handle scene with more than 4 point lights gracefully', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new AmbientLight());
    for (let i = 0; i < 6; i++) {
      const pl = new PointLight({ distance: 10 });
      pl.position = vec3(i, 0, 0);
      scene.addChild(pl);
    }
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should produce draw calls for PhongMaterial mesh with point light', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new AmbientLight());
    const pl = new PointLight({ color: vec3(1, 1, 1), distance: 10 });
    pl.position = vec3(0, 2, 0);
    scene.addChild(pl);
    scene.addChild(makePhongCube());

    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });
});

/* ── Renderer — point light nested in scene graph ─────────────── */

describeImpl('WebGLRenderer — nested lights', () => {
  it('should find lights nested under child nodes', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const group = new Node3D('light-group');
    group.addChild(new DirectionalLight(vec3(1, 1, 1), 1, vec3(0, -1, 0)));
    const pl = new PointLight({ distance: 8 });
    pl.position = vec3(1, 1, 1);
    group.addChild(pl);
    scene.addChild(group);
    scene.addChild(makePhongCube());

    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });
});
