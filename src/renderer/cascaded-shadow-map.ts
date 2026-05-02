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
import { type Vec3, vec3, normalize } from '../math/vec3';
import { type Mat4, perspective, lookAt, ortho, multiply, invert, transformPoint } from '../math/mat4';
import { ShadowMap } from './shadow-map';
import { type CascadeSplit, splitFrustum } from './cascade-splitter';

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

/** 为每个级联的 ShadowMap 附加 size 属性（ShadowMap 内部用 resolution） */
class CsmEntry extends ShadowMap {
  readonly size: number;
  constructor(size: number, softness: 0 | 1 | 2, bias: number) {
    super({ resolution: size, softness, bias });
    this.size = size;
  }
}

/** NDC 立方体 8 个角点 */
const NDC_CORNERS: [number, number, number][] = [
  [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
  [-1, -1,  1], [1, -1,  1], [-1, 1,  1], [1, 1,  1],
];

export class CascadedShadowMap {
  readonly numCascades: number;
  readonly size: number;
  readonly softness: 0 | 1 | 2;
  readonly bias: number;
  readonly lambda: number;
  /** N 个 ShadowMap 实例，按 cascade index 排列 */
  readonly cascades: ShadowMap[];
  /** 每级 frustum split (near/far)，由 update() 刷新 */
  splits: CascadeSplit[] = [];
  /** 每级 light-space view-proj matrix，由 update() 刷新 */
  lightSpaceMatrices: Mat4[] = [];

  constructor(opts: CascadedShadowMapOptions) {
    if (opts.numCascades < 1) {
      throw new Error('CascadedShadowMap: numCascades 必须 >= 1');
    }

    this.numCascades = opts.numCascades;
    this.size        = opts.size     ?? 1024;
    this.softness    = opts.softness ?? 0;
    this.bias        = opts.bias     ?? 0.005;
    this.lambda      = opts.lambda   ?? 0.5;

    this.cascades            = [];
    this.lightSpaceMatrices  = [];

    for (let i = 0; i < this.numCascades; i++) {
      this.cascades.push(new CsmEntry(this.size, this.softness, this.bias));
      this.lightSpaceMatrices.push(new Float32Array(16) as Mat4);
    }
  }

  /** 根据相机和方向光更新每级 split + light-space matrix。每帧调用一次。 */
  update(camera: PerspectiveCamera, lightDir: Vec3): void {
    this.splits = splitFrustum({
      near:        camera.near,
      far:         camera.far,
      numCascades: this.numCascades,
      lambda:      this.lambda,
    });

    const nLight = normalize(lightDir);
    const up = Math.abs(nLight[1]) > 0.999 ? vec3(1, 0, 0) : vec3(0, 1, 0);

    for (let i = 0; i < this.numCascades; i++) {
      const { near, far } = this.splits[i];

      // 用子 frustum 的 near/far 构建反投影矩阵，把 NDC 角点变换到世界空间
      const subProj = perspective(camera.fov, camera.aspect, near, far);
      const vp      = multiply(subProj, camera.viewMatrix);
      const invVP   = invert(vp);
      if (!invVP) continue;

      const corners = NDC_CORNERS.map(([x, y, z]) =>
        transformPoint(invVP, vec3(x, y, z)),
      );

      // 计算子 frustum 中心
      let cx = 0, cy = 0, cz = 0;
      for (const c of corners) { cx += c[0]; cy += c[1]; cz += c[2]; }
      cx /= 8; cy /= 8; cz /= 8;
      const center = vec3(cx, cy, cz);

      // 将光源眼点移到中心后方足够远，确保所有角点在光源前方（负 Z 侧）
      const eye = vec3(
        center[0] - nLight[0] * 1000,
        center[1] - nLight[1] * 1000,
        center[2] - nLight[2] * 1000,
      );
      const lightView = lookAt(eye, center, up);

      // 在光源空间求 AABB
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const c of corners) {
        const lc = transformPoint(lightView, c);
        if (lc[0] < minX) minX = lc[0];
        if (lc[0] > maxX) maxX = lc[0];
        if (lc[1] < minY) minY = lc[1];
        if (lc[1] > maxY) maxY = lc[1];
        if (lc[2] < minZ) minZ = lc[2];
        if (lc[2] > maxZ) maxZ = lc[2];
      }

      // OpenGL 约定：相机看向 -Z，near/far 为正值
      // 光源空间 z ∈ [minZ, maxZ]（均为负值），near = -maxZ，far = -minZ
      const lightProj = ortho(minX, maxX, minY, maxY, -maxZ, -minZ);
      this.lightSpaceMatrices[i] = multiply(lightProj, lightView);
    }
  }

  /** 释放所有级联的 RenderTarget GPU 资源 */
  dispose(gl: WebGLRenderingContext): void {
    for (const cascade of this.cascades) {
      cascade.dispose(gl);
    }
  }
}
