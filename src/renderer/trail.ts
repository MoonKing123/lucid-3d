/**
 * TrailRenderer — 动态拖尾效果渲染器。
 *
 * 跟随父节点的世界位置，持续生成飘带状拖尾几何体。
 * 适用于：剑气、导弹尾迹、速度线、魔法弹道等视觉效果。
 *
 * 使用方式：
 *   const trail = new TrailRenderer({ width: 0.5, lifetime: 1.0 });
 *   movingObject.addChild(trail);
 *   // 每帧调用 trail.update(dt)
 *
 * 几何体为四边形条带（quad strip），宽度从最新点到最老点线性衰减，
 * 颜色和透明度可配置渐变。maxPoints 控制环形缓冲区大小。
 *
 * @module renderer/trail
 */

export const __STUB__ = true;

import { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';

export interface TrailPoint {
  position: Vec3;
  age: number; // seconds since creation
}

export interface TrailRendererOptions {
  /** Half-width of the trail at the newest point. Default 0.5. */
  width?: number;
  /** Seconds before a trail point expires. Default 1.0. */
  lifetime?: number;
  /** Maximum number of trail points in the ring buffer. Default 64. */
  maxPoints?: number;
  /** Trail color at newest point. Default [1,1,1]. */
  color?: Vec3;
  /** Trail color at oldest point (gradient end). Default same as color. */
  colorEnd?: Vec3;
}

export class TrailRenderer extends Node3D {
  width: number;
  lifetime: number;
  maxPoints: number;
  color: Vec3;
  colorEnd: Vec3;
  readonly trailPoints: TrailPoint[];

  constructor(_opts?: TrailRendererOptions) {
    super('trail');
    this.width = 0.5;
    this.lifetime = 1.0;
    this.maxPoints = 64;
    this.color = [1, 1, 1] as unknown as Vec3;
    this.colorEnd = [1, 1, 1] as unknown as Vec3;
    this.trailPoints = [];
    throw new Error('Not implemented — stub');
  }

  /**
   * Sample current world position and age existing points.
   * Call once per frame with delta time.
   */
  update(_dt: number): void {
    throw new Error('Not implemented — stub');
  }

  /** Clear all trail points. */
  reset(): void {
    throw new Error('Not implemented — stub');
  }

  /** Get flat Float32Array of trail quad strip positions for rendering. */
  getPositions(): Float32Array {
    throw new Error('Not implemented — stub');
  }

  /** Get flat Float32Array of per-vertex colors (RGB, 0-1). */
  getColors(): Float32Array {
    throw new Error('Not implemented — stub');
  }
}
