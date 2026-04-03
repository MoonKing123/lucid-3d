/**
 * ShadowMap — 方向光阴影映射。
 * 使用 RenderTarget 渲染深度纹理，在主渲染 pass 中采样实现阴影。
 * 支持可配置分辨率、bias、PCF 软阴影。
 * @see test/unit/renderer/shadow-map.test.ts
 * @internal Stub — implementation pending.
 */

export const __STUB__ = true;

import { type Vec3 } from '../math/vec3';
import { type Mat4 } from '../math/mat4';
import { RenderTarget } from './render-target';

export interface ShadowMapOptions {
  /** 阴影贴图分辨率（正方形边长），默认 1024 */
  resolution?: number;
  /** 深度偏移量，减少 shadow acne，默认 0.005 */
  bias?: number;
  /** 阴影相机近平面，默认 0.1 */
  near?: number;
  /** 阴影相机远平面，默认 100 */
  far?: number;
}

export class ShadowMap {
  readonly resolution: number;
  readonly bias: number;
  readonly near: number;
  readonly far: number;
  readonly renderTarget: RenderTarget;

  /** 光源视图矩阵 */
  lightViewMatrix: Mat4 | null = null;
  /** 光源投影矩阵（正交） */
  lightProjMatrix: Mat4 | null = null;
  /** 光源 VP 矩阵（lightProjMatrix * lightViewMatrix） */
  lightVPMatrix: Mat4 | null = null;

  constructor(_options?: ShadowMapOptions) {
    this.resolution = 1024;
    this.bias = 0.005;
    this.near = 0.1;
    this.far = 100;
    this.renderTarget = new RenderTarget({ width: 1024, height: 1024 });
  }

  /**
   * 根据方向光和场景包围信息配置光源矩阵。
   * @param lightDirection 光线方向（归一化向量，指向光照方向）
   * @param sceneCenter    场景中心点
   * @param sceneRadius    场景包围球半径
   */
  configure(
    _lightDirection: Vec3,
    _sceneCenter: Vec3,
    _sceneRadius: number,
  ): void {
    // stub — 应计算 lightViewMatrix、lightProjMatrix、lightVPMatrix
  }

  /** 深度渲染 pass 的顶点着色器 */
  getDepthVertexShader(): string {
    return '';
  }

  /** 深度渲染 pass 的片元着色器 */
  getDepthFragmentShader(): string {
    return '';
  }

  /** 释放 GPU 资源 */
  dispose(_gl: WebGLRenderingContext): void {
    // stub
  }
}

/* ── 主渲染 pass 中注入的阴影 GLSL 片段 ── */

/** 顶点着色器 — uniform + varying 声明 */
export const SHADOW_VERTEX_PARS = '';

/** 顶点着色器 — 计算 v_shadowCoord */
export const SHADOW_VERTEX_CODE = '';

/** 片元着色器 — uniform + varying + sampler 声明 */
export const SHADOW_FRAGMENT_PARS = '';

/** 片元着色器 — 采样阴影贴图并计算阴影因子 */
export const SHADOW_FRAGMENT_CODE = '';
