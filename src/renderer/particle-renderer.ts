/**
 * ParticleRenderer — GPU 粒子点精灵渲染器。
 * 使用 gl.POINTS 原语和 gl_PointCoord 实现圆形点精灵。
 * 4 个独立顶点属性缓冲区：position、size、color、alpha。
 */

import { type Mat4 } from '../math/mat4';
import { type ParticleEmitter } from './particle-emitter';

// ── Shaders ──────────────────────────────────────────────────────

const VERT_SRC = `
  precision mediump float;
  attribute vec3 a_position;
  attribute float a_size;
  attribute vec3 a_color;
  attribute float a_alpha;
  uniform mat4 u_viewProj;
  varying vec3 v_color;
  varying float v_alpha;

  void main() {
    gl_Position = u_viewProj * vec4(a_position, 1.0);
    gl_PointSize = a_size;
    v_color = a_color;
    v_alpha = a_alpha;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec3 v_color;
  varying float v_alpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (length(coord) > 0.5) {
      discard;
    }
    gl_FragColor = vec4(v_color, v_alpha);
  }
`;

// ── ParticleRenderer ─────────────────────────────────────────────

export class ParticleRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;

  // 4 个独立顶点属性缓冲区
  private positionBuffer: WebGLBuffer;
  private sizeBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;
  private alphaBuffer: WebGLBuffer;

  // Attribute locations
  private aPosition: number;
  private aSize: number;
  private aColor: number;
  private aAlpha: number;

  // Uniform location
  private uViewProj: WebGLUniformLocation | null;

  private maxParticles: number;
  private activeCount: number = 0;
  private disposed: boolean = false;

  constructor(gl: WebGLRenderingContext, maxParticles: number) {
    this.gl = gl;
    this.maxParticles = maxParticles;

    // ── 编译 shader ──────────────────────────────────────────────
    const vs = this._compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.detachShader(program, vs);
    gl.detachShader(program, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`ParticleRenderer: shader 链接失败 — ${info}`);
    }

    this.program = program;

    // ── Attribute / uniform 位置 ─────────────────────────────────
    this.aPosition = gl.getAttribLocation(program, 'a_position');
    this.aSize     = gl.getAttribLocation(program, 'a_size');
    this.aColor    = gl.getAttribLocation(program, 'a_color');
    this.aAlpha    = gl.getAttribLocation(program, 'a_alpha');
    this.uViewProj = gl.getUniformLocation(program, 'u_viewProj');

    // ── 预分配 4 个独立缓冲区 ─────────────────────────────────────
    this.positionBuffer = this._allocBuffer(maxParticles * 3); // vec3
    this.sizeBuffer     = this._allocBuffer(maxParticles * 1); // float
    this.colorBuffer    = this._allocBuffer(maxParticles * 3); // vec3
    this.alphaBuffer    = this._allocBuffer(maxParticles * 1); // float
  }

  /**
   * 从 emitter 拉取粒子数据，分别上传到 4 个 GPU 缓冲区。
   */
  update(emitter: ParticleEmitter): void {
    this.activeCount = emitter.activeCount;
    if (this.activeCount === 0) return;

    const gl = this.gl;

    // 上传 position（vec3 per particle）
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, emitter.getPositions());

    // 上传 size（float per particle）
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, emitter.getSizes());

    // 上传 color（vec3 per particle）
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, emitter.getColors());

    // 上传 alpha（float per particle）
    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, emitter.getAlphas());

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * 渲染所有活跃粒子。
   */
  render(viewProj: Mat4): void {
    if (this.activeCount === 0) return;

    const gl = this.gl;

    // Alpha 混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 禁用深度写入
    gl.depthMask(false);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uViewProj, false, viewProj);

    // 绑定各属性缓冲区
    if (this.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
    }
    if (this.aSize >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
      gl.enableVertexAttribArray(this.aSize);
      gl.vertexAttribPointer(this.aSize, 1, gl.FLOAT, false, 0, 0);
    }
    if (this.aColor >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.enableVertexAttribArray(this.aColor);
      gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 0, 0);
    }
    if (this.aAlpha >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
      gl.enableVertexAttribArray(this.aAlpha);
      gl.vertexAttribPointer(this.aAlpha, 1, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.POINTS, 0, this.activeCount);

    // 清理
    if (this.aPosition >= 0) gl.disableVertexAttribArray(this.aPosition);
    if (this.aSize >= 0)     gl.disableVertexAttribArray(this.aSize);
    if (this.aColor >= 0)    gl.disableVertexAttribArray(this.aColor);
    if (this.aAlpha >= 0)    gl.disableVertexAttribArray(this.aAlpha);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 恢复深度写入
    gl.depthMask(true);
  }

  /**
   * 释放 GPU 资源。可安全多次调用。
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.sizeBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteBuffer(this.alphaBuffer);
  }

  // ── 私有辅助 ─────────────────────────────────────────────────────

  private _compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`ParticleRenderer: shader 编译失败 — ${info}`);
    }
    return shader;
  }

  private _allocBuffer(floatCount: number): WebGLBuffer {
    const gl = this.gl;
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      floatCount * Float32Array.BYTES_PER_ELEMENT,
      gl.DYNAMIC_DRAW,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buf;
  }
}
