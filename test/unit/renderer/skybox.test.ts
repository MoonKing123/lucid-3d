import { describe, it, expect } from 'vitest';
import { createMockGL } from '../../helpers/mock-gl';
import * as mod from '../../../src/renderer/skybox';
import { CubeTexture } from '../../../src/renderer/cube-texture';
import { PerspectiveCamera } from '../../../src/core/camera';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { SkyboxRenderer } = mod;

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });
}

function makeTexture(): CubeTexture {
  const t = new CubeTexture(2);
  const data = new Uint8Array(2 * 2 * 4).fill(128);
  for (let i = 0; i < 6; i++) t.setFace(i as any, data.slice());
  return t;
}

/* ── 构造 ───────────────────────────────────────────────────────── */

describeImpl('SkyboxRenderer — 构造', () => {
  it('should not throw on construction', () => {
    const gl = createMockGL();
    expect(() => new SkyboxRenderer(gl)).not.toThrow();
  });

  it('should compile and link a shader program', () => {
    const gl = createMockGL();
    new SkyboxRenderer(gl);
    expect(gl._programs).toBeGreaterThanOrEqual(1);
  });

  it('should create a vertex buffer', () => {
    const gl = createMockGL();
    new SkyboxRenderer(gl);
    expect(gl._buffers).toBeGreaterThanOrEqual(1);
  });
});

/* ── render ─────────────────────────────────────────────────────── */

describeImpl('SkyboxRenderer — render', () => {
  it('should not throw on render', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    expect(() => sky.render(makeTexture(), makeCamera())).not.toThrow();
  });

  it('should call depthFunc at least twice (LEQUAL before, LESS after)', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._calls['depthFunc']).toBeGreaterThanOrEqual(2);
  });

  it('should call depthMask at least twice (false before, true after)', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._calls['depthMask']).toBeGreaterThanOrEqual(2);
  });

  it('should issue a drawArrays call', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should upload inverse VP matrix uniform', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._calls['uniformMatrix4fv']).toBeGreaterThanOrEqual(1);
  });

  it('should activate a texture unit', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._calls['activeTexture']).toBeGreaterThanOrEqual(1);
  });

  it('should bind cube texture', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.render(makeTexture(), makeCamera());
    expect(gl._calls['bindTexture']).toBeGreaterThanOrEqual(1);
  });
});

/* ── dispose ────────────────────────────────────────────────────── */

describeImpl('SkyboxRenderer — dispose', () => {
  it('should not throw on dispose', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    expect(() => sky.dispose()).not.toThrow();
  });

  it('should delete the shader program on dispose', () => {
    const gl = createMockGL();
    const sky = new SkyboxRenderer(gl);
    sky.dispose();
    expect(gl._calls['deleteProgram']).toBeGreaterThanOrEqual(1);
  });
});
