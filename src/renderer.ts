/**
 * Minimal WebGL renderer — Phase 0 spike.
 * Renders a colored triangle to validate the headless visual testing pipeline.
 */

// ── Shader sources ──────────────────────────────────────────────

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec3 a_color;
  varying vec3 v_color;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
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

// ── Helpers ─────────────────────────────────────────────────────

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

// ── Triangle data ───────────────────────────────────────────────

// Interleaved: [x, y, r, g, b] per vertex
const TRIANGLE_VERTICES = new Float32Array([
  // top (red)
   0.0,  0.6,   1.0, 0.0, 0.0,
  // bottom-left (green)
  -0.6, -0.4,   0.0, 1.0, 0.0,
  // bottom-right (blue)
   0.6, -0.4,   0.0, 0.0, 1.0,
]);

// ── Public API ──────────────────────────────────────────────────

export interface RendererState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vertexCount: number;
}

/**
 * Initialize the WebGL context and compile shaders.
 * Returns a state object for rendering.
 */
export function initRenderer(canvas: HTMLCanvasElement): RendererState {
  const gl = canvas.getContext('webgl', {
    antialias: false,              // deterministic rendering
    preserveDrawingBuffer: true,   // needed for screenshot capture
  });
  if (!gl) throw new Error('WebGL not supported');

  // Compile & link
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = createProgram(gl, vs, fs);

  // Upload geometry
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

  const STRIDE = 5 * 4; // 5 floats × 4 bytes

  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);

  const aCol = gl.getAttribLocation(program, 'a_color');
  gl.enableVertexAttribArray(aCol);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, STRIDE, 2 * 4);

  return { gl, program, vertexCount: 3 };
}

/**
 * Render one frame — static colored triangle.
 */
export function renderFrame(state: RendererState): void {
  const { gl, program, vertexCount } = state;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}
