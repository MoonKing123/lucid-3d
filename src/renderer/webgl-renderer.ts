/**
 * WebGLRenderer — traverses the scene graph and renders all Mesh nodes.
 * Uses WebGL 1.0 for maximum compatibility (WeChat mini-games).
 */

import { type Mat4, multiply } from '../math/mat4';
import { Node3D } from '../core/node3d';
import { PerspectiveCamera } from '../core/camera';
import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';

// ── Internal GPU resource cache ──────────────────────────────────

interface CompiledProgram {
  program: WebGLProgram;
  aPosition: number;
  aColor: number;
  uMvp: WebGLUniformLocation;
}

interface UploadedGeometry {
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer | null;
  indexCount: number;
  vertexCount: number;
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

// ── WebGLRenderer ─────────────────────────────────────────────────

export class WebGLRenderer {
  private gl: WebGLRenderingContext;

  // Caches keyed by object identity
  private programCache: WeakMap<Material, CompiledProgram> = new WeakMap();
  private geometryCache: WeakMap<Geometry, UploadedGeometry> = new WeakMap();

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
  render(scene: Node3D, camera: PerspectiveCamera): void {
    const gl = this.gl;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const viewProj = camera.viewProjectionMatrix;

    scene.traverse((node) => {
      if (node instanceof Mesh) {
        this._drawMesh(node, viewProj);
      }
    });
  }

  /** Release all GPU resources. */
  dispose(): void {
    // WeakMaps will be GC'd along with the Geometry/Material objects.
    // Nothing else to clean up explicitly without iterating all cached entries.
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
    const uMvpLoc   = gl.getUniformLocation(program, 'u_mvp');
    if (!uMvpLoc) throw new Error('Shader must define uniform mat4 u_mvp');

    const compiled: CompiledProgram = { program, aPosition, aColor, uMvp: uMvpLoc };
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
    const uploaded: UploadedGeometry = { positionBuffer, colorBuffer, indexBuffer, indexCount, vertexCount };
    this.geometryCache.set(geometry, uploaded);
    return uploaded;
  }

  private _drawMesh(mesh: Mesh, viewProj: Mat4): void {
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

    // Draw
    if (uploaded.indexBuffer !== null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, uploaded.indexBuffer);
      gl.drawElements(gl.TRIANGLES, uploaded.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, uploaded.vertexCount);
    }
  }
}
