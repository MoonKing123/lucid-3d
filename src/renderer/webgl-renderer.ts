/**
 * WebGLRenderer — traverses the scene graph and renders all Mesh nodes.
 * Uses WebGL 1.0 for maximum compatibility (WeChat mini-games).
 */

import { type Mat4, multiply, normalMatrix as computeNormalMatrix } from '../math/mat4';
import { type Vec3, vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Scene } from '../core/scene';
import { Camera } from '../core/camera';
import { AmbientLight, DirectionalLight } from '../core/light';
import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import { TextureMaterial } from './texture-material';
import { Texture } from './texture';
import { PhongMaterial } from './phong-material';
import { BitmapTextMaterial } from './bitmap-text';

// ── Internal GPU resource cache ──────────────────────────────────

interface PhongLocations {
  aNormal: number;
  uModelMatrix: WebGLUniformLocation | null;
  uNormalMatrix: WebGLUniformLocation | null;
  uLightDir: WebGLUniformLocation | null;
  uLightColor: WebGLUniformLocation | null;
  uAmbientColor: WebGLUniformLocation | null;
  uCameraPos: WebGLUniformLocation | null;
  uDiffuse: WebGLUniformLocation | null;
  uSpecular: WebGLUniformLocation | null;
  uShininess: WebGLUniformLocation | null;
}

interface CompiledProgram {
  program: WebGLProgram;
  aPosition: number;
  aColor: number;
  aUv: number;
  uMvp: WebGLUniformLocation;
  phong?: PhongLocations;
}

interface UploadedGeometry {
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer | null;
  normalBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  indexCount: number;
  vertexCount: number;
}

interface LightContext {
  ambientColor: Vec3;
  lightDir: Vec3;
  lightColor: Vec3;
  cameraPos: Vec3;
}

// ── Shader helpers ────────────────────────────────────────────────

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

/** 从列优先 Mat4 提取左上 3×3 子矩阵（列优先 mat3，供 uniformMatrix3fv 使用）*/
function extractMat3(m: Mat4): Float32Array {
  return new Float32Array([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ]);
}

// ── WebGLRenderer ─────────────────────────────────────────────────

export class WebGLRenderer {
  private gl: WebGLRenderingContext;

  // Caches keyed by object identity
  private programCache: WeakMap<Material, CompiledProgram> = new WeakMap();
  private geometryCache: WeakMap<Geometry, UploadedGeometry> = new WeakMap();
  private textureCache: WeakMap<Texture, WebGLTexture> = new WeakMap();

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
  }

  /**
   * Render one frame. Traverses the scene graph and draws all Mesh nodes.
   * @param scene  - root node of the scene (may be any Node3D)
   * @param camera - perspective camera providing view-projection matrix
   */
  render(scene: Scene, camera: Camera): void {
    const gl = this.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const bg = scene.background;
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 收集光源
    let ambientColor: Vec3 = vec3(0, 0, 0);
    let lightDir: Vec3 = vec3(0, -1, 0);
    let lightColor: Vec3 = vec3(0, 0, 0);

    const collected = scene.collectLights();
    for (const node of collected.ambient) {
      ambientColor = vec3(
        node.color[0] * node.intensity,
        node.color[1] * node.intensity,
        node.color[2] * node.intensity,
      );
    }
    for (const node of collected.directional) {
      lightDir = node.direction;
      lightColor = vec3(
        node.color[0] * node.intensity,
        node.color[1] * node.intensity,
        node.color[2] * node.intensity,
      );
    }

    const lightCtx: LightContext = {
      ambientColor,
      lightDir,
      lightColor,
      cameraPos: camera.position,
    };

    const viewProj = camera.viewProjectionMatrix;

    scene.traverse((node) => {
      if (node instanceof Mesh) {
        this._drawMesh(node, viewProj, lightCtx);
      }
    });
  }

  /** Release all GPU resources. */
  dispose(): void {
    // WeakMaps will be GC'd along with the Geometry/Material objects.
    // Nothing else to clean up explicitly without iterating all cached entries.
  }

  private _getWebGLTexture(texture: Texture): WebGLTexture {
    const cached = this.textureCache.get(texture);
    if (cached) return cached;

    const gl = this.gl;
    const webglTex = gl.createTexture();
    if (!webglTex) throw new Error('Failed to create WebGL texture');

    gl.bindTexture(gl.TEXTURE_2D, webglTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      texture.width, texture.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, texture.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.textureCache.set(texture, webglTex);
    return webglTex;
  }

  // ── Private helpers ─────────────────────────────────────────────

  private _getProgram(material: Material): CompiledProgram {
    const cached = this.programCache.get(material);
    if (cached) return cached;

    const gl = this.gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, material.vertexShader);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, material.fragmentShader);
    const program = createProgram(gl, vs, fs);

    // Clean up individual shaders after linking
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const aColor    = gl.getAttribLocation(program, 'a_color');
    const aUv       = gl.getAttribLocation(program, 'a_uv');
    const uMvpLoc   = gl.getUniformLocation(program, 'u_mvp');
    if (!uMvpLoc) throw new Error('Shader must define uniform mat4 u_mvp');

    const compiled: CompiledProgram = { program, aPosition, aColor, aUv, uMvp: uMvpLoc };

    // 如果是 PhongMaterial，查询额外的 attribute / uniform 位置
    if (material instanceof PhongMaterial) {
      compiled.phong = {
        aNormal:       gl.getAttribLocation(program, 'a_normal'),
        uModelMatrix:  gl.getUniformLocation(program, 'u_modelMatrix'),
        uNormalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
        uLightDir:     gl.getUniformLocation(program, 'u_lightDir'),
        uLightColor:   gl.getUniformLocation(program, 'u_lightColor'),
        uAmbientColor: gl.getUniformLocation(program, 'u_ambientColor'),
        uCameraPos:    gl.getUniformLocation(program, 'u_cameraPos'),
        uDiffuse:      gl.getUniformLocation(program, 'u_diffuse'),
        uSpecular:     gl.getUniformLocation(program, 'u_specular'),
        uShininess:    gl.getUniformLocation(program, 'u_shininess'),
      };
    }

    this.programCache.set(material, compiled);
    return compiled;
  }

  private _getGeometry(geometry: Geometry): UploadedGeometry {
    const cached = this.geometryCache.get(geometry);
    if (cached) return cached;

    const gl = this.gl;

    // Position buffer
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) throw new Error('Failed to create position buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    // Color buffer
    const colorBuffer = gl.createBuffer();
    if (!colorBuffer) throw new Error('Failed to create color buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.STATIC_DRAW);

    // UV buffer (optional)
    let uvBuffer: WebGLBuffer | null = null;
    if (geometry.uvs) {
      uvBuffer = gl.createBuffer();
      if (!uvBuffer) throw new Error('Failed to create UV buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);
    }

    // Normal buffer（可选）
    let normalBuffer: WebGLBuffer | null = null;
    if (geometry.normals) {
      normalBuffer = gl.createBuffer();
      if (!normalBuffer) throw new Error('Failed to create normal buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
    }

    // Index buffer (optional)
    let indexBuffer: WebGLBuffer | null = null;
    let indexCount = 0;
    if (geometry.indices) {
      indexBuffer = gl.createBuffer();
      if (!indexBuffer) throw new Error('Failed to create index buffer');
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
      indexCount = geometry.indices.length;
    }

    const vertexCount = geometry.positions.length / 3;
    const uploaded: UploadedGeometry = {
      positionBuffer,
      colorBuffer,
      uvBuffer,
      normalBuffer,
      indexBuffer,
      indexCount,
      vertexCount,
    };
    this.geometryCache.set(geometry, uploaded);
    return uploaded;
  }

  private _drawMesh(mesh: Mesh, viewProj: Mat4, lightCtx: LightContext): void {
    const gl = this.gl;
    const compiled  = this._getProgram(mesh.material);
    const uploaded  = this._getGeometry(mesh.geometry);

    // MVP = viewProjection * worldMatrix
    const mvp = multiply(viewProj, mesh.worldMatrix);

    gl.useProgram(compiled.program);

    // Upload MVP uniform
    gl.uniformMatrix4fv(compiled.uMvp, false, mvp);

    // Bind position attribute
    if (compiled.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.positionBuffer);
      gl.enableVertexAttribArray(compiled.aPosition);
      gl.vertexAttribPointer(compiled.aPosition, 3, gl.FLOAT, false, 0, 0);
    }

    // Bind color attribute
    if (compiled.aColor >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.colorBuffer);
      gl.enableVertexAttribArray(compiled.aColor);
      gl.vertexAttribPointer(compiled.aColor, 3, gl.FLOAT, false, 0, 0);
    }

    // Bind UV attribute 和纹理（仅 TextureMaterial）
    if (mesh.material instanceof TextureMaterial) {
      if (compiled.aUv >= 0 && uploaded.uvBuffer !== null) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
        gl.enableVertexAttribArray(compiled.aUv);
        gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
      }
      const webglTex = this._getWebGLTexture(mesh.material.texture);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, webglTex);
      const uTexture = gl.getUniformLocation(compiled.program, 'u_texture');
      gl.uniform1i(uTexture, 0);
    }

    // BitmapTextMaterial 专用：绑定字体 atlas 纹理 + u_color + 开启 alpha blend
    if (mesh.material instanceof BitmapTextMaterial) {
      if (compiled.aUv >= 0 && uploaded.uvBuffer !== null) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
        gl.enableVertexAttribArray(compiled.aUv);
        gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
      }
      const btMat = mesh.material;
      if (btMat.atlas) {
        const webglTex = this._getWebGLTexture(btMat.atlas);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        const uAtlas = gl.getUniformLocation(compiled.program, 'u_atlas');
        gl.uniform1i(uAtlas, 0);
      }
      const uColor = gl.getUniformLocation(compiled.program, 'u_color');
      gl.uniform3fv(uColor, btMat.color);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    // PhongMaterial 专用：绑定法线 + 传递光照 uniforms
    if (mesh.material instanceof PhongMaterial && compiled.phong) {
      const phong = compiled.phong;
      const mat = mesh.material;
      const model = mesh.worldMatrix;

      // a_normal attribute
      if (phong.aNormal >= 0 && uploaded.normalBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.normalBuffer);
        gl.enableVertexAttribArray(phong.aNormal);
        gl.vertexAttribPointer(phong.aNormal, 3, gl.FLOAT, false, 0, 0);
      }

      // u_modelMatrix
      if (phong.uModelMatrix) {
        gl.uniformMatrix4fv(phong.uModelMatrix, false, model);
      }

      // u_normalMatrix（mat3，从 mat4 提取上左 3×3）
      if (phong.uNormalMatrix) {
        const nm = computeNormalMatrix(model);
        if (nm) {
          gl.uniformMatrix3fv(phong.uNormalMatrix, false, extractMat3(nm));
        }
      }

      // 光照 uniforms
      if (phong.uLightDir)     gl.uniform3fv(phong.uLightDir, lightCtx.lightDir);
      if (phong.uLightColor)   gl.uniform3fv(phong.uLightColor, lightCtx.lightColor);
      if (phong.uAmbientColor) gl.uniform3fv(phong.uAmbientColor, lightCtx.ambientColor);
      if (phong.uCameraPos)    gl.uniform3fv(phong.uCameraPos, lightCtx.cameraPos);

      // 材质属性 uniforms
      if (phong.uDiffuse)   gl.uniform3fv(phong.uDiffuse, mat.diffuse);
      if (phong.uSpecular)  gl.uniform3fv(phong.uSpecular, mat.specular);
      if (phong.uShininess) gl.uniform1f(phong.uShininess, mat.shininess);
    }

    // Draw
    if (uploaded.indexBuffer !== null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, uploaded.indexBuffer);
      gl.drawElements(gl.TRIANGLES, uploaded.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, uploaded.vertexCount);
    }
  }
}
