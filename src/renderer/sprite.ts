/**
 * Sprite — billboard 精灵，始终面向相机的四边形。
 * 用于粒子效果、UI 元素、远景装饰物等。
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Material } from './material';
import type { Texture } from './texture';

// billboard 顶点着色器：通过去除 modelView 的旋转部分实现面向相机效果
// 保留平移（列 3）和缩放（各列的长度）
const SPRITE_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec2 a_uv;
  uniform mat4 u_modelView;
  uniform mat4 u_projection;
  varying vec2 v_uv;

  void main() {
    // 从 modelView 各列提取缩放因子（列向量的长度）
    float sx = length(u_modelView[0].xyz);
    float sy = length(u_modelView[1].xyz);
    float sz = length(u_modelView[2].xyz);

    // 构造 billboard 矩阵：用单位矩阵 × 缩放替换旋转，保留平移列
    mat4 mv = mat4(
      vec4(sx,  0.0, 0.0, 0.0),
      vec4(0.0, sy,  0.0, 0.0),
      vec4(0.0, 0.0, sz,  0.0),
      u_modelView[3]
    );

    gl_Position = u_projection * mv * vec4(a_position, 1.0);
    v_uv = a_uv;
  }
`;

// 片元着色器：应用颜色 × 不透明度，可选纹理采样
const SPRITE_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 u_color;
  uniform float u_opacity;
  uniform sampler2D u_texture;
  uniform float u_hasTexture;
  varying vec2 v_uv;

  void main() {
    vec4 texColor = mix(vec4(1.0), texture2D(u_texture, v_uv), u_hasTexture);
    gl_FragColor = texColor * vec4(u_color, u_opacity);
  }
`;

export class SpriteMaterial extends Material {
  color: Vec3;
  opacity: number;
  texture: Texture | null;

  constructor(opts?: { color?: Vec3; opacity?: number; texture?: Texture }) {
    super({
      vertexShader: SPRITE_VERTEX_SHADER,
      fragmentShader: SPRITE_FRAGMENT_SHADER,
    });
    this.color   = opts?.color   ?? vec3(1, 1, 1);
    this.opacity = opts?.opacity ?? 1.0;
    this.texture = opts?.texture ?? null;
  }
}

export class Sprite extends Node3D {
  material: SpriteMaterial;

  constructor(material?: SpriteMaterial) {
    super('sprite');
    this.material = material ?? new SpriteMaterial();
  }
}
