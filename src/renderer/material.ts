/**
 * Material — wraps vertex and fragment shader source strings.
 * Provides sensible defaults for vertex-colored 3D rendering with MVP transform.
 */

export enum BlendMode {
  None     = 'none',     // gl.disable(BLEND) — 完全不透明
  Normal   = 'normal',   // SRC_ALPHA, ONE_MINUS_SRC_ALPHA — 标准 alpha 混合
  Additive = 'additive', // SRC_ALPHA, ONE — 发光叠加
  Multiply = 'multiply', // DST_COLOR, ZERO — 颜色相乘
}

export enum Side {
  Front  = 'front',
  Back   = 'back',
  Double = 'double',
}

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
  /** 渲染面，默认 Front（仅渲染正面） */
  side: Side = Side.Front;
  /** 是否写入深度缓冲，默认 true */
  depthWrite: boolean = true;
  /** 是否启用深度测试，默认 true */
  depthTest: boolean = true;
  /** 是否渲染该材质的 mesh，默认 true */
  visible: boolean = true;
  /** 混合模式，默认 None（不透明） */
  blendMode: BlendMode = BlendMode.None;

  constructor(opts?: { vertexShader?: string; fragmentShader?: string }) {
    this.vertexShader   = opts?.vertexShader   ?? DEFAULT_VERTEX_SHADER;
    this.fragmentShader = opts?.fragmentShader ?? DEFAULT_FRAGMENT_SHADER;
    this.opacity      = 1;
    this.transparent  = false;
  }

  /**
   * 解析实际生效的混合模式。
   * 规则：
   * - 如果 blendMode !== None → 返回 blendMode（显式设置优先）
   * - 如果 transparent === true 且 blendMode === None → 返回 Normal（向后兼容）
   * - 否则 → 返回 None
   */
  effectiveBlendMode(): BlendMode {
    if (this.blendMode !== BlendMode.None) return this.blendMode;
    if (this.transparent) return BlendMode.Normal;
    return BlendMode.None;
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
