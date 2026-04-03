/**
 * RenderTarget — 离屏渲染目标（FBO 封装）。
 * 用于阴影贴图、后处理等需要渲染到纹理的场景。
 * @see test/unit/renderer/render-target.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

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
  initialize(_gl: WebGLRenderingContext): void {
    // stub
  }

  /** 释放所有 GPU 资源 */
  dispose(_gl: WebGLRenderingContext): void {
    // stub
  }
}
