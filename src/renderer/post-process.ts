/**
 * PostProcessor — 后处理管线。
 * 基于 ping-pong FBO 实现多 pass 效果链，内置灰度、模糊、泛光、色调映射四种效果。
 * @see test/unit/renderer/post-process.test.ts
 */

import { RenderTarget } from './render-target';

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

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /** 添加一个 pass（可链式调用） */
  addPass(pass: EffectPass): this {
    this.passes.push(pass);
    return this;
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
