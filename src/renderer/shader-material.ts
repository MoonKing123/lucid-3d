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

  constructor(opts: ShaderMaterialOptions) {
    super({ vertexShader: opts.vertexShader, fragmentShader: opts.fragmentShader });
    this.uniforms = {};
    if (opts.uniforms) {
      for (const [name, def] of Object.entries(opts.uniforms)) {
        this.uniforms[name] = { type: def.type, value: def.value };
      }
    }
  }

  /** Update value of an existing uniform. Throws if name not declared. */
  setUniform(name: string, value: UniformDef['value']): void {
    if (!(name in this.uniforms)) {
      throw new Error(`Uniform "${name}" is not declared in this ShaderMaterial`);
    }
    this.uniforms[name].value = value;
  }

  /** Deep clone including uniforms map. */
  clone(): ShaderMaterial {
    const cloned = new ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
    });
    for (const [name, def] of Object.entries(this.uniforms)) {
      cloned.uniforms[name] = { type: def.type, value: copyValue(def.value) };
    }
    return cloned;
  }
}

function copyValue(value: UniformDef['value']): UniformDef['value'] {
  if (value instanceof Float32Array) return new Float32Array(value);
  if (Array.isArray(value)) return [...value];
  return value;
}
