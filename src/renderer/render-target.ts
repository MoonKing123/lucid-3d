/**
 * RenderTarget — 离屏渲染目标（FBO 封装）。
 * 用于阴影贴图、后处理等需要渲染到纹理的场景。
 * @see test/unit/renderer/render-target.test.ts
 */

export interface RenderTargetOptions {
  width: number;
  height: number;
  /** 是否创建深度附件（默认 true） */
  depthBuffer?: boolean;
}

export class RenderTarget {
  readonly width: number;
  readonly height: number;
  readonly depthBuffer: boolean;

  /** WebGL framebuffer handle（初始化后非 null） */
  framebuffer: WebGLFramebuffer | null = null;
  /** 颜色纹理附件 */
  colorTexture: WebGLTexture | null = null;
  /** 深度渲染缓冲附件 */
  depthRenderbuffer: WebGLRenderbuffer | null = null;

  constructor(opts: RenderTargetOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.depthBuffer = opts.depthBuffer ?? true;
  }

  /**
   * 在 WebGL context 上创建并绑定 FBO 资源。
   * 必须在渲染循环外调用一次。
   */
  initialize(gl: WebGLRenderingContext): void {
    // 创建 Framebuffer
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Failed to create framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // 创建颜色纹理附件（RGBA, UNSIGNED_BYTE, NEAREST, CLAMP_TO_EDGE）
    const tex = gl.createTexture();
    if (!tex) throw new Error('Failed to create color texture');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    // 可选：创建深度渲染缓冲附件（DEPTH_COMPONENT16）
    let rbo: WebGLRenderbuffer | null = null;
    if (this.depthBuffer) {
      rbo = gl.createRenderbuffer();
      if (!rbo) throw new Error('Failed to create depth renderbuffer');
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbo);
    }

    // 验证 FBO 完整性
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
    }

    // 解绑，存储 handles
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.framebuffer = fbo;
    this.colorTexture = tex;
    this.depthRenderbuffer = rbo;
  }

  /** 释放所有 GPU 资源 */
  dispose(gl: WebGLRenderingContext): void {
    if (this.depthRenderbuffer) {
      gl.deleteRenderbuffer(this.depthRenderbuffer);
      this.depthRenderbuffer = null;
    }
    if (this.colorTexture) {
      gl.deleteTexture(this.colorTexture);
      this.colorTexture = null;
    }
    if (this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }
  }
}
