/**
 * PostProcessor — 后处理管线。
 * 基于 ping-pong FBO 实现多 pass 效果链，内置灰度、模糊、泛光、色调映射四种效果。
 * @see test/unit/renderer/post-process.test.ts
 */

import { RenderTarget } from './render-target';
import { Texture } from './texture';

/* ── LINEARIZE_DEPTH_GLSL 辅助函数 ── */

/**
 * GLSL 函数：把 [0,1] 区间的非线性深度（从 depthTexture 采样得）转换为线性视图空间深度。
 * 调用方：DOFPass / SSAOPass / MotionBlurPass 在 fragment shader 中 #include。
 */
export const LINEARIZE_DEPTH_GLSL = `
float linearizeDepth(float d, float near, float far) {
  float z = d * 2.0 - 1.0;
  return (2.0 * near * far) / (far + near - z * (far - near));
}
`.trim();

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
  /** 可选：声明此 pass 需要 u_depthTexture（默认 false） */
  readonly usesDepth?: boolean;
}

/* ── 全屏四边形顶点着色器 ── */

const FULLSCREEN_VERT = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`.trim();

/* ── PostProcessor ── */

export class PostProcessor {
  /** 当前注册的 pass 列表（按添加顺序执行） */
  readonly passes: EffectPass[] = [];

  private _width = 0;
  private _height = 0;

  constructor(options?: { width?: number; height?: number }) {
    if (options?.width) this._width = options.width;
    if (options?.height) this._height = options.height;
  }

  // ping-pong 双缓冲 FBO
  private _fbos: (WebGLFramebuffer | null)[] = [null, null];
  private _textures: (WebGLTexture | null)[] = [null, null];
  // 全屏四边形 VBO
  private _vbo: WebGLBuffer | null = null;
  // 当前帧的深度纹理（由外部通过 setDepthTexture 注入）
  private _depthTexture: WebGLTexture | null = null;

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /** 添加一个 pass（可链式调用） */
  addPass(pass: EffectPass): this {
    this.passes.push(pass);
    return this;
  }

  /**
   * 设置当前帧场景渲染的深度纹理。
   * 当 EffectPass.usesDepth === true 时，PostProcessor 会将此纹理绑定到 texture unit 1，
   * 并在 program 上设置 uniform `u_depthTexture`。
   */
  setDepthTexture(tex: WebGLTexture | null): void {
    this._depthTexture = tex;
  }

  /** 按名称移除 pass（不存在时静默，可链式调用） */
  removePass(name: string): this {
    const idx = this.passes.findIndex(p => p.name === name);
    if (idx !== -1) this.passes.splice(idx, 1);
    return this;
  }

  /**
   * 初始化内部 FBO 和全屏四边形。
   * 必须在首次 render 前调用。
   */
  initialize(gl: WebGLRenderingContext, width: number, height: number): void {
    this._width = width;
    this._height = height;
    if (typeof gl.createFramebuffer !== 'function') return;
    this._setupFBOs(gl, width, height);
    this._setupQuad(gl);
  }

  /**
   * 依次执行所有 enabled 的 pass，从 inputTexture 读取，最终输出到默认 framebuffer。
   */
  render(gl: WebGLRenderingContext, inputTexture: WebGLTexture): void {
    if (typeof gl.createFramebuffer !== 'function') return;
    const enabledPasses = this.passes.filter(p => p.enabled);
    if (enabledPasses.length === 0) return;

    let srcTex = inputTexture;
    const lastIdx = enabledPasses.length - 1;

    for (let i = 0; i < enabledPasses.length; i++) {
      const pass = enabledPasses[i];
      const isLast = i === lastIdx;
      const dstFbo = isLast ? null : this._fbos[i % 2];
      const dstTex = isLast ? null : this._textures[i % 2];

      // 绑定目标 framebuffer（最后一个 pass 输出到屏幕）
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
      if (!isLast) {
        gl.viewport(0, 0, this._width, this._height);
      }

      // 编译 / 获取 shader program
      const prog = this._getOrCreateProgram(gl, pass);
      if (!prog) continue;
      gl.useProgram(prog);

      // 绑定输入纹理
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      const uTex = gl.getUniformLocation(prog, 'u_texture');
      if (uTex) gl.uniform1i(uTex, 0);

      // 设置纹素尺寸（供 blur/bloom 使用）
      const uTexelSize = gl.getUniformLocation(prog, 'u_texelSize');
      if (uTexelSize) {
        gl.uniform2f(uTexelSize, 1.0 / this._width, 1.0 / this._height);
      }

      // 若 pass 需要深度纹理，绑定到 unit 1
      this._bindDepthForPass(gl, pass, prog);

      // 由 pass 设置自定义 uniform
      pass.setUniforms(gl, prog);

      // 绘制全屏四边形
      this._drawQuad(gl, prog);

      // 下一个 pass 的输入是本次的输出纹理
      if (!isLast && dstTex) {
        srcTex = dstTex;
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** 调整内部 FBO 尺寸 */
  resize(gl: WebGLRenderingContext, width: number, height: number): void {
    this._width = width;
    this._height = height;
    if (typeof gl.deleteFramebuffer !== 'function') return;
    this._cleanupFBOs(gl);
    this._setupFBOs(gl, width, height);
  }

  /** 释放所有 GPU 资源 */
  dispose(gl: WebGLRenderingContext): void {
    if (typeof gl.deleteFramebuffer === 'function') {
      this._cleanupFBOs(gl);
    }
    if (this._vbo && typeof gl.deleteBuffer === 'function') {
      gl.deleteBuffer(this._vbo);
      this._vbo = null;
    }
  }

  // ── 私有辅助 ──

  /** 当 pass.usesDepth=true 且有深度纹理时，绑定到 unit 1 并设置 u_depthTexture uniform */
  _bindDepthForPass(gl: WebGLRenderingContext, pass: EffectPass, prog: WebGLProgram): void {
    if (pass.usesDepth && this._depthTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this._depthTexture);
      const loc = gl.getUniformLocation(prog, 'u_depthTexture');
      if (loc) gl.uniform1i(loc, 1);
    }
    gl.activeTexture(gl.TEXTURE0);
  }

  private _programCache = new Map<string, WebGLProgram>();

  private _getOrCreateProgram(gl: WebGLRenderingContext, pass: EffectPass): WebGLProgram | null {
    if (this._programCache.has(pass.name)) {
      return this._programCache.get(pass.name)!;
    }
    const prog = this._compileProgram(gl, FULLSCREEN_VERT, pass.getFragmentShader());
    if (prog) this._programCache.set(pass.name, prog);
    return prog;
  }

  private _compileProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram | null {
    const vs = this._compileShader(gl, gl.VERTEX_SHADER, vert);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    return prog;
  }

  private _compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private _setupFBOs(gl: WebGLRenderingContext, width: number, height: number): void {
    for (let i = 0; i < 2; i++) {
      const fbo = gl.createFramebuffer();
      const tex = gl.createTexture();
      if (!fbo || !tex) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this._fbos[i] = fbo;
      this._textures[i] = tex;
    }
  }

  private _cleanupFBOs(gl: WebGLRenderingContext): void {
    for (let i = 0; i < 2; i++) {
      if (this._fbos[i]) { gl.deleteFramebuffer(this._fbos[i]); this._fbos[i] = null; }
      if (this._textures[i]) { gl.deleteTexture(this._textures[i]); this._textures[i] = null; }
    }
  }

  private _setupQuad(gl: WebGLRenderingContext): void {
    if (typeof gl.createBuffer !== 'function') return;
    // 全屏四边形：2 个三角形，覆盖 NDC [-1,1]^2
    // layout: position(x,y), texCoord(u,v)
    const data = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
       1, -1,  1, 0,
       1,  1,  1, 1,
      -1,  1,  0, 1,
    ]);
    const buf = gl.createBuffer();
    if (!buf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this._vbo = buf;
  }

  private _drawQuad(gl: WebGLRenderingContext, prog: WebGLProgram): void {
    if (!this._vbo) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    const STRIDE = 4 * 4; // 4 floats * 4 bytes
    const aPos = gl.getAttribLocation(prog, 'a_position');
    const aTex = gl.getAttribLocation(prog, 'a_texCoord');
    if (aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);
    }
    if (aTex >= 0) {
      gl.enableVertexAttribArray(aTex);
      gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, STRIDE, 2 * 4);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

/* ── 内置 EffectPass 实现 ── */

/** 灰度化效果：使用亮度公式 dot(rgb, vec3(0.299, 0.587, 0.114)) */
export class GrayscalePass implements EffectPass {
  readonly name = 'grayscale';
  enabled = true;

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(vec3(gray), color.a);
}
`.trim();
  }

  setUniforms(_gl: WebGLRenderingContext, _program: WebGLProgram): void {
    // 灰度化无额外 uniform
  }

  apply(_gl: WebGLRenderingContext, _input: WebGLTexture, _output: RenderTarget | null): void {
    // 由 PostProcessor.render 驱动，此方法保留供外部直接调用
  }
}

/** 高斯模糊效果：5-tap 高斯核双向采样 */
export class BlurPass implements EffectPass {
  readonly name = 'blur';
  enabled = true;
  /** 模糊半径（像素），默认 2.0 */
  radius: number;

  constructor(radius = 2.0) {
    this.radius = radius;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_radius;
uniform vec2 u_texelSize;
varying vec2 v_texCoord;
void main() {
  vec2 off = u_texelSize * u_radius;
  vec4 sum = vec4(0.0);
  // 水平 5-tap 高斯核
  sum += texture2D(u_texture, v_texCoord + vec2(-2.0 * off.x, 0.0)) * 0.0625;
  sum += texture2D(u_texture, v_texCoord + vec2(-1.0 * off.x, 0.0)) * 0.25;
  sum += texture2D(u_texture, v_texCoord) * 0.375;
  sum += texture2D(u_texture, v_texCoord + vec2(1.0 * off.x, 0.0)) * 0.25;
  sum += texture2D(u_texture, v_texCoord + vec2(2.0 * off.x, 0.0)) * 0.0625;
  // 垂直 5-tap 高斯核
  sum += texture2D(u_texture, v_texCoord + vec2(0.0, -2.0 * off.y)) * 0.0625;
  sum += texture2D(u_texture, v_texCoord + vec2(0.0, -1.0 * off.y)) * 0.25;
  sum += texture2D(u_texture, v_texCoord + vec2(0.0,  1.0 * off.y)) * 0.25;
  sum += texture2D(u_texture, v_texCoord + vec2(0.0,  2.0 * off.y)) * 0.0625;
  gl_FragColor = sum / 2.0;
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uRadius = gl.getUniformLocation(program, 'u_radius');
    if (uRadius) gl.uniform1f(uRadius, this.radius);
  }
}

/** 泛光效果：亮度阈值提取 → 模糊 → 与原图叠加 */
export class BloomPass implements EffectPass {
  readonly name = 'bloom';
  enabled = true;
  /** 亮度提取阈值，默认 0.8 */
  threshold: number;
  /** 泛光强度，默认 1.0 */
  intensity: number;

  constructor(
    thresholdOrOpts: number | { threshold?: number; intensity?: number } = 0.8,
    intensity = 1.0,
  ) {
    if (typeof thresholdOrOpts === 'object') {
      this.threshold = thresholdOrOpts.threshold ?? 0.8;
      this.intensity = thresholdOrOpts.intensity ?? 1.0;
    } else {
      this.threshold = thresholdOrOpts;
      this.intensity = intensity;
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_threshold;
uniform float u_intensity;
uniform vec2 u_texelSize;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  // 阈值提取高亮区域（smoothstep 柔化边界）
  float factor = smoothstep(u_threshold - 0.05, u_threshold + 0.05, brightness);
  // 对高亮区域进行简单 blur 叠加
  vec2 off = u_texelSize * 2.0;
  vec4 bloom = color * factor;
  bloom += texture2D(u_texture, v_texCoord + vec2( off.x,  0.0)) * factor;
  bloom += texture2D(u_texture, v_texCoord + vec2(-off.x,  0.0)) * factor;
  bloom += texture2D(u_texture, v_texCoord + vec2( 0.0,  off.y)) * factor;
  bloom += texture2D(u_texture, v_texCoord + vec2( 0.0, -off.y)) * factor;
  bloom /= 5.0;
  gl_FragColor = color + bloom * u_intensity;
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uThreshold = gl.getUniformLocation(program, 'u_threshold');
    if (uThreshold) gl.uniform1f(uThreshold, this.threshold);
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }

  apply(_gl: WebGLRenderingContext, _input: WebGLTexture, _output: RenderTarget | null): void {
    // 由 PostProcessor.render 驱动，此方法保留供外部直接调用
  }
}

/* ── TonemapPass ── */

export type TonemapMode = 'aces' | 'reinhard';

export interface TonemapOptions {
  /** 色调映射算法，默认 'aces' */
  mode?: TonemapMode;
  /** 曝光增益，在 tonemap 前乘到颜色上，默认 1.0 */
  exposure?: number;
}

/** ACES Filmic Tonemapping（Narkowicz 2015 简化版）+ Reinhard 双模式色调映射后处理 */
export class TonemapPass implements EffectPass {
  readonly name = 'tonemap';
  enabled = true;
  readonly mode: TonemapMode;
  exposure: number;

  constructor(opts?: TonemapOptions) {
    this.mode = opts?.mode ?? 'aces';
    this.exposure = opts?.exposure ?? 1.0;
  }

  getFragmentShader(): string {
    if (this.mode === 'aces') {
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_exposure;
varying vec2 v_texCoord;
vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec4 tex = texture2D(u_texture, v_texCoord);
  vec3 color = tex.rgb * u_exposure;
  gl_FragColor = vec4(aces(color), tex.a);
}
`.trim();
    }
    // reinhard
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_exposure;
varying vec2 v_texCoord;
void main() {
  vec4 tex = texture2D(u_texture, v_texCoord);
  vec3 color = tex.rgb * u_exposure;
  color = color / (color + vec3(1.0));
  gl_FragColor = vec4(color, tex.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uExposure = gl.getUniformLocation(program, 'u_exposure');
    if (uExposure) gl.uniform1f(uExposure, this.exposure);
  }

  apply(_gl: WebGLRenderingContext, _input: WebGLTexture, _output: RenderTarget | null): void {
    // 由 PostProcessor.render 驱动，此方法保留供外部直接调用
  }
}

/* ── VignetteOptions ── */

export interface VignetteOptions {
  /** 内半径：dist <= 此值时不变暗。默认 0.4 */
  innerRadius?: number;
  /** 外半径：dist >= 此值时变最暗。默认 0.8 */
  outerRadius?: number;
  /** 暗角强度：0=无, 1=四角全黑。默认 0.6 */
  intensity?: number;
}

/** 屏幕暗角效果：径向 smoothstep 衰减，营造电影感聚焦中心 */
export class VignettePass implements EffectPass {
  readonly name = 'vignette';
  enabled = true;
  innerRadius: number;
  outerRadius: number;
  intensity: number;

  constructor(options?: VignetteOptions) {
    const inner = options?.innerRadius ?? 0.4;
    const outer = options?.outerRadius ?? 0.8;
    const intensity = options?.intensity ?? 0.6;

    if (inner >= outer) {
      throw new Error(`VignettePass: innerRadius (${inner}) 必须小于 outerRadius (${outer})`);
    }
    if (intensity < 0 || intensity > 1) {
      throw new Error(`VignettePass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.innerRadius = inner;
    this.outerRadius = outer;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_innerRadius;
uniform float u_outerRadius;
uniform float u_intensity;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec2 center = vec2(0.5);
  float dist = distance(v_texCoord, center);
  float vignette = 1.0 - smoothstep(u_innerRadius, u_outerRadius, dist) * u_intensity;
  gl_FragColor = vec4(color.rgb * vignette, color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uInner = gl.getUniformLocation(program, 'u_innerRadius');
    if (uInner) gl.uniform1f(uInner, this.innerRadius);
    const uOuter = gl.getUniformLocation(program, 'u_outerRadius');
    if (uOuter) gl.uniform1f(uOuter, this.outerRadius);
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }

  apply(gl: WebGLRenderingContext, _input: WebGLTexture, _output: WebGLFramebuffer | null): void {
    // apply 由外部 PostProcessor 调用时会走 render 路径
    // 此方法提供 duck-typing 兼容
    void gl;
  }
}

/* ── FilmGrainOptions ── */

export interface FilmGrainOptions {
  /** 颗粒强度 [0, 1]，默认 0.15 */
  intensity?: number;
  /** 时间种子，默认 0，每帧外部递增以避免颗粒图案静止 */
  time?: number;
}

/** 胶片颗粒噪声后处理：在最终输出上叠加伪随机噪声，模拟电影胶片颗粒感 */
export class FilmGrainPass implements EffectPass {
  readonly name = 'film-grain';
  enabled = true;
  intensity: number;
  time: number;

  constructor(options?: FilmGrainOptions) {
    const intensity = options?.intensity ?? 0.15;
    const time = options?.time ?? 0;

    if (!Number.isFinite(intensity)) {
      throw new Error(`FilmGrainPass: intensity (${intensity}) 必须是有限数值`);
    }
    if (intensity < 0 || intensity > 1) {
      throw new Error(`FilmGrainPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }
    if (!Number.isFinite(time)) {
      throw new Error(`FilmGrainPass: time (${time}) 必须是有限数值`);
    }
    if (time < 0) {
      throw new Error(`FilmGrainPass: time (${time}) 不能为负数`);
    }

    this.intensity = intensity;
    this.time = time;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_time;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float noise = fract(sin(dot(v_texCoord + u_time, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 grain = color.rgb + (noise - 0.5) * 2.0 * u_intensity;
  gl_FragColor = vec4(clamp(grain, 0.0, 1.0), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
    const uTime = gl.getUniformLocation(program, 'u_time');
    if (uTime) gl.uniform1f(uTime, this.time);
  }
}

/* ── ChromaticAberrationOptions ── */

export interface ChromaticAberrationOptions {
  /** R 通道水平偏移像素，默认 2.0 */
  redOffset?: number;
  /** B 通道水平偏移像素，默认 -2.0 */
  blueOffset?: number;
  /** 整体强度 [0, 1]，默认 1.0 */
  intensity?: number;
}

/** RGB 通道色差效果：模拟镜头色散，常用于赛博朋克 / 恐怖 / 动作风格 */
export class ChromaticAberrationPass implements EffectPass {
  readonly name = 'chromatic-aberration';
  enabled = true;
  redOffset: number;
  blueOffset: number;
  intensity: number;

  constructor(options?: ChromaticAberrationOptions) {
    const redOffset = options?.redOffset ?? 2.0;
    const blueOffset = options?.blueOffset ?? -2.0;
    const intensity = options?.intensity ?? 1.0;

    if (!Number.isFinite(redOffset)) {
      throw new Error(`ChromaticAberrationPass: redOffset (${redOffset}) 必须是有限数值`);
    }
    if (!Number.isFinite(blueOffset)) {
      throw new Error(`ChromaticAberrationPass: blueOffset (${blueOffset}) 必须是有限数值`);
    }
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
      throw new Error(`ChromaticAberrationPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.redOffset = redOffset;
    this.blueOffset = blueOffset;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_redOffset;
uniform float u_blueOffset;
uniform float u_intensity;
uniform vec2 u_texelSize;
varying vec2 v_texCoord;
void main() {
  vec2 redCoord = v_texCoord + vec2(u_redOffset * u_texelSize.x, 0.0);
  vec2 blueCoord = v_texCoord + vec2(u_blueOffset * u_texelSize.x, 0.0);
  float r = texture2D(u_texture, redCoord).r;
  vec4 base = texture2D(u_texture, v_texCoord);
  float g = base.g;
  float b = texture2D(u_texture, blueCoord).b;
  vec3 aberrated = vec3(r, g, b);
  gl_FragColor = vec4(mix(base.rgb, aberrated, u_intensity), base.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uRedOffset = gl.getUniformLocation(program, 'u_redOffset');
    if (uRedOffset) gl.uniform1f(uRedOffset, this.redOffset);
    const uBlueOffset = gl.getUniformLocation(program, 'u_blueOffset');
    if (uBlueOffset) gl.uniform1f(uBlueOffset, this.blueOffset);
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }
}
/* ── PixelateOptions ── */

export interface PixelateOptions {
  /** 像素块大小（单位：屏幕像素），默认 8，最小 1 */
  pixelSize?: number;
}

/** 像素化后处理：将屏幕划分为像素网格，每格统一采样，模拟复古像素游戏视觉 */
export class PixelatePass implements EffectPass {
  readonly name = 'pixelate';
  enabled = true;
  pixelSize: number;

  constructor(options?: PixelateOptions) {
    const pixelSize = options?.pixelSize ?? 8;

    if (!Number.isFinite(pixelSize)) {
      throw new Error(`PixelatePass: pixelSize (${pixelSize}) 必须是有限数值`);
    }
    if (pixelSize < 1) {
      throw new Error(`PixelatePass: pixelSize (${pixelSize}) 必须 >= 1`);
    }

    this.pixelSize = pixelSize;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_pixelSize;
uniform vec2 u_texelSize;
varying vec2 v_texCoord;
void main() {
  vec2 g = u_pixelSize * u_texelSize;
  vec2 q = floor(v_texCoord / g) * g + g * 0.5;
  gl_FragColor = texture2D(u_texture, q);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uPixelSize = gl.getUniformLocation(program, 'u_pixelSize');
    if (uPixelSize) gl.uniform1f(uPixelSize, this.pixelSize);
  }
}

/* ── FXAAOptions ── */

export interface FXAAOptions {
  /** 像素亮度对比阈值，默认 0.0625（建议 0.0313-0.0833） */
  edgeThreshold?: number;
  /** 最小边缘对比度阈值（绝对值），默认 0.0312 */
  edgeThresholdMin?: number;
  /** 子像素抗锯齿强度 [0, 1]，默认 0.75 */
  subpixelQuality?: number;
}

/** 快速近似抗锯齿（Timothy Lottes FXAA 3.11 简化版）：基于亮度对比消除锯齿边缘 */
export class FXAAPass implements EffectPass {
  readonly name = 'fxaa';
  enabled = true;
  edgeThreshold: number;
  edgeThresholdMin: number;
  subpixelQuality: number;
  texelSize: [number, number] = [0, 0];

  constructor(options?: FXAAOptions) {
    const edgeThreshold = options?.edgeThreshold ?? 0.0625;
    const edgeThresholdMin = options?.edgeThresholdMin ?? 0.0312;
    const subpixelQuality = options?.subpixelQuality ?? 0.75;

    if (edgeThreshold < 0 || edgeThreshold > 1) {
      throw new Error(`FXAAPass: edgeThreshold (${edgeThreshold}) 必须在 [0, 1] 范围内`);
    }
    if (edgeThresholdMin < 0) {
      throw new Error(`FXAAPass: edgeThresholdMin (${edgeThresholdMin}) 不能为负数`);
    }
    if (subpixelQuality < 0 || subpixelQuality > 1) {
      throw new Error(`FXAAPass: subpixelQuality (${subpixelQuality}) 必须在 [0, 1] 范围内`);
    }

    this.edgeThreshold = edgeThreshold;
    this.edgeThresholdMin = edgeThresholdMin;
    this.subpixelQuality = subpixelQuality;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_edgeThreshold;
uniform float u_edgeThresholdMin;
uniform float u_subpixelQuality;
varying vec2 v_texCoord;

float luma(vec3 rgb) {
  return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = v_texCoord;
  vec3 colorC = texture2D(u_texture, uv).rgb;
  float lumaC = luma(colorC);

  float lumaN = luma(texture2D(u_texture, uv + vec2( 0.0,  u_texelSize.y)).rgb);
  float lumaS = luma(texture2D(u_texture, uv + vec2( 0.0, -u_texelSize.y)).rgb);
  float lumaE = luma(texture2D(u_texture, uv + vec2( u_texelSize.x,  0.0)).rgb);
  float lumaW = luma(texture2D(u_texture, uv + vec2(-u_texelSize.x,  0.0)).rgb);

  float lumaMax = max(max(lumaN, lumaS), max(lumaE, max(lumaW, lumaC)));
  float lumaMin = min(min(lumaN, lumaS), min(lumaE, min(lumaW, lumaC)));
  float lumaRange = lumaMax - lumaMin;

  // 未达到阈值，直接输出原色
  if (lumaRange < max(u_edgeThresholdMin, lumaMax * u_edgeThreshold)) {
    gl_FragColor = vec4(colorC, 1.0);
    return;
  }

  // 水平 / 垂直梯度判断主方向
  float gradH = abs(lumaN - lumaS);
  float gradV = abs(lumaE - lumaW);
  bool isHorizontal = gradH >= gradV;

  vec2 stepDir = isHorizontal ? vec2(0.0, u_texelSize.y) : vec2(u_texelSize.x, 0.0);
  float lumaA = isHorizontal ? lumaN : lumaE;
  float lumaB = isHorizontal ? lumaS : lumaW;
  float gradA = abs(lumaA - lumaC);
  float gradB = abs(lumaB - lumaC);
  if (gradA < gradB) stepDir = -stepDir;

  // 子像素混合
  float lumaAvg = (lumaN + lumaS + lumaE + lumaW) * 0.25;
  float subpixelBlend = clamp(abs(lumaAvg - lumaC) / lumaRange, 0.0, 1.0);
  subpixelBlend = subpixelBlend * subpixelBlend * u_subpixelQuality;

  vec3 colorBlend = texture2D(u_texture, uv + stepDir * 0.5).rgb;
  gl_FragColor = vec4(mix(colorC, colorBlend, subpixelBlend), 1.0);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uEdgeThreshold = gl.getUniformLocation(program, 'u_edgeThreshold');
    if (uEdgeThreshold) gl.uniform1f(uEdgeThreshold, this.edgeThreshold);
    const uEdgeThresholdMin = gl.getUniformLocation(program, 'u_edgeThresholdMin');
    if (uEdgeThresholdMin) gl.uniform1f(uEdgeThresholdMin, this.edgeThresholdMin);
    const uSubpixelQuality = gl.getUniformLocation(program, 'u_subpixelQuality');
    if (uSubpixelQuality) gl.uniform1f(uSubpixelQuality, this.subpixelQuality);
    const uTexelSize = gl.getUniformLocation(program, 'u_texelSize');
    if (uTexelSize) gl.uniform2f(uTexelSize, this.texelSize[0], this.texelSize[1]);
  }
}

/* ── OutlineOptions ── */

export interface OutlineOptions {
  /** 描边颜色 RGB，默认 [0, 0, 0]（黑色） */
  color?: [number, number, number];
  /** 描边粗细（采样步长倍数），范围 [0.5, 3]，默认 1.0 */
  thickness?: number;
  /** 亮度差异阈值 [0, 1]，超过该阈值判定为边缘，默认 0.1 */
  threshold?: number;
}

/** Sobel 边缘检测描边后处理：基于亮度梯度识别边缘并叠加描边色 */
export class OutlinePass implements EffectPass {
  readonly name = 'outline';
  enabled = true;
  color: [number, number, number];
  thickness: number;
  threshold: number;
  texelSize: [number, number] = [0, 0];

  constructor(options?: OutlineOptions) {
    const color = options?.color ?? [0, 0, 0];
    const thickness = options?.thickness ?? 1.0;
    const threshold = options?.threshold ?? 0.1;

    if (color.length !== 3) {
      throw new Error(`OutlinePass: color 必须是长度为 3 的数组`);
    }
    if (thickness < 0.5 || thickness > 3) {
      throw new Error(`OutlinePass: thickness (${thickness}) 必须在 [0.5, 3] 范围内`);
    }
    if (threshold < 0 || threshold > 1) {
      throw new Error(`OutlinePass: threshold (${threshold}) 必须在 [0, 1] 范围内`);
    }

    this.color = color;
    this.thickness = thickness;
    this.threshold = threshold;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform vec3 u_outlineColor;
uniform float u_thickness;
uniform float u_threshold;
varying vec2 v_texCoord;
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}
void main() {
  vec2 step = u_texelSize * u_thickness;
  float tl = luma(texture2D(u_texture, v_texCoord + vec2(-step.x,  step.y)).rgb);
  float tc = luma(texture2D(u_texture, v_texCoord + vec2(     0.0,  step.y)).rgb);
  float tr = luma(texture2D(u_texture, v_texCoord + vec2( step.x,  step.y)).rgb);
  float ml = luma(texture2D(u_texture, v_texCoord + vec2(-step.x,      0.0)).rgb);
  float mr = luma(texture2D(u_texture, v_texCoord + vec2( step.x,      0.0)).rgb);
  float bl = luma(texture2D(u_texture, v_texCoord + vec2(-step.x, -step.y)).rgb);
  float bc = luma(texture2D(u_texture, v_texCoord + vec2(     0.0, -step.y)).rgb);
  float br = luma(texture2D(u_texture, v_texCoord + vec2( step.x, -step.y)).rgb);
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
  float gradient = sqrt(gx * gx + gy * gy);
  vec4 base = texture2D(u_texture, v_texCoord);
  if (gradient > u_threshold) {
    gl_FragColor = vec4(u_outlineColor, base.a);
  } else {
    gl_FragColor = base;
  }
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uColor = gl.getUniformLocation(program, 'u_outlineColor');
    if (uColor) gl.uniform3f(uColor, this.color[0], this.color[1], this.color[2]);
    const uThickness = gl.getUniformLocation(program, 'u_thickness');
    if (uThickness) gl.uniform1f(uThickness, this.thickness);
    const uThreshold = gl.getUniformLocation(program, 'u_threshold');
    if (uThreshold) gl.uniform1f(uThreshold, this.threshold);
    const uTexelSize = gl.getUniformLocation(program, 'u_texelSize');
    if (uTexelSize) gl.uniform2f(uTexelSize, this.texelSize[0], this.texelSize[1]);
  }
}

/* ── SharpenOptions ── */

export interface SharpenOptions {
  /** 锐化强度 [0, 1]，默认 0.5。0 = 无锐化（原图），1 = 强锐化 */
  intensity?: number;
}

/** Laplacian 5-tap cross kernel 锐化后处理：提升图像细节清晰度 */
export class SharpenPass implements EffectPass {
  readonly name = 'sharpen';
  enabled = true;
  intensity: number;
  texelSize: [number, number] = [0, 0];

  constructor(options?: SharpenOptions) {
    const intensity = options?.intensity ?? 0.5;

    if (intensity < 0 || intensity > 1) {
      throw new Error(`SharpenPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_intensity;
varying vec2 v_texCoord;
void main() {
  vec4 center = texture2D(u_texture, v_texCoord);
  vec4 north  = texture2D(u_texture, v_texCoord + vec2( 0.0,  u_texelSize.y));
  vec4 south  = texture2D(u_texture, v_texCoord + vec2( 0.0, -u_texelSize.y));
  vec4 east   = texture2D(u_texture, v_texCoord + vec2( u_texelSize.x,  0.0));
  vec4 west   = texture2D(u_texture, v_texCoord + vec2(-u_texelSize.x,  0.0));
  // Laplacian 5-tap cross kernel: center + intensity * (5.0*center - N - S - E - W)
  vec4 laplacian = 5.0 * center - north - south - east - west;
  vec4 sharpened = center + u_intensity * laplacian;
  gl_FragColor = vec4(clamp(sharpened.rgb, 0.0, 1.0), center.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
    const uTexelSize = gl.getUniformLocation(program, 'u_texelSize');
    if (uTexelSize) gl.uniform2f(uTexelSize, this.texelSize[0], this.texelSize[1]);
  }
}

/* ── SepiaOptions ── */

export interface SepiaOptions {
  /** 强度 [0, 1]，0 = 原色, 1 = 完全 sepia，默认 1.0 */
  intensity?: number;
}

/** 复古棕褐色调色后处理：经典 sepia 矩阵变换，用 mix 融合原色与 sepia 色 */
export class SepiaPass implements EffectPass {
  readonly name = 'sepia';
  enabled = true;
  intensity: number;

  constructor(options?: SepiaOptions) {
    const intensity = options?.intensity ?? 1.0;

    if (intensity < 0 || intensity > 1) {
      throw new Error(`SepiaPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_intensity;
varying vec2 v_texCoord;
void main() {
  vec4 col = texture2D(u_texture, v_texCoord);
  float r = dot(col.rgb, vec3(0.393, 0.769, 0.189));
  float g = dot(col.rgb, vec3(0.349, 0.686, 0.168));
  float b = dot(col.rgb, vec3(0.272, 0.534, 0.131));
  vec3 sepia = vec3(r, g, b);
  vec3 final = mix(col.rgb, sepia, u_intensity);
  gl_FragColor = vec4(final, col.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }
}

/* ── SaturationOptions ── */

export interface SaturationOptions {
  /** 饱和度乘子 [0, 3]，0=灰度，1=原色（默认），2=过饱和 */
  saturation?: number;
}

/** 饱和度调整后处理：Rec. 709 luma-based desaturation，支持 0=灰度 / 1=原色 / 2=过饱和 */
export class SaturationPass implements EffectPass {
  readonly name = 'saturation';
  enabled = true;
  saturation: number;

  constructor(options?: SaturationOptions) {
    const saturation = options?.saturation ?? 1.0;

    if (saturation < 0 || saturation > 3) {
      throw new Error(`SaturationPass: saturation (${saturation}) 必须在 [0, 3] 范围内`);
    }

    this.saturation = saturation;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_saturation;
varying vec2 v_texCoord;
void main() {
  vec4 col = texture2D(u_texture, v_texCoord);
  float luma = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 gray = vec3(luma);
  vec3 final = mix(gray, col.rgb, u_saturation);
  gl_FragColor = vec4(final, col.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uSaturation = gl.getUniformLocation(program, 'u_saturation');
    if (uSaturation) gl.uniform1f(uSaturation, this.saturation);
  }
}

/* ── HueRotateOptions ── */

export interface HueRotateOptions {
  /** 色相旋转角度（弧度），-2π 到 2π，0 = 无变化。默认 0 */
  angle?: number;
  /** 饱和度保留因子 [0, 1]，控制旋转后是否保持饱和度。默认 1 */
  saturation?: number;
}

/** HSV 色相旋转后处理：通过 YIQ 色彩空间旋转矩阵实现快速色相偏移 */
export class HueRotatePass implements EffectPass {
  readonly name = 'hueRotate';
  enabled = true;
  angle: number;
  saturation: number;

  constructor(options?: HueRotateOptions) {
    const angle = options?.angle ?? 0;
    const saturation = options?.saturation ?? 1;

    if (angle < -Math.PI * 2 || angle > Math.PI * 2) {
      throw new Error(`HueRotatePass: angle (${angle}) 必须在 [-2π, 2π] 范围内`);
    }
    if (saturation < 0 || saturation > 1) {
      throw new Error(`HueRotatePass: saturation (${saturation}) 必须在 [0, 1] 范围内`);
    }

    this.angle = angle;
    this.saturation = saturation;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_angle;
uniform float u_saturation;
varying vec2 v_texCoord;
void main() {
  vec4 col = texture2D(u_texture, v_texCoord);
  float y = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  float i = dot(col.rgb, vec3(0.596, -0.274, -0.322));
  float q = dot(col.rgb, vec3(0.211, -0.523, 0.312));
  float c = cos(u_angle);
  float s = sin(u_angle);
  float iRot = c * i - s * q;
  float qRot = s * i + c * q;
  iRot *= u_saturation;
  qRot *= u_saturation;
  vec3 rgb = vec3(
    y + 0.956 * iRot + 0.621 * qRot,
    y - 0.272 * iRot - 0.647 * qRot,
    y - 1.106 * iRot + 1.703 * qRot
  );
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), col.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uAngle = gl.getUniformLocation(program, 'u_angle');
    if (uAngle) gl.uniform1f(uAngle, this.angle);
    const uSaturation = gl.getUniformLocation(program, 'u_saturation');
    if (uSaturation) gl.uniform1f(uSaturation, this.saturation);
  }
}

/* ── ContrastOptions ── */

export interface ContrastOptions {
  /** 对比度乘子 [0, 3]，1=原图（默认），<1 降低对比，>1 增加对比 */
  contrast?: number;
  /** 对比度中心（灰度参考点）[0, 1]，默认 0.5 */
  midpoint?: number;
}

/** 围绕 midpoint 缩放的对比度调整后处理 */
export class ContrastPass implements EffectPass {
  readonly name = 'contrast';
  enabled = true;
  contrast: number;
  midpoint: number;

  constructor(options?: ContrastOptions) {
    const contrast = options?.contrast ?? 1.0;
    const midpoint = options?.midpoint ?? 0.5;

    if (contrast < 0 || contrast > 3) {
      throw new Error(`ContrastPass: contrast (${contrast}) 必须在 [0, 3] 范围内`);
    }
    if (midpoint < 0 || midpoint > 1) {
      throw new Error(`ContrastPass: midpoint (${midpoint}) 必须在 [0, 1] 范围内`);
    }

    this.contrast = contrast;
    this.midpoint = midpoint;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_contrast;
uniform float u_midpoint;
varying vec2 v_texCoord;
void main() {
  vec4 col = texture2D(u_texture, v_texCoord);
  vec3 adjusted = (col.rgb - vec3(u_midpoint)) * u_contrast + vec3(u_midpoint);
  gl_FragColor = vec4(clamp(adjusted, 0.0, 1.0), col.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uContrast = gl.getUniformLocation(program, 'u_contrast');
    if (uContrast) gl.uniform1f(uContrast, this.contrast);
    const uMidpoint = gl.getUniformLocation(program, 'u_midpoint');
    if (uMidpoint) gl.uniform1f(uMidpoint, this.midpoint);
  }
}

/* ── ScanlineOptions ── */

export interface ScanlineOptions {
  /** 扫描线强度 [0, 1]，0=无效果，1=最强。默认 0.3 */
  intensity?: number;
  /** 扫描线密度（每像素几条线）[0.1, 10]，默认 1.0 */
  density?: number;
  /** 扫描线移动速度（时间相关），单位 px/s。默认 0 = 静态 */
  speed?: number;
  /** 当前时间（由 GameLoop 注入，用于动画）。默认 0 */
  time?: number;
}

/** CRT 扫描线复古后处理：模拟 CRT 显示器水平扫描线，适用于复古/retro wave 风格 */
export class ScanlinePass implements EffectPass {
  readonly name = 'scanline';
  enabled = true;
  intensity: number;
  density: number;
  speed: number;
  time: number;

  constructor(options?: ScanlineOptions) {
    const intensity = options?.intensity ?? 0.3;
    const density = options?.density ?? 1.0;
    const speed = options?.speed ?? 0;
    const time = options?.time ?? 0;

    if (intensity < 0 || intensity > 1) {
      throw new Error(`ScanlinePass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }
    if (density < 0.1 || density > 10) {
      throw new Error(`ScanlinePass: density (${density}) 必须在 [0.1, 10] 范围内`);
    }

    this.intensity = intensity;
    this.density = density;
    this.speed = speed;
    this.time = time;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_density;
uniform float u_speed;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;
void main() {
  vec4 col = texture2D(u_texture, v_texCoord);
  float y = gl_FragCoord.y + u_time * u_speed;
  float line = sin(y * u_density * 3.14159265) * 0.5 + 0.5;
  float dark = mix(1.0, line, u_intensity);
  gl_FragColor = vec4(col.rgb * dark, col.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
    const uDensity = gl.getUniformLocation(program, 'u_density');
    if (uDensity) gl.uniform1f(uDensity, this.density);
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    if (uSpeed) gl.uniform1f(uSpeed, this.speed);
    const uTime = gl.getUniformLocation(program, 'u_time');
    if (uTime) gl.uniform1f(uTime, this.time);
  }
}

/* ── LensDistortionOptions ── */

export interface LensDistortionOptions {
  /** 畸变强度 [-1, 1]，正值=桶形(barrel)，负值=枕形(pincushion)，0=无畸变。默认 0.3 */
  strength?: number;
  /** 高阶畸变系数 [-1, 1]，控制边缘畸变曲率。默认 0 */
  k2?: number;
  /** 色差偏移 [0, 0.05]，RGB 通道径向偏移模拟色散。默认 0 = 无色差 */
  chromaticAberration?: number;
}

/** 镜头畸变后处理：基于 r^2 + k2*r^4 径向畸变模型实现桶形/枕形畸变，支持色差模拟 */
export class LensDistortionPass implements EffectPass {
  readonly name = 'lensDistortion';
  enabled = true;
  strength: number;
  k2: number;
  chromaticAberration: number;

  constructor(options?: LensDistortionOptions) {
    const strength = options?.strength ?? 0.3;
    const k2 = options?.k2 ?? 0;
    const chromaticAberration = options?.chromaticAberration ?? 0;

    if (strength < -1 || strength > 1) {
      throw new Error(`LensDistortionPass: strength (${strength}) 必须在 [-1, 1] 范围内`);
    }
    if (k2 < -1 || k2 > 1) {
      throw new Error(`LensDistortionPass: k2 (${k2}) 必须在 [-1, 1] 范围内`);
    }
    if (chromaticAberration < 0 || chromaticAberration > 0.05) {
      throw new Error(`LensDistortionPass: chromaticAberration (${chromaticAberration}) 必须在 [0, 0.05] 范围内`);
    }

    this.strength = strength;
    this.k2 = k2;
    this.chromaticAberration = chromaticAberration;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_strength;
uniform float u_k2;
uniform float u_chromaticAberration;
varying vec2 v_texCoord;
void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 d = v_texCoord - center;
  float r2 = dot(d, d);
  float distortion = 1.0 + u_strength * r2 + u_k2 * r2 * r2;
  vec2 distorted = center + d * distortion;
  float r = texture2D(u_texture, center + d * (distortion + u_chromaticAberration)).r;
  float g = texture2D(u_texture, distorted).g;
  float b = texture2D(u_texture, center + d * (distortion - u_chromaticAberration)).b;
  float a = texture2D(u_texture, distorted).a;
  if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  } else {
    gl_FragColor = vec4(r, g, b, a);
  }
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uStrength = gl.getUniformLocation(program, 'u_strength');
    if (uStrength) gl.uniform1f(uStrength, this.strength);
    const uK2 = gl.getUniformLocation(program, 'u_k2');
    if (uK2) gl.uniform1f(uK2, this.k2);
    const uChromaticAberration = gl.getUniformLocation(program, 'u_chromaticAberration');
    if (uChromaticAberration) gl.uniform1f(uChromaticAberration, this.chromaticAberration);
  }
}

/* ── GammaPass ── */

/** sRGB gamma 校正后处理：线性空间转显示器空间（pre-display encoding）*/
export class GammaPass implements EffectPass {
  readonly name = 'gamma';
  enabled = true;
  /** Gamma 值。默认 2.2（sRGB 标准）。范围 [0.1, 5.0] */
  gamma: number;

  constructor(gammaOrOpts: number | { gamma?: number } = 2.2) {
    if (typeof gammaOrOpts === 'object') {
      this.gamma = gammaOrOpts.gamma ?? 2.2;
    } else {
      this.gamma = gammaOrOpts;
    }
    if (!isFinite(this.gamma) || this.gamma < 0.1 || this.gamma > 5.0) {
      throw new Error(`GammaPass: gamma must be in [0.1, 5.0], got ${this.gamma}`);
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_invGamma;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 corrected = pow(max(color.rgb, vec3(0.0)), vec3(u_invGamma));
  gl_FragColor = vec4(corrected, color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const loc = gl.getUniformLocation(program, 'u_invGamma');
    if (loc) gl.uniform1f(loc, 1.0 / this.gamma);
  }
}

/* ── ExposurePass ── */

/** EV stops 曝光补偿后处理：+1 stop = ×2 亮度，-1 stop = ÷2 亮度，CPU 侧预计算 pow(2, ev) */
export class ExposurePass implements EffectPass {
  readonly name = 'exposure';
  enabled = true;
  ev: number;

  constructor(evOrOpts: number | { ev?: number } = 0) {
    if (typeof evOrOpts === 'object') {
      this.ev = evOrOpts.ev ?? 0;
    } else {
      this.ev = evOrOpts;
    }
    if (!isFinite(this.ev) || this.ev < -5 || this.ev > 5) {
      throw new Error(`ExposurePass: ev must be in [-5, 5], got ${this.ev}`);
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_exposure;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  gl_FragColor = vec4(color.rgb * u_exposure, color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const loc = gl.getUniformLocation(program, 'u_exposure');
    if (loc) gl.uniform1f(loc, Math.pow(2.0, this.ev));
  }
}

/* ── WhiteBalancePass ── */

/** 色温白平衡后处理：补偿光源色温偏差，营造时段/天气氛围 */
export class WhiteBalancePass implements EffectPass {
  readonly name = 'whitebalance';
  enabled = true;
  /** 色温 Kelvin。默认 6500（中性）。范围 [1000, 20000] */
  temperature: number;
  /** 色调。负值偏绿/洋红，默认 0。范围 [-1, 1] */
  tint: number;

  constructor(opts: { temperature?: number; tint?: number } = {}) {
    this.temperature = opts.temperature ?? 6500;
    this.tint = opts.tint ?? 0;
    if (!isFinite(this.temperature) || this.temperature < 1000 || this.temperature > 20000) {
      throw new Error(`WhiteBalancePass: temperature must be in [1000, 20000], got ${this.temperature}`);
    }
    if (!isFinite(this.tint) || this.tint < -1 || this.tint > 1) {
      throw new Error(`WhiteBalancePass: tint must be in [-1, 1], got ${this.tint}`);
    }
  }

  private computeRGBMultiplier(): [number, number, number] {
    const t = this.temperature / 100;
    let r: number, g: number, b: number;
    if (t <= 66) {
      r = 1.0;
      g = Math.max(0, Math.min(1, (99.4708025861 * Math.log(t) - 161.1195681661) / 255));
      b = t <= 19 ? 0 : Math.max(0, Math.min(1, (138.5177312231 * Math.log(t - 10) - 305.0447927307) / 255));
    } else {
      r = Math.max(0, Math.min(1, (329.698727446 * Math.pow(t - 60, -0.1332047592)) / 255));
      g = Math.max(0, Math.min(1, (288.1221695283 * Math.pow(t - 60, -0.0755148492)) / 255));
      b = 1.0;
    }
    return [r, g, b];
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform vec3 u_balanceMul;
uniform float u_tint;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 balanced = color.rgb * u_balanceMul;
  balanced.g += u_tint * 0.1;
  balanced.r -= u_tint * 0.05;
  balanced.b -= u_tint * 0.05;
  gl_FragColor = vec4(clamp(balanced, 0.0, 1.0), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const [r, g, b] = this.computeRGBMultiplier();
    const mulLoc = gl.getUniformLocation(program, 'u_balanceMul');
    if (mulLoc) gl.uniform3f(mulLoc, r, g, b);
    const tintLoc = gl.getUniformLocation(program, 'u_tint');
    if (tintLoc) gl.uniform1f(tintLoc, this.tint);
  }
}

/* ── HighlightShadowPass ── */

export interface HighlightShadowOptions {
  /** 高光调整，[-1, 1]。正值提亮高光，负值压暗。默认 0 */
  highlights?: number;
  /** 阴影调整，[-1, 1]。正值提亮阴影，负值压暗。默认 0 */
  shadows?: number;
}

/** 高光/阴影分区调整：基于 Rec.709 luma mask 独立控制亮区和暗区 */
export class HighlightShadowPass implements EffectPass {
  readonly name = 'highlightShadow';
  enabled = true;
  highlights: number;
  shadows: number;

  constructor(options?: HighlightShadowOptions) {
    this.highlights = options?.highlights ?? 0;
    this.shadows = options?.shadows ?? 0;
    if (!isFinite(this.highlights) || this.highlights < -1 || this.highlights > 1) {
      throw new Error(`HighlightShadowPass: highlights must be in [-1, 1], got ${this.highlights}`);
    }
    if (!isFinite(this.shadows) || this.shadows < -1 || this.shadows > 1) {
      throw new Error(`HighlightShadowPass: shadows must be in [-1, 1], got ${this.shadows}`);
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_highlights;
uniform float u_shadows;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 rgb = color.rgb;
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float shadowMask = smoothstep(0.5, 0.0, luma);
  float highlightMask = smoothstep(0.5, 1.0, luma);
  rgb += u_shadows * shadowMask * 0.3;
  rgb += u_highlights * highlightMask * 0.3;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const hlLoc = gl.getUniformLocation(program, 'u_highlights');
    if (hlLoc) gl.uniform1f(hlLoc, this.highlights);
    const shLoc = gl.getUniformLocation(program, 'u_shadows');
    if (shLoc) gl.uniform1f(shLoc, this.shadows);
  }
}

/* ── LiftGammaGainPass ── */

export interface LiftGammaGainOptions {
  /** 阴影偏移 (lift)，每通道 [-1, 1]。默认 [0, 0, 0]（无偏移） */
  lift?: [number, number, number];
  /** 中间调曲线 (gamma)，每通道 [0.1, 5]。默认 [1, 1, 1]（线性） */
  gamma?: [number, number, number];
  /** 高光倍数 (gain)，每通道 [0, 5]。默认 [1, 1, 1]（恒等） */
  gain?: [number, number, number];
}

/** 三段调色后处理：分别控制阴影 lift、中间调 gamma、高光 gain（DaVinci Resolve 标准公式） */
export class LiftGammaGainPass implements EffectPass {
  readonly name = 'liftGammaGain';
  enabled = true;
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];

  constructor(options?: LiftGammaGainOptions) {
    this.lift = options?.lift ?? [0, 0, 0];
    this.gamma = options?.gamma ?? [1, 1, 1];
    this.gain = options?.gain ?? [1, 1, 1];

    for (let i = 0; i < 3; i++) {
      if (!isFinite(this.lift[i])) {
        throw new Error(`LiftGammaGainPass: lift[${i}] must be finite, got ${this.lift[i]}`);
      }
      if (this.lift[i] < -1 || this.lift[i] > 1) {
        throw new Error(`LiftGammaGainPass: lift[${i}] must be in [-1, 1], got ${this.lift[i]}`);
      }
      if (!isFinite(this.gamma[i])) {
        throw new Error(`LiftGammaGainPass: gamma[${i}] must be finite, got ${this.gamma[i]}`);
      }
      if (this.gamma[i] < 0.1 || this.gamma[i] > 5) {
        throw new Error(`LiftGammaGainPass: gamma[${i}] must be in [0.1, 5], got ${this.gamma[i]}`);
      }
      if (!isFinite(this.gain[i])) {
        throw new Error(`LiftGammaGainPass: gain[${i}] must be finite, got ${this.gain[i]}`);
      }
      if (this.gain[i] < 0 || this.gain[i] > 5) {
        throw new Error(`LiftGammaGainPass: gain[${i}] must be in [0, 5], got ${this.gain[i]}`);
      }
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec3 u_lift;
uniform vec3 u_gamma;
uniform vec3 u_gain;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 rgb = color.rgb;
  rgb = rgb + u_lift * (vec3(1.0) - rgb);
  rgb = rgb * u_gain;
  rgb = pow(max(rgb, vec3(0.0)), vec3(1.0) / max(u_gamma, vec3(0.01)));
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const liftLoc = gl.getUniformLocation(program, 'u_lift');
    if (liftLoc) gl.uniform3fv(liftLoc, this.lift);
    const gammaLoc = gl.getUniformLocation(program, 'u_gamma');
    if (gammaLoc) gl.uniform3fv(gammaLoc, this.gamma);
    const gainLoc = gl.getUniformLocation(program, 'u_gain');
    if (gainLoc) gl.uniform3fv(gainLoc, this.gain);
  }
}

/* ── PosterizeOptions ── */

export interface PosterizeOptions {
  /** 每通道量化等级数，整数 [2, 32]。默认 6 */
  levels?: number;
  /** 混合强度 [0, 1]。0=原图，1=完全量化。默认 1 */
  intensity?: number;
}

/** 色阶量化后处理：按固定 levels 量化 RGB 通道，产生漫画/赛璐璐/复古风格 */
export class PosterizePass implements EffectPass {
  readonly name = 'posterize';
  enabled = true;
  levels: number;
  intensity: number;

  constructor(options?: PosterizeOptions) {
    const levels = options?.levels ?? 6;
    const intensity = options?.intensity ?? 1;

    if (!Number.isFinite(levels)) {
      throw new Error(`PosterizePass: levels (${levels}) 必须是有限整数`);
    }
    if (!Number.isInteger(levels)) {
      throw new Error(`PosterizePass: levels (${levels}) 必须是整数`);
    }
    if (levels < 2 || levels > 32) {
      throw new Error(`PosterizePass: levels (${levels}) 必须在 [2, 32] 范围内`);
    }
    if (!Number.isFinite(intensity)) {
      throw new Error(`PosterizePass: intensity (${intensity}) 必须是有限数值`);
    }
    if (intensity < 0 || intensity > 1) {
      throw new Error(`PosterizePass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.levels = levels;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_levels;
uniform float u_intensity;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 quantized = floor(color.rgb * u_levels) / max(u_levels - 1.0, 1.0);
  gl_FragColor = vec4(mix(color.rgb, clamp(quantized, 0.0, 1.0), u_intensity), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uLevels = gl.getUniformLocation(program, 'u_levels');
    if (uLevels) gl.uniform1f(uLevels, this.levels);
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }
}

/* ── DOFPass ── */

export interface DOFOptions {
  /** 焦点距离（视图空间，单位米）— 处于此距离的物体最清晰。默认 5 */
  focusDistance?: number;
  /** 焦点范围 — 距 focusDistance 在此范围内仍清晰，超出开始模糊。默认 2，必须 > 0 */
  focusRange?: number;
  /** 最大模糊半径（屏幕像素）— CoC=1 处的采样半径。默认 4，范围 [0, 20] */
  blurRadius?: number;
  /** 相机近平面（用于 linearizeDepth）。默认 0.1 */
  near?: number;
  /** 相机远平面。默认 100，必须 > near */
  far?: number;
}

export class DOFPass implements EffectPass {
  readonly name = 'dof';
  enabled = true;
  readonly usesDepth = true;

  focusDistance: number;
  focusRange: number;
  blurRadius: number;
  near: number;
  far: number;

  constructor(opts: DOFOptions = {}) {
    this.focusDistance = opts.focusDistance ?? 5;
    this.focusRange = opts.focusRange ?? 2;
    this.blurRadius = opts.blurRadius ?? 4;
    this.near = opts.near ?? 0.1;
    this.far = opts.far ?? 100;

    if (!Number.isFinite(this.focusDistance)) throw new Error('DOFPass: focusDistance must be finite');
    if (!(this.focusRange > 0)) throw new Error('DOFPass: focusRange must be > 0');
    if (this.blurRadius < 0 || this.blurRadius > 20)
      throw new Error('DOFPass: blurRadius must be in [0, 20]');
    if (!(this.near > 0)) throw new Error('DOFPass: near must be > 0');
    if (!(this.far > this.near)) throw new Error('DOFPass: far must be > near');
  }

  getFragmentShader(): string {
    return `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;
uniform vec2 u_texelSize;
uniform float u_focusDistance;
uniform float u_focusRange;
uniform float u_blurRadius;
uniform float u_near;
uniform float u_far;
${LINEARIZE_DEPTH_GLSL}
void main() {
  float d = texture2D(u_depthTexture, v_texCoord).r;
  float linearD = linearizeDepth(d, u_near, u_far);
  float coc = clamp(abs(linearD - u_focusDistance) / u_focusRange, 0.0, 1.0);
  float r = u_blurRadius * coc;
  vec4 sum = vec4(0.0);
  float w = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 off = vec2(float(i), float(j)) * u_texelSize * r;
      sum += texture2D(u_texture, v_texCoord + off);
      w += 1.0;
    }
  }
  gl_FragColor = sum / w;
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const set = (name: string, v: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1f(loc, v);
    };
    set('u_focusDistance', this.focusDistance);
    set('u_focusRange', this.focusRange);
    set('u_blurRadius', this.blurRadius);
    set('u_near', this.near);
    set('u_far', this.far);
  }
}

/* ── ColorLUTPass ── */

export interface ColorLUTOptions {
  /** LUT 纹理，必须是 512×512（64³）tiled atlas 格式 */
  texture: Texture;
  /** 混合强度 0..1。0 = 原图，1 = 完全应用 LUT。默认 1 */
  intensity?: number;
}

/** 基于 Lookup Texture 的专业调色后处理：64³ LUT 展开为 512×512 tiled atlas（8×8 tiles） */
export class ColorLUTPass implements EffectPass {
  readonly name = 'colorLUT';
  enabled = true;
  texture: Texture;
  intensity: number;

  private _glTex: WebGLTexture | null = null;
  private _glTexVersion = -1;

  constructor(options: ColorLUTOptions) {
    if (options.texture == null) {
      throw new Error('ColorLUTPass: texture 不能为 null 或 undefined');
    }
    const intensity = options.intensity ?? 1;
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
      throw new Error(`ColorLUTPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }
    this.texture = options.texture;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    return `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform sampler2D u_lut;
uniform float u_intensity;

vec3 sampleLUT(vec3 color) {
  float blueIndex = color.b * 63.0;
  float blueLow = floor(blueIndex);
  float blueHigh = min(blueLow + 1.0, 63.0);
  float blueLerp = blueIndex - blueLow;

  vec2 quad;
  quad.y = floor(blueLow / 8.0);
  quad.x = blueLow - quad.y * 8.0;

  vec2 texPosLow;
  texPosLow.x = (quad.x * 64.0 + color.r * 63.0 + 0.5) / 512.0;
  texPosLow.y = (quad.y * 64.0 + color.g * 63.0 + 0.5) / 512.0;

  quad.y = floor(blueHigh / 8.0);
  quad.x = blueHigh - quad.y * 8.0;

  vec2 texPosHigh;
  texPosHigh.x = (quad.x * 64.0 + color.r * 63.0 + 0.5) / 512.0;
  texPosHigh.y = (quad.y * 64.0 + color.g * 63.0 + 0.5) / 512.0;

  vec3 lowColor = texture2D(u_lut, texPosLow).rgb;
  vec3 highColor = texture2D(u_lut, texPosHigh).rgb;
  return mix(lowColor, highColor, blueLerp);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 graded = sampleLUT(color.rgb);
  gl_FragColor = vec4(mix(color.rgb, graded, u_intensity), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    // 上传/更新 LUT 纹理到 GPU（按 version 缓存）
    if (!this._glTex || this._glTexVersion !== this.texture.version) {
      if (this._glTex) gl.deleteTexture(this._glTex);
      const tex = gl.createTexture();
      if (tex) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA,
          this.texture.width, this.texture.height, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, this.texture.data,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
      this._glTex = tex;
      this._glTexVersion = this.texture.version;
    }

    // 绑定 LUT 纹理到 texture unit 1（u_texture 已由 PostProcessor 绑定到 unit 0）
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._glTex);
    const uLut = gl.getUniformLocation(program, 'u_lut');
    if (uLut) gl.uniform1i(uLut, 1);

    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);

    gl.activeTexture(gl.TEXTURE0);
  }
}

/* ── VibrancePass ── */

export interface VibranceOptions {
  /** 自然饱和度调整，[-1, 1]。正值提升未饱和色，负值降低饱和。默认 0 */
  vibrance?: number;
}

/** 自然饱和度后处理：对未饱和色影响大、对已饱和色影响小（Lightroom Vibrance 业界标准） */
export class VibrancePass implements EffectPass {
  readonly name = 'vibrance';
  enabled = true;
  vibrance: number;

  constructor(options?: VibranceOptions) {
    this.vibrance = options?.vibrance ?? 0;
    if (!isFinite(this.vibrance)) {
      throw new Error(`VibrancePass: vibrance must be finite, got ${this.vibrance}`);
    }
    if (this.vibrance < -1 || this.vibrance > 1) {
      throw new Error(`VibrancePass: vibrance must be in [-1, 1], got ${this.vibrance}`);
    }
  }

  getFragmentShader(): string {
    return `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_vibrance;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 rgb = color.rgb;

  float maxC = max(max(rgb.r, rgb.g), rgb.b);
  float minC = min(min(rgb.r, rgb.g), rgb.b);
  float currentSat = maxC - minC;

  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));

  float weight = 1.0 - currentSat;

  vec3 adjusted = mix(vec3(luma), rgb, 1.0 + u_vibrance * weight);

  gl_FragColor = vec4(clamp(adjusted, 0.0, 1.0), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const loc = gl.getUniformLocation(program, 'u_vibrance');
    if (loc) gl.uniform1f(loc, this.vibrance);
  }
}

/* ── DitherOptions ── */

export type DitherMatrix = 'bayer4x4' | 'bayer8x8';

export interface DitherOptions {
  /** 抖动矩阵类型。bayer4x4 = 16 级阈值（粗），bayer8x8 = 64 级（细）。默认 'bayer4x4' */
  matrix?: DitherMatrix;
  /** 每通道量化等级数 [2, 16]，决定抖动后的最终色阶。默认 4 */
  levels?: number;
  /** 混合强度 0..1。默认 1 */
  intensity?: number;
}

/** Bayer 矩阵有序抖动后处理：通过 4×4 或 8×8 Bayer 矩阵比较像素亮度与阈值，
 *  把色阶压缩到 2-8 级同时保留视觉层次，适用于像素艺术 / Game Boy / 复古 8-bit 风格。
 */
export class DitherPass implements EffectPass {
  readonly name = 'dither';
  enabled = true;
  matrix: DitherMatrix;
  levels: number;
  intensity: number;

  constructor(options?: DitherOptions) {
    const matrix = options?.matrix ?? 'bayer4x4';
    const levels = options?.levels ?? 4;
    const intensity = options?.intensity ?? 1;

    if (matrix !== 'bayer4x4' && matrix !== 'bayer8x8') {
      throw new Error(`DitherPass: matrix ("${matrix}") 必须是 'bayer4x4' 或 'bayer8x8'`);
    }
    if (!Number.isFinite(levels) || !Number.isInteger(levels) || levels < 2 || levels > 16) {
      throw new Error(`DitherPass: levels (${levels}) 必须是 [2, 16] 范围内的整数`);
    }
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
      throw new Error(`DitherPass: intensity (${intensity}) 必须在 [0, 1] 范围内`);
    }

    this.matrix = matrix;
    this.levels = levels;
    this.intensity = intensity;
  }

  getFragmentShader(): string {
    if (this.matrix === 'bayer4x4') {
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_levels;
uniform float u_intensity;
varying vec2 v_texCoord;
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float fx = mod(gl_FragCoord.x, 4.0);
  float fy = mod(gl_FragCoord.y, 4.0);
  vec4 r0 = vec4( 0.0,  8.0,  2.0, 10.0);
  vec4 r1 = vec4(12.0,  4.0, 14.0,  6.0);
  vec4 r2 = vec4( 3.0, 11.0,  1.0,  9.0);
  vec4 r3 = vec4(15.0,  7.0, 13.0,  5.0);
  vec4 row;
  if      (fy < 1.0) row = r0;
  else if (fy < 2.0) row = r1;
  else if (fy < 3.0) row = r2;
  else               row = r3;
  float bval;
  if      (fx < 1.0) bval = row.x;
  else if (fx < 2.0) bval = row.y;
  else if (fx < 3.0) bval = row.z;
  else               bval = row.w;
  float threshold = bval / 16.0 - 0.5;
  vec3 dithered = floor(color.rgb * u_levels + threshold) / max(u_levels - 1.0, 1.0);
  dithered = clamp(dithered, 0.0, 1.0);
  gl_FragColor = vec4(mix(color.rgb, dithered, u_intensity), color.a);
}
`.trim();
    }
    // bayer8x8
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform float u_levels;
uniform float u_intensity;
varying vec2 v_texCoord;
float sel8(vec4 lo, vec4 hi, float x) {
  if      (x < 1.0) return lo.x;
  else if (x < 2.0) return lo.y;
  else if (x < 3.0) return lo.z;
  else if (x < 4.0) return lo.w;
  else if (x < 5.0) return hi.x;
  else if (x < 6.0) return hi.y;
  else if (x < 7.0) return hi.z;
  else               return hi.w;
}
void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  float fx = mod(gl_FragCoord.x, 8.0);
  float fy = mod(gl_FragCoord.y, 8.0);
  float bval;
  if      (fy < 1.0) bval = sel8(vec4( 0.,32., 8.,40.), vec4( 2.,34.,10.,42.), fx);
  else if (fy < 2.0) bval = sel8(vec4(48.,16.,56.,24.), vec4(50.,18.,58.,26.), fx);
  else if (fy < 3.0) bval = sel8(vec4(12.,44., 4.,36.), vec4(14.,46., 6.,38.), fx);
  else if (fy < 4.0) bval = sel8(vec4(60.,28.,52.,20.), vec4(62.,30.,54.,22.), fx);
  else if (fy < 5.0) bval = sel8(vec4( 3.,35.,11.,43.), vec4( 1.,33., 9.,41.), fx);
  else if (fy < 6.0) bval = sel8(vec4(51.,19.,59.,27.), vec4(49.,17.,57.,25.), fx);
  else if (fy < 7.0) bval = sel8(vec4(15.,47., 7.,39.), vec4(13.,45., 5.,37.), fx);
  else               bval = sel8(vec4(63.,31.,55.,23.), vec4(61.,29.,53.,21.), fx);
  float threshold = bval / 64.0 - 0.5;
  vec3 dithered = floor(color.rgb * u_levels + threshold) / max(u_levels - 1.0, 1.0);
  dithered = clamp(dithered, 0.0, 1.0);
  gl_FragColor = vec4(mix(color.rgb, dithered, u_intensity), color.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uLevels = gl.getUniformLocation(program, 'u_levels');
    if (uLevels) gl.uniform1f(uLevels, this.levels);
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    if (uIntensity) gl.uniform1f(uIntensity, this.intensity);
  }
}

/* ── SSAOOptions ── */

export interface SSAOOptions {
  /** 遮蔽强度（0=无 SSAO，1=标准，2=过曝）。默认 1，范围 [0, 5] */
  intensity?: number;
  /** 采样半径（视图空间，单位米）。默认 0.5，必须 > 0 */
  radius?: number;
  /** 自遮蔽偏移（避免精度问题导致表面自身被遮蔽）。默认 0.025，范围 [0, 0.1] */
  bias?: number;
  /** 相机近平面 */
  near?: number;
  /** 相机远平面，必须 > near */
  far?: number;
}

/** 屏幕空间环境光遮蔽后处理：通过采样邻域深度差估算遮蔽，让物体接触面与凹陷区域产生柔和阴影。 */
export class SSAOPass implements EffectPass {
  readonly name = 'ssao';
  enabled = true;
  readonly usesDepth = true;

  intensity: number;
  radius: number;
  bias: number;
  near: number;
  far: number;

  constructor(opts: SSAOOptions = {}) {
    this.intensity = opts.intensity ?? 1;
    this.radius = opts.radius ?? 0.5;
    this.bias = opts.bias ?? 0.025;
    this.near = opts.near ?? 0.1;
    this.far = opts.far ?? 100;

    if (this.intensity < 0 || this.intensity > 5)
      throw new Error('SSAOPass: intensity must be in [0, 5]');
    if (!(this.radius > 0)) throw new Error('SSAOPass: radius must be > 0');
    if (this.bias < 0 || this.bias > 0.1)
      throw new Error('SSAOPass: bias must be in [0, 0.1]');
    if (!(this.near > 0)) throw new Error('SSAOPass: near must be > 0');
    if (!(this.far > this.near)) throw new Error('SSAOPass: far must be > near');
  }

  getFragmentShader(): string {
    return `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      uniform sampler2D u_depthTexture;
      uniform vec2 u_texelSize;
      uniform float u_intensity;
      uniform float u_radius;
      uniform float u_bias;
      uniform float u_near;
      uniform float u_far;
      ${LINEARIZE_DEPTH_GLSL}
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        float centerDepth = linearizeDepth(texture2D(u_depthTexture, v_texCoord).r, u_near, u_far);
        // 8 个固定方向采样（圆形分布，WebGL 1.0 不支持随机数组 uniform）
        const int N = 8;
        vec2 dirs[8];
        dirs[0] = vec2( 1.0,  0.0);
        dirs[1] = vec2( 0.7,  0.7);
        dirs[2] = vec2( 0.0,  1.0);
        dirs[3] = vec2(-0.7,  0.7);
        dirs[4] = vec2(-1.0,  0.0);
        dirs[5] = vec2(-0.7, -0.7);
        dirs[6] = vec2( 0.0, -1.0);
        dirs[7] = vec2( 0.7, -0.7);
        float occlusion = 0.0;
        for (int i = 0; i < 8; i++) {
          vec2 sampleUV = v_texCoord + dirs[i] * u_texelSize * u_radius * 50.0;
          float sampleDepth = linearizeDepth(texture2D(u_depthTexture, sampleUV).r, u_near, u_far);
          // 若邻域深度比中心更近（前方挡住），算作遮蔽
          float diff = centerDepth - sampleDepth;
          if (diff > u_bias && diff < u_radius) {
            occlusion += 1.0;
          }
        }
        occlusion = 1.0 - (occlusion / float(N)) * u_intensity;
        gl_FragColor = vec4(color.rgb * occlusion, color.a);
      }
    `.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const set = (name: string, v: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1f(loc, v);
    };
    set('u_intensity', this.intensity);
    set('u_radius', this.radius);
    set('u_bias', this.bias);
    set('u_near', this.near);
    set('u_far', this.far);
  }
}

/* ── DepthFogOptions ── */

export interface DepthFogOptions {
  /** 雾色 RGB（0..1）。默认 [0.7, 0.7, 0.8]（蓝灰色）*/
  color?: [number, number, number];
  /** 雾密度，越大越浓。default 1。must be > 0 */
  density?: number;
  /** linear 模式起始距离。default 1。must be > 0 */
  near?: number;
  /** linear 模式终点距离。default 50。must be > near */
  far?: number;
  /** 雾衰减模式。'linear' / 'exp' / 'exp2'。default 'exp' */
  mode?: 'linear' | 'exp' | 'exp2';
}

/** 基于深度纹理的距离雾后处理 Pass。 */
export class DepthFogPass implements EffectPass {
  readonly name = 'depthFog';
  enabled = true;
  readonly usesDepth = true;

  color: [number, number, number];
  density: number;
  near: number;
  far: number;
  mode: 'linear' | 'exp' | 'exp2';

  constructor(opts?: DepthFogOptions) {
    const color = opts?.color ?? [0.7, 0.7, 0.8];
    const density = opts?.density ?? 1;
    const near = opts?.near ?? 1;
    const far = opts?.far ?? 50;
    const mode = opts?.mode ?? 'exp';

    if (!Array.isArray(color) || color.length !== 3)
      throw new Error('DepthFogPass: color 必须是 3 元素数组');
    if (!(density > 0))
      throw new Error('DepthFogPass: density 必须 > 0');
    if (!(near > 0))
      throw new Error('DepthFogPass: near 必须 > 0');
    if (!(far > near))
      throw new Error('DepthFogPass: far 必须 > near');
    if (mode !== 'linear' && mode !== 'exp' && mode !== 'exp2')
      throw new Error(`DepthFogPass: mode 必须是 'linear' | 'exp' | 'exp2'，得到 '${mode}'`);

    this.color = color;
    this.density = density;
    this.near = near;
    this.far = far;
    this.mode = mode;
  }

  getFragmentShader(): string {
    if (this.mode === 'linear') {
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;
uniform vec3 u_fogColor;
uniform float u_near;
uniform float u_far;
varying vec2 v_texCoord;
${LINEARIZE_DEPTH_GLSL}
void main() {
  vec4 srcColor = texture2D(u_texture, v_texCoord);
  float depth = linearizeDepth(texture2D(u_depthTexture, v_texCoord).r, u_near, u_far);
  float factor = clamp((depth - u_near) / (u_far - u_near), 0.0, 1.0);
  gl_FragColor = vec4(mix(srcColor.rgb, u_fogColor, factor), srcColor.a);
}
`.trim();
    }
    if (this.mode === 'exp') {
      return `
precision mediump float;
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;
uniform vec3 u_fogColor;
uniform float u_density;
uniform float u_near;
uniform float u_far;
varying vec2 v_texCoord;
${LINEARIZE_DEPTH_GLSL}
void main() {
  vec4 srcColor = texture2D(u_texture, v_texCoord);
  float depth = linearizeDepth(texture2D(u_depthTexture, v_texCoord).r, u_near, u_far);
  float factor = 1.0 - exp(-u_density * depth);
  gl_FragColor = vec4(mix(srcColor.rgb, u_fogColor, factor), srcColor.a);
}
`.trim();
    }
    // exp2
    return `
precision mediump float;
uniform sampler2D u_texture;
uniform sampler2D u_depthTexture;
uniform vec3 u_fogColor;
uniform float u_density;
uniform float u_near;
uniform float u_far;
varying vec2 v_texCoord;
${LINEARIZE_DEPTH_GLSL}
void main() {
  vec4 srcColor = texture2D(u_texture, v_texCoord);
  float depth = linearizeDepth(texture2D(u_depthTexture, v_texCoord).r, u_near, u_far);
  float factor = 1.0 - exp(-u_density * u_density * depth * depth);
  gl_FragColor = vec4(mix(srcColor.rgb, u_fogColor, factor), srcColor.a);
}
`.trim();
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const uFogColor = gl.getUniformLocation(program, 'u_fogColor');
    if (uFogColor) gl.uniform3f(uFogColor, this.color[0], this.color[1], this.color[2]);
    const uDensity = gl.getUniformLocation(program, 'u_density');
    if (uDensity) gl.uniform1f(uDensity, this.density);
    const uNear = gl.getUniformLocation(program, 'u_near');
    if (uNear) gl.uniform1f(uNear, this.near);
    const uFar = gl.getUniformLocation(program, 'u_far');
    if (uFar) gl.uniform1f(uFar, this.far);
  }
}
