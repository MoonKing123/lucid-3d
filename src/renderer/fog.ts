/**
 * Fog — 雾效数学计算与 GLSL 代码片段。
 * 支持 linear / exp / exp2 三种模式。
 * @see test/unit/renderer/fog.test.ts
 */

export type FogMode = 'linear' | 'exp' | 'exp2';

export interface FogConfig {
  mode: FogMode;
  /** 雾颜色 [r, g, b]，范围 0-1 */
  color?: readonly [number, number, number];
  /** linear 模式：雾开始距离 */
  near?: number;
  /** linear 模式：雾完全覆盖距离 */
  far?: number;
  /** exp / exp2 模式：雾密度 */
  density?: number;
}

/**
 * 计算雾效因子（0 = 无雾，1 = 完全雾化）。
 * @param distance 片元到相机的距离
 * @param config   雾效配置
 */
export function computeFogFactor(distance: number, config: FogConfig): number {
  if (config.mode === 'linear') {
    const near = config.near ?? 0;
    const far = config.far ?? 1;
    return Math.min(1, Math.max(0, (distance - near) / (far - near)));
  }
  if (config.mode === 'exp') {
    const density = config.density ?? 1;
    return Math.min(1, Math.max(0, 1 - Math.exp(-density * distance)));
  }
  // exp2
  const density = config.density ?? 1;
  return Math.min(1, Math.max(0, 1 - Math.exp(-Math.pow(density * distance, 2))));
}

/** 顶点着色器 — varying 声明 */
export const FOG_VERTEX_PARS = 'varying float v_fogDist;';

/** 顶点着色器 — 计算 v_fogDist */
export const FOG_VERTEX_CODE = 'v_fogDist = -( u_modelMatrix * vec4(a_position, 1.0) ).z;';

/** 片元着色器 — uniform + varying 声明 */
export const FOG_FRAGMENT_PARS = [
  'uniform vec3 u_fogColor;',
  'uniform float u_fogNear;',
  'uniform float u_fogFar;',
  'varying float v_fogDist;',
].join('\n');

/** 片元着色器 — 混合雾色 */
export const FOG_FRAGMENT_CODE = [
  'float fogFactor = clamp((v_fogDist - u_fogNear) / (u_fogFar - u_fogNear), 0.0, 1.0);',
  'gl_FragColor = mix(gl_FragColor, vec4(u_fogColor, gl_FragColor.a), fogFactor);',
].join('\n');
