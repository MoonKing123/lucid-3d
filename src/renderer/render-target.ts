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
  /** 是否将深度作为可采样纹理而非 renderbuffer（需 WEBGL_depth_texture 扩展，默认 false） */
  depthAsTexture?: boolean;
}

export class RenderTarget {
  readonly width: number;
  readonly height: number;
  readonly depthBuffer: boolean;
  readonly depthAsTexture: boolean;

  /** WebGL framebuffer handle（初始化后非 null） */
  framebuffer: WebGLFramebuffer | null = null;
  /** 颜色纹理附件 */
  colorTexture: WebGLTexture | null = null;
  /** 深度渲染缓冲附件（depthAsTexture=false 时使用） */
  depthRenderbuffer: WebGLRenderbuffer | null = null;
  /** 深度纹理附件（depthAsTexture=true 时使用，可在 shader 中采样） */
  depthTexture: WebGLTexture | null = null;

  constructor(opts: RenderTargetOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.depthBuffer = opts.depthBuffer ?? true;
    this.depthAsTexture = opts.depthAsTexture ?? false;
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

    // 可选：创建深度附件（renderbuffer 或 texture）
    let rbo: WebGLRenderbuffer | null = null;
    let depthTex: WebGLTexture | null = null;
    if (this.depthBuffer) {
      if (this.depthAsTexture) {
        const ext = gl.getExtension('WEBGL_depth_texture');
        if (!ext) throw new Error('WEBGL_depth_texture extension required for depthAsTexture');
        depthTex = gl.createTexture();
        if (!depthTex) throw new Error('Failed to create depth texture');
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
      } else {
        rbo = gl.createRenderbuffer();
        if (!rbo) throw new Error('Failed to create depth renderbuffer');
        gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbo);
      }
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
    this.depthTexture = depthTex;
  }

  /** 释放所有 GPU 资源 */
  dispose(gl: WebGLRenderingContext): void {
    if (this.depthRenderbuffer) {
      gl.deleteRenderbuffer(this.depthRenderbuffer);
      this.depthRenderbuffer = null;
    }
    if (this.depthTexture) {
      gl.deleteTexture(this.depthTexture);
      this.depthTexture = null;
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
