/**
 * ParticleRenderer — GPU 粒子点精灵渲染器。
 *
 * 将 ParticleEmitter 的 CPU 粒子数据上传到 GPU，使用 gl.POINTS 模式渲染。
 * 每个粒子是一个点精灵：vertex shader 设置 gl_PointSize，
 * fragment shader 使用 gl_PointCoord 做圆形遮罩（软边缘衰减）。
 *
 * 渲染时启用 alpha blend (SRC_ALPHA, ONE_MINUS_SRC_ALPHA)，禁用深度写入。
 *
 * @see test/unit/renderer/particle-renderer.test.ts
 * @module
 */

export const __STUB__ = true;

import type { Mat4 } from '../math/mat4';
import type { ParticleEmitter } from './particle-emitter';

export class ParticleRenderer {
  /**
   * @param gl WebGL 1.0 上下文
   * @param maxParticles 最大粒子数（预分配缓冲区大小）
   */
  constructor(_gl: WebGLRenderingContext, _maxParticles: number) {
    throw new Error('Not implemented — stub');
  }

  /**
   * 从发射器读取存活粒子数据并更新 GPU 缓冲区。
   * 读取 getPositions() / getSizes() / getColors() / getAlphas()。
   */
  update(_emitter: ParticleEmitter): void {
    throw new Error('Not implemented — stub');
  }

  /**
   * 渲染粒子。使用 gl.POINTS + gl_PointSize。
   * @param viewProj 视图投影矩阵
   */
  render(_viewProj: Mat4): void {
    throw new Error('Not implemented — stub');
  }

  /** 释放 GPU 资源（shader program, buffers） */
  dispose(): void {
    throw new Error('Not implemented — stub');
  }
}
