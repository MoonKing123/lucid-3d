/**
 * WebGLRenderer 单元测试
 * 验证渲染器的构造、清屏、光源收集、场景遍历、材质分发和 GPU 资源缓存。
 * 依赖 test/helpers/mock-gl.ts 提供 mock WebGL 上下文。
 */
import { describe, it, expect } from 'vitest';
import * as mockGlMod from '../../helpers/mock-gl';

const isStub = '__STUB__' in mockGlMod && (mockGlMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

import { WebGLRenderer } from '../../src/renderer/webgl-renderer';
import { Scene } from '../../src/core/scene';
import { PerspectiveCamera } from '../../src/core/camera';
import { Mesh } from '../../src/renderer/mesh';
import { Material } from '../../src/renderer/material';
import { Geometry } from '../../src/renderer/geometry';
import { PhongMaterial } from '../../src/renderer/phong-material';
import { AmbientLight, DirectionalLight } from '../../src/core/light';
import { Node3D } from '../../src/core/node3d';

/* ── helpers ─────────────────────────────────────────────────────── */

function makeTriGeo(): Geometry {
  return new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
}

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
}

/* ── 构造 ────────────────────────────────────────────────────────── */

describeImpl('WebGLRenderer construction', () => {
  it('should throw if WebGL not supported', () => {
    const badCanvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => new WebGLRenderer(badCanvas)).toThrow('WebGL not supported');
  });

  it('should enable depth test on creation', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    new WebGLRenderer(canvas);
    expect(gl._calls['enable']).toBeGreaterThanOrEqual(1);
  });
});

/* ── 清屏 ────────────────────────────────────────────────────────── */

describeImpl('WebGLRenderer clear', () => {
  it('should clear with scene background color', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene({ background: [0.2, 0.3, 0.4] });
    renderer.render(scene, makeCamera());
    expect(gl._calls['clearColor']).toBeGreaterThanOrEqual(1);
    expect(gl._calls['clear']).toBeGreaterThanOrEqual(1);
  });
});

/* ── 光源收集 ──────────────────────────────────────────────────── */

describeImpl('WebGLRenderer light collection', () => {
  it('should render without throwing when scene has no lights', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
  });

  it('should upload light uniforms for PhongMaterial when lights present', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new AmbientLight([1, 1, 1], 0.3));
    scene.addChild(new DirectionalLight([1, 1, 1], 0.8, [0, -1, 0]));
    const geo = makeTriGeo();
    geo.normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    scene.addChild(new Mesh(geo, new PhongMaterial()));
    renderer.render(scene, makeCamera());
    // PhongMaterial 路径至少调用 uniform3fv 传递光源方向、颜色、环境色
    expect(gl._calls['uniform3fv']).toBeGreaterThanOrEqual(3);
  });
});

/* ── 场景遍历 ──────────────────────────────────────────────────── */

describeImpl('WebGLRenderer scene traversal', () => {
  it('should issue one draw call per Mesh', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const geo = makeTriGeo();
    const mat = new Material();
    scene.addChild(new Mesh(geo, mat));
    scene.addChild(new Mesh(geo, mat));
    scene.addChild(new Mesh(geo, mat));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(3);
  });

  it('should skip non-Mesh nodes in scene graph', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Node3D());           // plain node — no draw
    scene.addChild(new Mesh(makeTriGeo(), new Material()));  // 1 draw
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(1);
  });

  it('should draw children nested deep in the hierarchy', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const parent = new Node3D();
    const child = new Mesh(makeTriGeo(), new Material());
    parent.addChild(child);
    scene.addChild(parent);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(1);
  });
});

/* ── GPU 资源缓存 ──────────────────────────────────────────────── */

describeImpl('WebGLRenderer caching', () => {
  it('should compile shader program only once per Material instance', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const geo = makeTriGeo();
    const sharedMat = new Material();
    scene.addChild(new Mesh(geo, sharedMat));
    scene.addChild(new Mesh(geo, sharedMat));
    renderer.render(scene, makeCamera());
    expect(gl._programs).toBe(1);
  });

  it('should upload geometry buffers only once per Geometry instance', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const sharedGeo = makeTriGeo();
    const mat = new Material();
    scene.addChild(new Mesh(sharedGeo, mat));
    scene.addChild(new Mesh(sharedGeo, mat));
    renderer.render(scene, makeCamera());
    // createBuffer called twice for one geometry (position + color), not four
    expect(gl._buffers).toBe(2);
  });
});

/* ── Phong 材质分发 ────────────────────────────────────────────── */

describeImpl('WebGLRenderer PhongMaterial dispatch', () => {
  it('should upload normal matrix via uniformMatrix3fv for PhongMaterial', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const geo = makeTriGeo();
    geo.normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    scene.addChild(new Mesh(geo, new PhongMaterial()));
    renderer.render(scene, makeCamera());
    expect(gl._calls['uniformMatrix3fv']).toBeGreaterThanOrEqual(1);
  });
});

/* ── dispose ─────────────────────────────────────────────────────── */

describeImpl('WebGLRenderer dispose', () => {
  it('should not throw on dispose', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    expect(() => renderer.dispose()).not.toThrow();
  });
});
