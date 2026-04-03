import { describe, it, expect, beforeEach } from 'vitest';
import { SkyboxRenderer } from '../../../src/renderer/skybox';
import { CubeTexture, CubeTextureFace } from '../../../src/renderer/cube-texture';
import { PerspectiveCamera } from '../../../src/core/camera';
import { createMockGL, type MockGL } from '../../helpers/mock-gl';

const mod = await import('../../../src/renderer/skybox');
const modIsStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = modIsStub ? describe.skip : describe;

/** 创建一个完整的 2×2 CubeTexture */
function makeCompleteCubeTexture(): CubeTexture {
  const ct = new CubeTexture(2);
  const bytes = 2 * 2 * 4; // RGBA
  for (let i = 0; i < 6; i++) {
    ct.setFace(i as any, new Uint8Array(bytes).fill(i * 40));
  }
  return ct;
}

describeImpl('SkyboxRenderer', () => {
  let gl: MockGL & WebGLRenderingContext;
  let skybox: SkyboxRenderer;

  beforeEach(() => {
    gl = createMockGL();
    skybox = new SkyboxRenderer(gl);
  });

  // ── 构造 ──────────────────────────────────────────────────────

  it('should compile shader program on construction', () => {
    expect(gl._programs).toBeGreaterThanOrEqual(1);
  });

  it('should create vertex buffer for full-screen quad', () => {
    expect(gl._buffers).toBeGreaterThanOrEqual(1);
  });

  // ── render ────────────────────────────────────────────────────

  it('should issue one draw call per render', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    gl._drawCalls.length = 0;
    skybox.render(texture, camera);

    expect(gl._drawCalls).toHaveLength(1);
  });

  it('should draw 6 vertices (full-screen quad as 2 triangles)', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    gl._drawCalls.length = 0;
    skybox.render(texture, camera);

    // 全屏四边形 = 2 个三角形 = 6 个顶点
    expect(gl._drawCalls[0].count).toBe(6);
  });

  it('should set depth function to LEQUAL', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    // 追踪 depthFunc 调用
    let depthFuncCalled = false;
    let depthFuncArg = 0;
    const origDepthFunc = gl.depthFunc.bind(gl);
    gl.depthFunc = (func: number) => {
      depthFuncCalled = true;
      depthFuncArg = func;
      origDepthFunc(func);
    };

    skybox.render(texture, camera);

    expect(depthFuncCalled).toBe(true);
    expect(depthFuncArg).toBe(gl.LEQUAL);
  });

  it('should disable depth write during skybox rendering', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    let depthMaskArgs: boolean[] = [];
    const origDepthMask = gl.depthMask.bind(gl);
    gl.depthMask = (flag: boolean) => {
      depthMaskArgs.push(flag);
      origDepthMask(flag);
    };

    skybox.render(texture, camera);

    // 应该先禁用 (false)，渲染后恢复 (true)
    expect(depthMaskArgs).toContain(false);
    expect(depthMaskArgs[depthMaskArgs.length - 1]).toBe(true);
  });

  it('should bind cube map texture', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    skybox.render(texture, camera);

    // 至少创建了一个纹理（cube map）
    expect(gl._textures).toBeGreaterThanOrEqual(1);
    expect(gl._calls['bindTexture']).toBeGreaterThanOrEqual(1);
  });

  it('should use the skybox shader program', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    skybox.render(texture, camera);

    expect(gl._calls['useProgram']).toBeGreaterThanOrEqual(1);
  });

  it('should upload inverse view-rotation matrix as uniform', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    camera.position = [0, 5, 10];
    camera.lookAt([0, 0, 0]);
    const texture = makeCompleteCubeTexture();

    skybox.render(texture, camera);

    // 至少上传了一个 mat4 uniform（inverse view-rotation）
    expect(gl._calls['uniformMatrix4fv']).toBeGreaterThanOrEqual(1);
  });

  // ── restore state ─────────────────────────────────────────────

  it('should restore depth function to LESS after render', () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    const texture = makeCompleteCubeTexture();

    let lastDepthFunc = 0;
    gl.depthFunc = (func: number) => { lastDepthFunc = func; };

    skybox.render(texture, camera);

    // 最后恢复为 LESS
    expect(lastDepthFunc).toBe(gl.LESS);
  });

  // ── dispose ───────────────────────────────────────────────────

  it('should delete program on dispose', () => {
    skybox.dispose();
    expect(gl._calls['deleteProgram']).toBeGreaterThanOrEqual(1);
  });

  it('should delete buffers on dispose', () => {
    skybox.dispose();
    expect(gl._calls['deleteBuffer']).toBeGreaterThanOrEqual(1);
  });
});
