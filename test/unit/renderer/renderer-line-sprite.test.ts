/**
 * WebGLRenderer — Line & Sprite 渲染集成测试
 * 验证 render() 自动渲染 Line 和 Sprite 节点。
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { Line, LineGeometry, LineMaterial } from '../../../src/renderer/line-renderer';
import { Sprite, SpriteMaterial } from '../../../src/renderer/sprite';
import { vec3 } from '../../../src/math/vec3';
import { Texture } from '../../../src/renderer/texture';

/* ── helpers ─────────────────────────────────────────────────── */

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
}

function makeTriGeo(): Geometry {
  return new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
}

function makeLine(mode: 'LINES' | 'LINE_STRIP' | 'LINE_LOOP' = 'LINES'): Line {
  const geo = new LineGeometry();
  geo.addPoint(vec3(0, 0, 0), vec3(1, 0, 0));
  geo.addPoint(vec3(1, 0, 0), vec3(0, 1, 0));
  geo.addPoint(vec3(1, 1, 0), vec3(0, 0, 1));
  geo.addPoint(vec3(0, 1, 0), vec3(1, 1, 0));
  return new Line(geo, new LineMaterial({ color: vec3(1, 0, 0) }), mode);
}

function makeSprite(): Sprite {
  return new Sprite(new SpriteMaterial({ color: vec3(0, 1, 0), opacity: 0.8 }));
}

/* ── Line rendering ──────────────────────────────────────────── */

describe('WebGLRenderer Line rendering', () => {
  it('should render a Line node in the scene', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeLine());
    renderer.render(scene, makeCamera());
    // At least one draw call for the line
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should issue drawArrays (not drawElements) for Lines', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeLine());
    renderer.render(scene, makeCamera());
    const lineDraws = gl._drawCalls.filter(d => d.type === 'drawArrays');
    expect(lineDraws.length).toBe(1);
    expect(lineDraws[0].count).toBe(4); // 4 vertices
  });

  it('should not render a Line with visible=false', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const line = makeLine();
    line.visible = false;
    scene.addChild(line);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should handle LINE_STRIP mode', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeLine('LINE_STRIP'));
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });
});

/* ── Sprite rendering ────────────────────────────────────────── */

describe('WebGLRenderer Sprite rendering', () => {
  it('should render a Sprite node in the scene', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeSprite());
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should enable blending for Sprites', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeSprite());
    renderer.render(scene, makeCamera());
    expect(gl._calls['enable']).toBeGreaterThanOrEqual(2); // DEPTH_TEST + BLEND
    expect(gl._calls['blendFunc'] || gl._calls['blendFuncSeparate']).toBeTruthy();
  });

  it('should not render a Sprite with visible=false', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const sprite = makeSprite();
    sprite.visible = false;
    scene.addChild(sprite);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should render Sprite with texture', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const tex = Texture.checkerboard(2, 2);
    const sprite = new Sprite(new SpriteMaterial({ texture: tex }));
    scene.addChild(sprite);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
    expect(gl._calls['bindTexture']).toBeGreaterThanOrEqual(1);
  });
});

/* ── Mixed scene ─────────────────────────────────────────────── */

describe('WebGLRenderer mixed scene (Mesh + Line + Sprite)', () => {
  it('should render all three types in one frame', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    scene.addChild(makeLine());
    scene.addChild(makeSprite());
    renderer.render(scene, makeCamera());
    // 3 draw calls minimum: 1 mesh + 1 line + 1 sprite
    expect(gl._drawCalls.length).toBe(3);
  });

  it('should render Lines and Sprites that are children of Mesh nodes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const parent = new Mesh(makeTriGeo(), new Material());
    parent.addChild(makeLine());
    parent.addChild(makeSprite());
    scene.addChild(parent);
    renderer.render(scene, makeCamera());
    // 3 draw calls: 1 mesh parent + 1 child line + 1 child sprite
    expect(gl._drawCalls.length).toBe(3);
  });
});
