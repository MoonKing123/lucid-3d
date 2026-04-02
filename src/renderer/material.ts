/**
 * Material — wraps vertex and fragment shader source strings.
 * Provides sensible defaults for vertex-colored 3D rendering with MVP transform.
 */

const DEFAULT_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec3 a_color;
  uniform mat4 u_mvp;
  varying vec3 v_color;

  void main() {
    gl_Position = u_mvp * vec4(a_position, 1.0);
    v_color = a_color;
  }
`;

const DEFAULT_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 v_color;

  void main() {
    gl_FragColor = vec4(v_color, 1.0);
  }
`;

export class Material {
  vertexShader: string;
  fragmentShader: string;

  constructor(opts?: { vertexShader?: string; fragmentShader?: string }) {
    this.vertexShader   = opts?.vertexShader   ?? DEFAULT_VERTEX_SHADER;
    this.fragmentShader = opts?.fragmentShader ?? DEFAULT_FRAGMENT_SHADER;
  }
}
