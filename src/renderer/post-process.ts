/**
 * PostProcessor — 后处理管线。
 * 管理 EffectPass 链，通过 ping-pong FBO 逐 pass 处理屏幕图像。
 * 内置 GrayscalePass、BlurPass、BloomPass。
 * @see test/unit/renderer/post-process.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

/* ── EffectPass 接口 ── */

export interface EffectPass {
  /** pass 唯一名称 */
  readonly name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 返回此 pass 的片元着色器 GLSL 源码 */
  getFragmentShader(): string;
  /** 设置 pass 特有的 uniform（在 render 前由 PostProcessor 调用） */
  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void;
}

/* ── PostProcessor ── */

export class PostProcessor {
  /** 当前注册的 pass 列表（按添加顺序执行） */
  readonly passes: EffectPass[] = [];

  private _width = 0;
  private _height = 0;

  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }

  /** 添加一个 pass（可链式调用） */
  addPass(_pass: EffectPass): this {
    return this;
  }

  /** 按名称移除 pass */
  removePass(_name: string): this {
    return this;
  }

  /**
   * 初始化内部 FBO 和全屏四边形 VAO。
   * 必须在首次 render 前调用。
   */
  initialize(_gl: WebGLRenderingContext, _width: number, _height: number): void {
    // stub
  }

  /**
   * 依次执行所有 enabled 的 pass，从 inputTexture 读取，最终输出到默认 framebuffer。
   */
  render(_gl: WebGLRenderingContext, _inputTexture: WebGLTexture): void {
    // stub
  }

  /** 调整内部 FBO 尺寸 */
  resize(_gl: WebGLRenderingContext, _width: number, _height: number): void {
    // stub
  }

  /** 释放所有 GPU 资源 */
  dispose(_gl: WebGLRenderingContext): void {
    // stub
  }
}

/* ── 内置 EffectPass 实现 ── */

/** 灰度化效果 */
export class GrayscalePass implements EffectPass {
  readonly name = 'grayscale';
  enabled = true;

  getFragmentShader(): string {
    return '';
  }

  setUniforms(_gl: WebGLRenderingContext, _program: WebGLProgram): void {
    // stub
  }
}

/** 高斯模糊效果 */
export class BlurPass implements EffectPass {
  readonly name = 'blur';
  enabled = true;
  /** 模糊半径（像素），默认 2.0 */
  radius: number;

  constructor(radius = 2.0) {
    this.radius = radius;
  }

  getFragmentShader(): string {
    return '';
  }

  setUniforms(_gl: WebGLRenderingContext, _program: WebGLProgram): void {
    // stub
  }
}

/** 泛光效果（亮度阈值 + 模糊 + 叠加） */
export class BloomPass implements EffectPass {
  readonly name = 'bloom';
  enabled = true;
  /** 亮度提取阈值，默认 0.8 */
  threshold: number;
  /** 泛光强度，默认 1.0 */
  intensity: number;

  constructor(threshold = 0.8, intensity = 1.0) {
    this.threshold = threshold;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return '';
  }

  setUniforms(_gl: WebGLRenderingContext, _program: WebGLProgram): void {
    // stub
  }
}
