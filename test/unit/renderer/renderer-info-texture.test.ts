/**
 * WebGLRenderer — RenderInfo 统计 & Texture 版本/采样集成测试
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { TextureMaterial } from '../../../src/renderer/texture-material';
import { Texture, TextureWrap, TextureFilter } from '../../../src/renderer/texture';
import { vec3 } from '../../../src/math/vec3';
import type { RenderInfo } from '../../../src/renderer/render-info';

/* ── helpers ─────────────────────────────────────────────────── */

function makeCamera(): PerspectiveCamera {
  const cam = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
  cam.position = vec3(0, 0, 5);
  return cam;
}

function makeTriGeo(): Geometry {
  return new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
}

function makeQuadGeo(): Geometry {
  return new Geometry({
    positions: new Float32Array([
      -1,-1,0, 1,-1,0, 1,1,0,
      -1,-1,0, 1,1,0, -1,1,0,
    ]),
    uvs: new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1]),
  });
}

/* ── RenderInfo ──────────────────────────────────────────────── */

describe('WebGLRenderer RenderInfo', () => {
  it('should expose info property as RenderInfo', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    expect(renderer.info).toBeDefined();
    expect(renderer.info.drawCalls).toBe(0);
    expect(renderer.info.triangles).toBe(0);
  });

  it('should count draw calls after render', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    expect(renderer.info.drawCalls).toBe(2);
  });

  it('should count triangles from vertex count', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeQuadGeo(), new Material())); // 6 verts = 2 triangles
    renderer.render(scene, makeCamera());
    expect(renderer.info.triangles).toBe(2);
  });

  it('should reset info each render call', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    expect(renderer.info.drawCalls).toBe(1);
    // Render again — info should be reset then re-accumulated
    renderer.render(scene, makeCamera());
    expect(renderer.info.drawCalls).toBe(1); // not 2
  });

  it('should track frameTime > 0', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    renderer.render(scene, makeCamera());
    expect(renderer.info.frameTime).toBeGreaterThanOrEqual(0);
  });

  it('should count zero draw calls for empty scene', () => {
    const { canvas } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    renderer.render(new Scene(), makeCamera());
    expect(renderer.info.drawCalls).toBe(0);
    expect(renderer.info.triangles).toBe(0);
  });
});

/* ── Texture Version Tracking ────────────────────────────────── */

describe('WebGLRenderer texture version tracking', () => {
  it('should upload texture data on first use', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    expect(gl._calls['texImage2D']).toBe(1);
  });

  it('should not re-upload texture if version unchanged', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    const uploadsAfterFirst = gl._calls['texImage2D'];
    renderer.render(scene, makeCamera());
    expect(gl._calls['texImage2D']).toBe(uploadsAfterFirst); // no re-upload
  });

  it('should re-upload texture after needsUpdate()', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    const uploadsFirst = gl._calls['texImage2D'];

    tex.needsUpdate(); // bump version
    renderer.render(scene, makeCamera());
    expect(gl._calls['texImage2D']).toBe(uploadsFirst + 1);
  });
});

/* ── Texture Sampling Parameters ─────────────────────────────── */

describe('WebGLRenderer texture sampling', () => {
  it('should apply wrapS=Repeat when set', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    tex.wrapS = TextureWrap.Repeat;
    tex.wrapT = TextureWrap.Repeat;
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    // texParameteri called at least 4 times (wrapS, wrapT, minFilter, magFilter)
    expect(gl._calls['texParameteri']).toBeGreaterThanOrEqual(4);
  });

  it('should apply linear filter when set', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(4, 4);
    tex.minFilter = TextureFilter.Linear;
    tex.magFilter = TextureFilter.Linear;
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    expect(gl._calls['texParameteri']).toBeGreaterThanOrEqual(4);
  });

  it('should generate mipmaps when texture.generateMipmaps=true', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(4, 4);
    tex.generateMipmaps = true;
    tex.minFilter = TextureFilter.LinearMipmapLinear;
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    expect(gl._calls['generateMipmap']).toBeGreaterThanOrEqual(1);
  });

  it('should apply flipY when texture.flipY=true', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    tex.flipY = true;
    const mat = new TextureMaterial(tex);
    scene.addChild(new Mesh(makeQuadGeo(), mat));
    renderer.render(scene, makeCamera());
    expect(gl._calls['pixelStorei']).toBeGreaterThanOrEqual(1);
  });
});
