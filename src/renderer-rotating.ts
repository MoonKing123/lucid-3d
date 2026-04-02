/**
 * Rotating triangle renderer — incremental feature on top of static renderer.
 * Adds a uniform-based rotation to validate:
 * 1. AI can add features incrementally
 * 2. New feature can be visually verified
 * 3. Previous tests still pass (regression check)
 */

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec3 a_color;
  uniform float u_angle;
  varying vec3 v_color;

  void main() {
    float c = cos(u_angle);
    float s = sin(u_angle);
    mat2 rotation = mat2(c, -s, s, c);
    vec2 rotated = rotation * a_position;
    gl_Position = vec4(rotated, 0.0, 1.0);
    v_color = a_color;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 v_color;

  void main() {
    gl_FragColor = vec4(v_color, 1.0);
  }
`;

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

const TRIANGLE_VERTICES = new Float32Array([
   0.0,  0.6,   1.0, 0.0, 0.0,
  -0.6, -0.4,   0.0, 1.0, 0.0,
   0.6, -0.4,   0.0, 0.0, 1.0,
]);

export interface RotatingRendererState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  angleLoc: WebGLUniformLocation;
  vertexCount: number;
  angle: number;
}

export function initRotatingRenderer(canvas: HTMLCanvasElement): RotatingRendererState {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('WebGL not supported');

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = createProgram(gl, vs, fs);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

  const STRIDE = 5 * 4;
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);

  const aCol = gl.getAttribLocation(program, 'a_color');
  gl.enableVertexAttribArray(aCol);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, STRIDE, 2 * 4);

  const angleLoc = gl.getUniformLocation(program, 'u_angle');
  if (!angleLoc) throw new Error('Failed to get u_angle location');

  return { gl, program, angleLoc, vertexCount: 3, angle: 0 };
}

/**
 * Render one frame with rotation.
 * @param angle - rotation angle in radians (deterministic for testing)
 */
export function renderRotatingFrame(state: RotatingRendererState, angle: number): void {
  const { gl, program, angleLoc, vertexCount } = state;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniform1f(angleLoc, angle);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}
