/**
 * WebGLRenderer — ParticleEmitter 自动渲染集成测试
 */
import { describe, it, expect } from 'vitest';
import { createMockCanvas } from '../../helpers/mock-gl';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { vec3 } from '../../../src/math/vec3';

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
}

function makeTriGeo(): Geometry {
  return new Geometry({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    indices: new Uint16Array([0, 1, 2]),
  });
}

function makeEmitter(seed = 42): ParticleEmitter {
  const emitter = new ParticleEmitter({
    maxParticles: 10,
    emissionRate: 100,
    lifetime: { min: 1, max: 2 },
    speed: { min: 1, max: 2 },
    size: { min: 5, max: 10 },
    color: vec3(1, 1, 1),
    seed,
  });
  // Emit some particles so activeCount > 0
  emitter.update(0.1);
  return emitter;
}

describe('WebGLRenderer — particle auto-rendering', () => {
  it('should render particles when scene has ParticleEmitter', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeEmitter());
    renderer.render(scene, makeCamera());
    // At least one draw call for particles (gl.POINTS)
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should skip emitter with activeCount=0', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    // Create emitter but don't update (no particles emitted)
    const emitter = new ParticleEmitter({
      maxParticles: 10,
      emissionRate: 0,
      lifetime: { min: 1, max: 2 },
      speed: { min: 1, max: 2 },
      size: { min: 5, max: 10 },
      color: vec3(1, 1, 1),
    });
    scene.addChild(emitter);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should skip emitter with visible=false', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const emitter = makeEmitter();
    emitter.visible = false;
    scene.addChild(emitter);
    renderer.render(scene, makeCamera());
    expect(gl._drawCalls.length).toBe(0);
  });

  it('should handle multiple emitters in one scene', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(makeEmitter(1));
    scene.addChild(makeEmitter(2));
    renderer.render(scene, makeCamera());
    // 2 draw calls, one per emitter
    expect(gl._drawCalls.length).toBe(2);
  });

  it('should render particles AFTER meshes', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new Material()));
    scene.addChild(makeEmitter());
    renderer.render(scene, makeCamera());
    // Mesh draw first, particle draw second
    expect(gl._drawCalls.length).toBe(2);
    // Mesh uses drawElements (indexed), particles use drawArrays (POINTS)
    expect(gl._drawCalls[0].type).toBe('drawElements');
    expect(gl._drawCalls[1].type).toBe('drawArrays');
  });

  it('should render ParticleEmitter nested as child of Mesh', () => {
    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const mesh = new Mesh(makeTriGeo(), new Material());
    mesh.addChild(makeEmitter());
    scene.addChild(mesh);
    renderer.render(scene, makeCamera());
    // 1 mesh + 1 particle
    expect(gl._drawCalls.length).toBe(2);
  });
});
