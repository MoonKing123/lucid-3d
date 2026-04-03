/**
 * Fog — 雾效数学计算与 GLSL 代码片段。
 * 支持 linear / exp / exp2 三种模式。
 * @see test/unit/renderer/fog.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

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
export function computeFogFactor(_distance: number, _config: FogConfig): number {
  return 0;
}

/** 顶点着色器 — varying 声明 */
export const FOG_VERTEX_PARS = '';

/** 顶点着色器 — 计算 v_fogDist */
export const FOG_VERTEX_CODE = '';

/** 片元着色器 — uniform + varying 声明 */
export const FOG_FRAGMENT_PARS = '';

/** 片元着色器 — 混合雾色 */
export const FOG_FRAGMENT_CODE = '';
