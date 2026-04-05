/**
 * WebGLRenderer — Skybox 自动渲染集成测试
 * 验证 CubeTexture 背景触发 SkyboxRenderer 集成。
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../src/renderer/webgl-renderer';
import { Scene } from '../../src/core/scene';
import { PerspectiveCamera } from '../../src/core/camera';
import { CubeTexture } from '../../src/renderer/cube-texture';
import { Mesh } from '../../src/renderer/mesh';
import { Geometry } from '../../src/renderer/geometry';
import { Material } from '../../src/renderer/material';
import { vec3 } from '../../src/math/vec3';

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
}

function makeTriGeo(): Geometry {
  return new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
}

function makeCubeTexture(): CubeTexture {
  const ct = new CubeTexture(2);
  for (let i = 0; i < 6; i++) {
    ct.setFace(i as 0 | 1 | 2 | 3 | 4 | 5, new Uint8Array(2 * 2 * 4));
  }
  return ct;
}

describe('WebGLRenderer — skybox auto-rendering', () => {
  it('should render normally with Vec3 background (backward compat)', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ background: vec3(0.2, 0.3, 0.4) });
    renderer.render(scene, makeCamera());
    expect(gl._calls['clearColor']).toBeGreaterThanOrEqual(1);
    // No skybox draw call — only clear
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should render skybox when background is CubeTexture', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ background: makeCubeTexture() });
    renderer.render(scene, makeCamera());
    // Skybox fullscreen quad = 1 drawArrays call
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
    // depthMask should be toggled (off for skybox, back on after)
    expect(gl._calls['depthMask']).toBeGreaterThanOrEqual(1);
  });

  it('should render skybox BEFORE scene meshes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ background: makeCubeTexture() });
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(2);
    // First draw: skybox (drawArrays, 6 verts for fullscreen quad)
    expect(gl._drawCalls[0].type).toBe('drawArrays');
    expect(gl._drawCalls[0].count).toBe(6);
  });

  it('should accept CubeTexture in Scene constructor', () => {
    const ct = makeCubeTexture();
    const scene = new Scene({ background: ct });
    expect(scene.background).toBe(ct);
  });

  it('should lazily create skybox program (no extra programs without CubeTexture)', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    const basePrograms = gl._programs;
    // Switch to CubeTexture — should create skybox program
    scene.background = makeCubeTexture();
    renderer.render(scene, makeCamera());
    expect(gl._programs).toBeGreaterThan(basePrograms);
  });
});
