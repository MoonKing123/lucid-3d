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
  /** 透明度，范围 0-1，默认 1（完全不透明） */
  opacity: number;
  /** 是否启用透明渲染，默认 false */
  transparent: boolean;

  constructor(opts?: { vertexShader?: string; fragmentShader?: string }) {
    this.vertexShader   = opts?.vertexShader   ?? DEFAULT_VERTEX_SHADER;
    this.fragmentShader = opts?.fragmentShader ?? DEFAULT_FRAGMENT_SHADER;
    this.opacity      = 1;
    this.transparent  = false;
  }

  /** 克隆材质（拷贝 shader source + opacity/transparent 属性） */
  clone(): Material {
    const m = new Material({
      vertexShader:   this.vertexShader,
      fragmentShader: this.fragmentShader,
    });
    m.opacity     = this.opacity;
    m.transparent = this.transparent;
    return m;
  }
}
