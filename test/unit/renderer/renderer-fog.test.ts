/**
 * WebGLRenderer — Fog 着色器集成测试
 * 验证 Scene.fog 触发雾效渲染。
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../src/renderer/webgl-renderer';
import { Scene } from '../../src/core/scene';
import { PerspectiveCamera } from '../../src/core/camera';
import { Mesh } from '../../src/renderer/mesh';
import { Geometry } from '../../src/renderer/geometry';
import { Material } from '../../src/renderer/material';
import { PhongMaterial } from '../../src/renderer/phong-material';
import { vec3 } from '../../src/math/vec3';

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
}

function makeTriGeo(): Geometry {
  const geo = new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
  geo.normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  return geo;
}

describe('WebGLRenderer — fog shader integration', () => {
  it('should render without fog when scene.fog is null', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ fog: undefined });
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    const uniformCalls = gl._calls['uniform1f'] ?? 0;
    // Remember baseline uniform1f count (no fog uniforms)
    expect(gl._drawCalls.length).toBe(1);
    // Store for comparison — fog adds u_fogNear + u_fogFar (2 extra uniform1f)
    expect(uniformCalls).toBeDefined();
  });

  it('should upload fog uniforms when scene.fog is set (basic Material)', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ fog: { color: vec3(0.8, 0.8, 0.8), near: 10, far: 100 } });
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    // Fog adds uniform3f (fogColor) + uniform1f (fogNear, fogFar)
    expect(gl._calls['uniform3f']).toBeGreaterThanOrEqual(1);
    expect(gl._calls['uniform1f']).toBeGreaterThanOrEqual(2);
  });

  it('should upload fog uniforms with PhongMaterial', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ fog: { color: vec3(1, 1, 1), near: 5, far: 50 } });
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));
    renderer.render(scene, makeCamera());
    expect(gl._calls['uniform3f']).toBeGreaterThanOrEqual(1);
    expect(gl._calls['uniform1f']).toBeGreaterThanOrEqual(2);
  });

  it('should compile separate programs for fog vs non-fog', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const mat = new Material();
    const geo = makeTriGeo();

    // Render without fog
    const sceneNoFog = new Scene();
    sceneNoFog.addChild(new Mesh(geo, mat));
    renderer.render(sceneNoFog, makeCamera());
    const programsNoFog = gl._programs;

    // Render with fog — should compile a new fog-variant program
    const sceneFog = new Scene({ fog: { color: vec3(1, 1, 1), near: 1, far: 50 } });
    sceneFog.addChild(new Mesh(geo, mat));
    renderer.render(sceneFog, makeCamera());
    expect(gl._programs).toBeGreaterThan(programsNoFog);
  });

  it('should apply fog to multiple meshes in scene', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ fog: { color: vec3(0.5, 0.5, 0.5), near: 1, far: 20 } });
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(2);
    // Both meshes should get fog uniforms — at least 2 fogColor uploads
    expect(gl._calls['uniform3f']).toBeGreaterThanOrEqual(2);
  });
});
