/**
 * ShadowMap — 方向光阴影映射。
 * 使用 RenderTarget 渲染深度纹理，在主渲染 pass 中采样实现阴影。
 * 支持可配置分辨率、bias、PCF 软阴影。
 * @see test/unit/renderer/shadow-map.test.ts
 */

import { type Vec3, vec3, normalize, scale } from '../math/vec3';
import { type Mat4, lookAt, ortho, multiply } from '../math/mat4';
import { RenderTarget } from './render-target';

export interface ShadowMapOptions {
  /** 阴影贴图分辨率（正方形边长），默认 1024 */
  resolution?: number;
  /** 阴影贴图宽度（与 height 同时使用时覆盖 resolution） */
  width?: number;
  /** 阴影贴图高度（与 width 同时使用时覆盖 resolution） */
  height?: number;
  /** 深度偏移量，减少 shadow acne，默认 0.005 */
  bias?: number;
  /** 阴影相机近平面，默认 0.1 */
  near?: number;
  /** 阴影相机远平面，默认 100 */
  far?: number;
  /** PCF 软阴影 kernel 大小：0 = 关闭(硬阴影), 1 = 3x3, 2 = 5x5。默认 0 */
  softness?: 0 | 1 | 2;
}

export class ShadowMap {
  readonly resolution: number;
  readonly bias: number;
  readonly near: number;
  readonly far: number;
  readonly softness: 0 | 1 | 2;
  readonly renderTarget: RenderTarget;

  /** 光源视图矩阵 */
  lightViewMatrix: Mat4 | null = null;
  /** 光源投影矩阵（正交） */
  lightProjMatrix: Mat4 | null = null;
  /** 光源 VP 矩阵（lightProjMatrix * lightViewMatrix） */
  lightVPMatrix: Mat4 | null = null;

  constructor(options?: ShadowMapOptions) {
    const res = options?.resolution ?? 1024;
    const w = options?.width ?? res;
    const h = options?.height ?? res;
    this.resolution = res;
    this.bias = options?.bias ?? 0.005;
    this.near = options?.near ?? 0.1;
    this.far = options?.far ?? 100;
    const s = options?.softness ?? 0;
    if (s !== 0 && s !== 1 && s !== 2) {
      throw new Error(`ShadowMap: softness 必须为 0、1 或 2，收到 ${s}`);
    }
    this.softness = s;
    this.renderTarget = new RenderTarget({
      width: w,
      height: h,
      depthBuffer: true,
    });
  }

  /** 返回片元着色器声明代码（根据 softness 决定是否含 u_shadowMapSize） */
  getFragmentParsCode(): string {
    if (this.softness === 0) return SHADOW_FRAGMENT_PARS;
    return `${SHADOW_FRAGMENT_PARS}\nuniform vec2 u_shadowMapSize;`;
  }

  /** 返回片元着色器阴影计算代码（softness=0 硬阴影，1=3x3 PCF，2=5x5 PCF） */
  getFragmentCode(): string {
    if (this.softness === 0) return SHADOW_FRAGMENT_CODE;
    return this.softness === 1 ? PCF_3X3_FRAGMENT_CODE : PCF_5X5_FRAGMENT_CODE;
  }

  /**
   * 根据方向光和场景包围信息配置光源矩阵。
   * @param lightDirection 光线方向（归一化向量，指向光照方向）
   * @param sceneCenter    场景中心点
   * @param sceneRadius    场景包围球半径
   */
  configure(lightDirection: Vec3, sceneCenter: Vec3, sceneRadius: number): void {
    const dir = normalize(lightDirection);

    // 光源位置：从场景中心沿光线反方向偏移 sceneRadius
    const eyeOffset = scale(dir, sceneRadius);
    const eye = vec3(
      sceneCenter[0] - eyeOffset[0],
      sceneCenter[1] - eyeOffset[1],
      sceneCenter[2] - eyeOffset[2],
    );

    // 若光线方向与世界 Y 轴接近平行，使用 X 轴作为 up 向量，避免 lookAt 退化
    const up = Math.abs(dir[1]) > 0.999 ? vec3(1, 0, 0) : vec3(0, 1, 0);

    this.lightViewMatrix = lookAt(eye, sceneCenter, up);
    this.lightProjMatrix = ortho(
      -sceneRadius, sceneRadius,
      -sceneRadius, sceneRadius,
      this.near,
      this.far,
    );
    // VP = P * V，将世界空间顶点变换到光源裁剪空间
    this.lightVPMatrix = multiply(this.lightProjMatrix, this.lightViewMatrix);
  }

  /** 深度 pass 顶点着色器：将顶点变换到光源裁剪空间 */
  getDepthVertexShader(): string {
    return `
attribute vec3 a_position;
uniform mat4 u_modelMatrix;
uniform mat4 u_lightVP;
varying float v_depth;
void main() {
  vec4 pos = u_lightVP * u_modelMatrix * vec4(a_position, 1.0);
  gl_Position = pos;
  v_depth = pos.z / pos.w;
}
`.trim();
  }

  /**
   * 深度 pass 片元着色器：将深度值编码到 RGBA 通道。
   * WebGL 1.0 不支持 depth texture，将深度写入颜色附件。
   */
  getDepthFragmentShader(): string {
    return `
precision mediump float;
varying float v_depth;
void main() {
  float depth = gl_FragCoord.z;
  gl_FragColor = vec4(depth, depth, depth, 1.0);
}
`.trim();
  }

  /** 释放 GPU 资源 */
  dispose(gl: WebGLRenderingContext): void {
    this.renderTarget.dispose(gl);
  }
}

/* ── 主 pass GLSL 注入片段 ── */

/** 顶点着色器声明部分：输出阴影坐标 varying */
export const SHADOW_VERTEX_PARS = `
varying vec4 v_shadowCoord;
uniform mat4 u_lightVP;
`.trim();

/** 顶点着色器代码部分：计算阴影纹理坐标 */
export const SHADOW_VERTEX_CODE = `
v_shadowCoord = u_lightVP * u_modelMatrix * vec4(a_position, 1.0);
`.trim();

/** 片元着色器声明部分：阴影贴图采样器与 varying */
export const SHADOW_FRAGMENT_PARS = `
uniform sampler2D u_shadowMap;
uniform float u_shadowBias;
varying vec4 v_shadowCoord;
`.trim();

/** 片元着色器代码部分：采样阴影贴图并计算阴影因子（硬阴影） */
export const SHADOW_FRAGMENT_CODE = `
vec3 shadowNDC = v_shadowCoord.xyz / v_shadowCoord.w;
vec2 shadowUV = shadowNDC.xy * 0.5 + 0.5;
float shadowDepth = texture2D(u_shadowMap, shadowUV).r;
float bias = u_shadowBias;
float shadow = (shadowNDC.z * 0.5 + 0.5 - bias > shadowDepth) ? 0.5 : 1.0;
`.trim();

/** 3x3 PCF 展开式，9 次采样（WebGL 1.0 兼容，无 for 循环） */
export const PCF_3X3_FRAGMENT_CODE = `
vec3 shadowNDC = v_shadowCoord.xyz / v_shadowCoord.w;
vec2 shadowUV = shadowNDC.xy * 0.5 + 0.5;
float bias = u_shadowBias;
float depth = shadowNDC.z * 0.5 + 0.5 - bias;
vec2 texelSize = 1.0 / u_shadowMapSize;
float shadow = 0.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow /= 9.0;
`.trim();

/** 5x5 PCF 展开式，25 次采样（WebGL 1.0 兼容，无 for 循环） */
export const PCF_5X5_FRAGMENT_CODE = `
vec3 shadowNDC = v_shadowCoord.xyz / v_shadowCoord.w;
vec2 shadowUV = shadowNDC.xy * 0.5 + 0.5;
float bias = u_shadowBias;
float depth = shadowNDC.z * 0.5 + 0.5 - bias;
vec2 texelSize = 1.0 / u_shadowMapSize;
float shadow = 0.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-2.0, -2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0, -2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0, -2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0, -2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 2.0, -2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-2.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 2.0, -1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-2.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 2.0,  0.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-2.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 2.0,  1.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-2.0,  2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2(-1.0,  2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 0.0,  2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 1.0,  2.0) * texelSize).r) ? 0.5 : 1.0;
shadow += (depth > texture2D(u_shadowMap, shadowUV + vec2( 2.0,  2.0) * texelSize).r) ? 0.5 : 1.0;
shadow /= 25.0;
`.trim();
