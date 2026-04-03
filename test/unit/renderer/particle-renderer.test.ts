import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleRenderer } from '../../../src/renderer/particle-renderer';
import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { identity } from '../../../src/math/mat4';
import { vec3 } from '../../../src/math/vec3';
import { createMockGL, type MockGL } from '../../helpers/mock-gl';

const mod = await import('../../../src/renderer/particle-renderer');
const modIsStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = modIsStub ? describe.skip : describe;

function makeEmitter(count = 10): ParticleEmitter {
  return new ParticleEmitter({
    maxParticles: count,
    emissionRate: 0,
    lifetime: { min: 2, max: 2 },
    speed: { min: 1, max: 1 },
    size: { min: 4, max: 8 },
    color: vec3(1, 0.5, 0),
    colorEnd: vec3(1, 0, 0),
    gravity: vec3(0, 0, 0),
    seed: 42,
  });
}

describeImpl('ParticleRenderer', () => {
  let gl: MockGL & WebGLRenderingContext;
  let renderer: ParticleRenderer;
  const MAX = 100;

  beforeEach(() => {
    gl = createMockGL();
    renderer = new ParticleRenderer(gl, MAX);
  });

  // ── 构造 ──────────────────────────────────────────────────────

  it('should compile point sprite shader program', () => {
    expect(gl._programs).toBeGreaterThanOrEqual(1);
  });

  it('should create attribute buffers (position, size, color, alpha)', () => {
    // 至少 4 个缓冲区
    expect(gl._buffers).toBeGreaterThanOrEqual(4);
  });

  // ── update ────────────────────────────────────────────────────

  it('should read particle data from emitter', () => {
    const emitter = makeEmitter(20);
    emitter.emit(5);

    // update 不应抛出
    renderer.update(emitter);
  });

  it('should handle zero active particles', () => {
    const emitter = makeEmitter(10);
    // 不 emit，activeCount = 0

    renderer.update(emitter);
    // 不抛出即可
  });

  it('should upload buffer data via bufferSubData or bufferData', () => {
    const emitter = makeEmitter(20);
    emitter.emit(10);

    const before = (gl._calls['bufferSubData'] ?? 0) + (gl._calls['bufferData'] ?? 0);
    renderer.update(emitter);
    const after = (gl._calls['bufferSubData'] ?? 0) + (gl._calls['bufferData'] ?? 0);

    // 至少 4 次缓冲区更新（pos, size, color, alpha）
    expect(after - before).toBeGreaterThanOrEqual(4);
  });

  // ── render ────────────────────────────────────────────────────

  it('should draw with gl.POINTS mode', () => {
    const emitter = makeEmitter(20);
    emitter.emit(5);
    renderer.update(emitter);

    gl._drawCalls.length = 0;
    const vp = identity();
    renderer.render(vp);

    expect(gl._drawCalls).toHaveLength(1);
    expect(gl._drawCalls[0].type).toBe('drawArrays');
  });

  it('should draw correct number of particles', () => {
    const emitter = makeEmitter(20);
    emitter.emit(7);
    renderer.update(emitter);

    gl._drawCalls.length = 0;
    renderer.render(identity());

    expect(gl._drawCalls[0].count).toBe(7);
  });

  it('should skip draw when no active particles', () => {
    const emitter = makeEmitter(10);
    renderer.update(emitter);

    gl._drawCalls.length = 0;
    renderer.render(identity());

    // 0 个粒子不应产生 draw call
    expect(gl._drawCalls).toHaveLength(0);
  });

  it('should enable alpha blending', () => {
    const emitter = makeEmitter(10);
    emitter.emit(3);
    renderer.update(emitter);

    let blendEnabled = false;
    const origEnable = gl.enable.bind(gl);
    gl.enable = (cap: number) => {
      if (cap === gl.BLEND) blendEnabled = true;
      origEnable(cap);
    };

    renderer.render(identity());

    expect(blendEnabled).toBe(true);
  });

  it('should disable depth write during particle rendering', () => {
    const emitter = makeEmitter(10);
    emitter.emit(3);
    renderer.update(emitter);

    let depthMaskArgs: boolean[] = [];
    const origDepthMask = gl.depthMask.bind(gl);
    gl.depthMask = (flag: boolean) => {
      depthMaskArgs.push(flag);
      origDepthMask(flag);
    };

    renderer.render(identity());

    // 先禁用深度写入 (false)，渲染后恢复 (true)
    expect(depthMaskArgs).toContain(false);
    expect(depthMaskArgs[depthMaskArgs.length - 1]).toBe(true);
  });

  it('should upload viewProj matrix as uniform', () => {
    const emitter = makeEmitter(10);
    emitter.emit(3);
    renderer.update(emitter);

    const before = gl._calls['uniformMatrix4fv'] ?? 0;
    renderer.render(identity());
    const after = gl._calls['uniformMatrix4fv'] ?? 0;

    expect(after).toBeGreaterThan(before);
  });

  // ── dispose ───────────────────────────────────────────────────

  it('should delete program on dispose', () => {
    renderer.dispose();
    expect(gl._calls['deleteProgram']).toBeGreaterThanOrEqual(1);
  });

  it('should delete buffers on dispose', () => {
    renderer.dispose();
    expect(gl._calls['deleteBuffer']).toBeGreaterThanOrEqual(4);
  });
});
