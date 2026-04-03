/**
 * SkyboxRenderer — 使用 CubeTexture 渲染无限远天空盒背景。
 *
 * 技术方案：
 * - 全屏四边形（2 个三角形）覆盖 clip space
 * - Vertex Shader：gl_Position.z = gl_Position.w（最远深度）
 * - Fragment Shader：逆 VP 旋转矩阵计算视线方向，采样 samplerCube
 * - 相机：只取旋转（清除平移）实现无限远效果
 * - 深度：渲染前 LEQUAL + depthMask(false)，渲染后 LESS + depthMask(true)
 *
 * @module
 */

import { type Mat4, multiply, invert } from '../math/mat4';
import { type Camera } from '../core/camera';
import { type CubeTexture } from './cube-texture';

// WebGL 立方体贴图常量（WebGL 1.0 规范）
const TEXTURE_CUBE_MAP             = 0x8513;
const TEXTURE_CUBE_MAP_POSITIVE_X  = 0x8515;

const VERT_SRC = `
attribute vec2 a_position;
varying vec2 v_ndc;
void main() {
  v_ndc = a_position;
  gl_Position = vec4(a_position, 1.0, 1.0);
}
`.trim();

const FRAG_SRC = `
precision mediump float;
uniform samplerCube u_skybox;
uniform mat4 u_invVP;
varying vec2 v_ndc;
void main() {
  vec4 dir = u_invVP * vec4(v_ndc, 0.0, 1.0);
  gl_FragColor = textureCube(u_skybox, normalize(dir.xyz));
}
`.trim();

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`SkyboxRenderer shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`SkyboxRenderer program link error: ${info}`);
  }
  return prog;
}

export class SkyboxRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private posLoc: number;
  private skyboxLoc: WebGLUniformLocation | null;
  private invVPLoc: WebGLUniformLocation | null;
  private glTexture: WebGLTexture | null = null;
  private uploadedTexture: CubeTexture | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl);

    // 全屏四边形：2 个三角形，覆盖 [-1, 1]^2 clip space
    const verts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    this.posLoc   = gl.getAttribLocation(this.program, 'a_position');
    this.skyboxLoc = gl.getUniformLocation(this.program, 'u_skybox');
    this.invVPLoc  = gl.getUniformLocation(this.program, 'u_invVP');
  }

  render(texture: CubeTexture, camera: Camera): void {
    const gl = this.gl;

    // 渲染前：LEQUAL + 关闭深度写入（天空盒在最远处）
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);

    gl.useProgram(this.program);

    // 上传或重新上传 GPU 纹理
    if (this.uploadedTexture !== texture || texture.needsUpdate) {
      this._uploadTexture(texture);
    }

    // 绑定立方体纹理到 TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(TEXTURE_CUBE_MAP, this.glTexture);
    gl.uniform1i(this.skyboxLoc, 0);

    // 构造逆 VP 旋转矩阵并上传
    gl.uniformMatrix4fv(this.invVPLoc, false, this._buildInvVP(camera));

    // 绑定全屏四边形并绘制
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 渲染后：恢复常规深度状态
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.buffer);
    if (this.glTexture !== null) {
      gl.deleteTexture(this.glTexture);
      this.glTexture = null;
    }
  }

  /** 构造只含旋转（去平移）的逆 VP 矩阵 */
  private _buildInvVP(camera: Camera): Mat4 {
    const view = camera.viewMatrix;
    // 复制 view 矩阵，清除平移（列主序索引 12, 13, 14）
    const rotView = new Float32Array(view) as Mat4;
    rotView[12] = 0;
    rotView[13] = 0;
    rotView[14] = 0;

    const vp = multiply(camera.projectionMatrix, rotView);
    return invert(vp) ?? vp;
  }

  /** 将 CubeTexture 的 6 个面上传到 WebGL 立方体贴图 */
  private _uploadTexture(texture: CubeTexture): void {
    const gl = this.gl;

    if (this.glTexture === null) {
      this.glTexture = gl.createTexture();
    }

    gl.bindTexture(TEXTURE_CUBE_MAP, this.glTexture);

    for (let i = 0; i < 6; i++) {
      const face = texture.faces[i];
      if (face !== null) {
        gl.texImage2D(
          TEXTURE_CUBE_MAP_POSITIVE_X + i,
          0,
          gl.RGBA,
          texture.faceSize,
          texture.faceSize,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          face,
        );
      }
    }

    gl.texParameteri(TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.uploadedTexture = texture;
    texture.needsUpdate = false;
  }
}
