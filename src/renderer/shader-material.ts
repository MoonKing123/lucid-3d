/**
 * ShaderMaterial — 自定义着色器材质，支持声明式 uniform 绑定。
 *
 * AI Agent 可编写任意 GLSL vertex/fragment shader，并通过 uniforms map 声明
 * 自定义 uniform 变量。WebGLRenderer 自动检测 ShaderMaterial 并绑定所有声明的 uniform。
 *
 * 内置 uniform（渲染器自动注入，无需声明）：
 *   u_mvp          mat4  — model-view-projection 矩阵
 *   u_modelMatrix  mat4  — model 矩阵
 *   u_viewMatrix   mat4  — view 矩阵
 *   u_projMatrix   mat4  — projection 矩阵
 *   u_time         float — 累计时间（秒）
 *   u_resolution   vec2  — canvas 尺寸（像素）
 *
 * @module renderer/shader-material
 */

export const __STUB__ = true;

import { Material } from './material';
import type { Texture } from './texture';

/** Supported uniform types matching WebGL 1.0 uniform calls. */
export type UniformType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'sampler2D';

/** A single uniform declaration: type + current value. */
export interface UniformDef {
  type: UniformType;
  value: number | number[] | Float32Array | Texture;
}

export interface ShaderMaterialOptions {
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, UniformDef>;
}

export class ShaderMaterial extends Material {
  uniforms: Record<string, UniformDef>;

  constructor(_opts: ShaderMaterialOptions) {
    super({ vertexShader: '', fragmentShader: '' });
    this.uniforms = {};
    throw new Error('Not implemented — stub');
  }

  /** Update value of an existing uniform. Throws if name not declared. */
  setUniform(_name: string, _value: UniformDef['value']): void {
    throw new Error('Not implemented — stub');
  }

  /** Deep clone including uniforms map. */
  clone(): ShaderMaterial {
    throw new Error('Not implemented — stub');
  }
}
