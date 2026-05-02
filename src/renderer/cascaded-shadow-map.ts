/**
 * CascadedShadowMap — N 级级联阴影贴图容器。
 *
 * 内部维护 N 个 ShadowMap 实例 (复用 Phase 10 ShadowMap)，
 * 通过 splitFrustum (Phase 53 KR1) 划分相机 frustum，
 * 每级独立计算 light-space view-proj matrix。
 *
 * update(camera, lightDir) 需在每帧调用以更新所有级联矩阵。
 *
 * @see test/unit/renderer/cascaded-shadow-map.test.ts
 */

import type { PerspectiveCamera } from '../core/camera';
import type { Vec3 } from '../math/vec3';
import type { Mat4 } from '../math/mat4';
import type { ShadowMap } from './shadow-map';
import type { CascadeSplit } from './cascade-splitter';

export interface CascadedShadowMapOptions {
  /** 级联数 (推荐 2-4) */
  numCascades: number;
  /** 每级 shadow map 边长 (像素)，默认 1024 */
  size?: number;
  /** PCF 软阴影 kernel: 0=硬阴影, 1=3x3, 2=5x5。默认 0 (复用 ShadowMap) */
  softness?: 0 | 1 | 2;
  /** 阴影 bias，默认 0.005 (复用 ShadowMap) */
  bias?: number;
  /** PSSM lambda ∈ [0,1]，默认 0.5 */
  lambda?: number;
}

export class CascadedShadowMap {
  readonly numCascades: number;
  readonly size: number;
  readonly softness: 0 | 1 | 2;
  readonly bias: number;
  readonly lambda: number;
  /** N 个 ShadowMap 实例，按 cascade index 排列 */
  readonly cascades: ShadowMap[] = [];
  /** 每级 frustum split (near/far)，由 update() 刷新 */
  splits: CascadeSplit[] = [];
  /** 每级 light-space view-proj matrix，由 update() 刷新 */
  lightSpaceMatrices: Mat4[] = [];

  constructor(_opts: CascadedShadowMapOptions) {
    throw new Error('CascadedShadowMap: Not implemented (stub)');
  }

  /** 根据相机和方向光更新每级 split + light-space matrix。每帧调用一次。 */
  update(_camera: PerspectiveCamera, _lightDir: Vec3): void {
    throw new Error('CascadedShadowMap.update: Not implemented (stub)');
  }

  /** 释放所有级联的 RenderTarget GPU 资源 */
  dispose(_gl: WebGLRenderingContext): void {
    throw new Error('CascadedShadowMap.dispose: Not implemented (stub)');
  }
}

export const __STUB__ = true;
