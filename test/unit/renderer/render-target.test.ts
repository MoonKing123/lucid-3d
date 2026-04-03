/**
 * RenderTarget (FBO) 测试
 * 验证离屏渲染目标的构造、参数校验和资源管理。
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/renderer/render-target';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- 构造 ---------- */

describeImpl('RenderTarget construction', () => {
  it('should store width and height', () => {
    const rt = new mod.RenderTarget({ width: 512, height: 512 });
    expect(rt.width).toBe(512);
    expect(rt.height).toBe(512);
  });

  it('should default depthBuffer to true', () => {
    const rt = new mod.RenderTarget({ width: 256, height: 256 });
    expect(rt.depthBuffer).toBe(true);
  });

  it('should accept depthBuffer=false', () => {
    const rt = new mod.RenderTarget({ width: 256, height: 256, depthBuffer: false });
    expect(rt.depthBuffer).toBe(false);
  });

  it('should have null GPU handles before initialize', () => {
    const rt = new mod.RenderTarget({ width: 128, height: 128 });
    expect(rt.framebuffer).toBeNull();
    expect(rt.colorTexture).toBeNull();
    expect(rt.depthRenderbuffer).toBeNull();
  });

  it('should support non-power-of-two dimensions', () => {
    const rt = new mod.RenderTarget({ width: 300, height: 200 });
    expect(rt.width).toBe(300);
    expect(rt.height).toBe(200);
  });
});

/* ---------- initialize（需要 WebGL context mock）---------- */

describeImpl('RenderTarget initialize', () => {
  function createMockGL() {
    const fbo = {};
    const tex = {};
    const rbo = {};
    return {
      createFramebuffer: () => fbo,
      createTexture: () => tex,
      createRenderbuffer: () => rbo,
      bindFramebuffer: () => {},
      bindTexture: () => {},
      bindRenderbuffer: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      renderbufferStorage: () => {},
      framebufferTexture2D: () => {},
      framebufferRenderbuffer: () => {},
      checkFramebufferStatus: () => 0x8CD5, // FRAMEBUFFER_COMPLETE
      TEXTURE_2D: 0x0DE1,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      TEXTURE_WRAP_S: 0x2802,
      TEXTURE_WRAP_T: 0x2803,
      NEAREST: 0x2600,
      CLAMP_TO_EDGE: 0x812F,
      FRAMEBUFFER: 0x8D40,
      COLOR_ATTACHMENT0: 0x8CE0,
      DEPTH_ATTACHMENT: 0x8D00,
      RENDERBUFFER: 0x8D41,
      DEPTH_COMPONENT16: 0x81A5,
      FRAMEBUFFER_COMPLETE: 0x8CD5,
      _fbo: fbo,
      _tex: tex,
      _rbo: rbo,
    };
  }

  it('should create FBO and color texture on initialize', () => {
    const rt = new mod.RenderTarget({ width: 512, height: 512 });
    const gl = createMockGL();
    rt.initialize(gl as unknown as WebGLRenderingContext);
    expect(rt.framebuffer).toBe(gl._fbo);
    expect(rt.colorTexture).toBe(gl._tex);
  });

  it('should create depth renderbuffer when depthBuffer=true', () => {
    const rt = new mod.RenderTarget({ width: 512, height: 512, depthBuffer: true });
    const gl = createMockGL();
    rt.initialize(gl as unknown as WebGLRenderingContext);
    expect(rt.depthRenderbuffer).toBe(gl._rbo);
  });

  it('should skip depth renderbuffer when depthBuffer=false', () => {
    const rt = new mod.RenderTarget({ width: 512, height: 512, depthBuffer: false });
    const gl = createMockGL();
    rt.initialize(gl as unknown as WebGLRenderingContext);
    expect(rt.depthRenderbuffer).toBeNull();
  });
});

/* ---------- dispose ---------- */

describeImpl('RenderTarget dispose', () => {
  it('should null out GPU handles after dispose', () => {
    const rt = new mod.RenderTarget({ width: 256, height: 256 });
    const gl = {
      createFramebuffer: () => ({}),
      createTexture: () => ({}),
      createRenderbuffer: () => ({}),
      bindFramebuffer: () => {},
      bindTexture: () => {},
      bindRenderbuffer: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      renderbufferStorage: () => {},
      framebufferTexture2D: () => {},
      framebufferRenderbuffer: () => {},
      checkFramebufferStatus: () => 0x8CD5,
      deleteFramebuffer: () => {},
      deleteTexture: () => {},
      deleteRenderbuffer: () => {},
      TEXTURE_2D: 0x0DE1,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      TEXTURE_WRAP_S: 0x2802,
      TEXTURE_WRAP_T: 0x2803,
      NEAREST: 0x2600,
      CLAMP_TO_EDGE: 0x812F,
      FRAMEBUFFER: 0x8D40,
      COLOR_ATTACHMENT0: 0x8CE0,
      DEPTH_ATTACHMENT: 0x8D00,
      RENDERBUFFER: 0x8D41,
      DEPTH_COMPONENT16: 0x81A5,
      FRAMEBUFFER_COMPLETE: 0x8CD5,
    };
    rt.initialize(gl as unknown as WebGLRenderingContext);
    rt.dispose(gl as unknown as WebGLRenderingContext);
    expect(rt.framebuffer).toBeNull();
    expect(rt.colorTexture).toBeNull();
  });
});
