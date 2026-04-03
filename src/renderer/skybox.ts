/**
 * SkyboxRenderer — 天空盒渲染器，使用 CubeTexture 渲染无限远的背景。
 *
 * 技术方案：全屏四边形 + 逆 VP 矩阵反投影，采样 samplerCube。
 * 渲染时去除相机平移（仅保留旋转），深度设为最远（gl_Position.z = gl_Position.w），
 * 深度函数设为 LEQUAL 以便场景物体覆盖天空盒。
 *
 * @see test/unit/renderer/skybox.test.ts
 * @module
 */

export const __STUB__ = true;

import type { CubeTexture } from './cube-texture';
import type { Camera } from '../core/camera';

export class SkyboxRenderer {
  /** @param gl WebGL 1.0 上下文 */
  constructor(_gl: WebGLRenderingContext) {
    throw new Error('Not implemented — stub');
  }

  /**
   * 渲染天空盒。应在场景物体之前调用。
   * @param texture 完整的 6 面 CubeTexture
   * @param camera  当前相机（使用其 viewProjectionMatrix）
   */
  render(_texture: CubeTexture, _camera: Camera): void {
    throw new Error('Not implemented — stub');
  }

  /** 释放 GPU 资源 */
  dispose(): void {
    throw new Error('Not implemented — stub');
  }
}
