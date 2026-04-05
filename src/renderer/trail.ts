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
 * 几何体为三角形列表（quad → 2 triangles），宽度从最新点到最老点线性衰减，
 * 颜色支持渐变。maxPoints 控制环形缓冲区大小。
 *
 * @module renderer/trail
 */

import { Node3D } from '../core/node3d';
import { type Vec3, vec3, cross, length, normalize } from '../math/vec3';

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

  constructor(opts?: TrailRendererOptions) {
    super('trail');
    this.width = opts?.width ?? 0.5;
    this.lifetime = opts?.lifetime ?? 1.0;
    this.maxPoints = opts?.maxPoints ?? 64;
    const baseColor = opts?.color ?? vec3(1, 1, 1);
    this.color = baseColor;
    this.colorEnd = opts?.colorEnd ?? vec3(baseColor[0], baseColor[1], baseColor[2]);
    this.trailPoints = [];
  }

  /**
   * Sample current world position and age existing points.
   * Call once per frame with delta time.
   */
  update(dt: number): void {
    // 老化所有现有点
    for (const pt of this.trailPoints) {
      pt.age += dt;
    }

    // 移除超过生命周期的点（最旧的点在前面）
    while (this.trailPoints.length > 0 && this.trailPoints[0].age > this.lifetime) {
      this.trailPoints.shift();
    }

    // 采样父节点的世界坐标
    const src = this.parent ?? this;
    const worldPos = src.getWorldPosition();

    // 静止去重：与最后一个点距离过小则跳过
    if (this.trailPoints.length > 0) {
      const last = this.trailPoints[this.trailPoints.length - 1];
      const dx = worldPos[0] - last.position[0];
      const dy = worldPos[1] - last.position[1];
      const dz = worldPos[2] - last.position[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1e-4) return;
    }

    // 添加新轨迹点
    this.trailPoints.push({
      position: vec3(worldPos[0], worldPos[1], worldPos[2]),
      age: 0,
    });

    // 环形缓冲区：超过 maxPoints 时移除最旧的点
    while (this.trailPoints.length > this.maxPoints) {
      this.trailPoints.shift();
    }
  }

  /** Clear all trail points. */
  reset(): void {
    this.trailPoints.length = 0;
  }

  /** Get flat Float32Array of trail quad strip positions for rendering. */
  getPositions(): Float32Array {
    const pts = this.trailPoints;
    const n = pts.length;
    if (n < 2) return new Float32Array(0);

    const up = vec3(0, 1, 0);
    const right = vec3(1, 0, 0);

    // (n-1) 个 quad，每个 quad 2 个三角形，每个三角形 3 个顶点，每个顶点 3 个分量
    const result = new Float32Array((n - 1) * 6 * 3);
    let idx = 0;

    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i].position;
      const p1 = pts[i + 1].position;

      // 轨迹方向
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dz = p1[2] - p0[2];
      const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const dir = segLen > 0 ? vec3(dx / segLen, dy / segLen, dz / segLen) : vec3(1, 0, 0);

      // 垂直方向：cross(dir, up)，若平行则改用 cross(dir, right)
      let perp = cross(dir, up);
      if (length(perp) < 1e-5) {
        perp = cross(dir, right);
      }
      perp = normalize(perp);

      // 宽度从最旧点（0）到最新点（width）线性增加
      const t0 = i / (n - 1);
      const t1 = (i + 1) / (n - 1);
      const w0 = this.width * t0;
      const w1 = this.width * t1;

      // 四边形四个顶点
      const v0x = p0[0] - perp[0] * w0; const v0y = p0[1] - perp[1] * w0; const v0z = p0[2] - perp[2] * w0;
      const v1x = p0[0] + perp[0] * w0; const v1y = p0[1] + perp[1] * w0; const v1z = p0[2] + perp[2] * w0;
      const v2x = p1[0] - perp[0] * w1; const v2y = p1[1] - perp[1] * w1; const v2z = p1[2] - perp[2] * w1;
      const v3x = p1[0] + perp[0] * w1; const v3y = p1[1] + perp[1] * w1; const v3z = p1[2] + perp[2] * w1;

      // 三角形 1：v0, v1, v3
      result[idx++] = v0x; result[idx++] = v0y; result[idx++] = v0z;
      result[idx++] = v1x; result[idx++] = v1y; result[idx++] = v1z;
      result[idx++] = v3x; result[idx++] = v3y; result[idx++] = v3z;

      // 三角形 2：v0, v3, v2
      result[idx++] = v0x; result[idx++] = v0y; result[idx++] = v0z;
      result[idx++] = v3x; result[idx++] = v3y; result[idx++] = v3z;
      result[idx++] = v2x; result[idx++] = v2y; result[idx++] = v2z;
    }

    return result;
  }

  /** Get flat Float32Array of per-vertex colors (RGB, 0-1). */
  getColors(): Float32Array {
    const pts = this.trailPoints;
    const n = pts.length;
    if (n < 2) return new Float32Array(0);

    // 与 getPositions() 顶点数相同：(n-1) * 6 顶点 * 3 分量
    const result = new Float32Array((n - 1) * 6 * 3);
    let idx = 0;

    for (let i = 0; i < n - 1; i++) {
      // t=0 → colorEnd（最旧），t=1 → color（最新）
      const t0 = i / (n - 1);
      const t1 = (i + 1) / (n - 1);

      const c0r = this.colorEnd[0] + (this.color[0] - this.colorEnd[0]) * t0;
      const c0g = this.colorEnd[1] + (this.color[1] - this.colorEnd[1]) * t0;
      const c0b = this.colorEnd[2] + (this.color[2] - this.colorEnd[2]) * t0;

      const c1r = this.colorEnd[0] + (this.color[0] - this.colorEnd[0]) * t1;
      const c1g = this.colorEnd[1] + (this.color[1] - this.colorEnd[1]) * t1;
      const c1b = this.colorEnd[2] + (this.color[2] - this.colorEnd[2]) * t1;

      // 三角形 1：v0 (c0), v1 (c0), v3 (c1)
      result[idx++] = c0r; result[idx++] = c0g; result[idx++] = c0b;
      result[idx++] = c0r; result[idx++] = c0g; result[idx++] = c0b;
      result[idx++] = c1r; result[idx++] = c1g; result[idx++] = c1b;

      // 三角形 2：v0 (c0), v3 (c1), v2 (c1)
      result[idx++] = c0r; result[idx++] = c0g; result[idx++] = c0b;
      result[idx++] = c1r; result[idx++] = c1g; result[idx++] = c1b;
      result[idx++] = c1r; result[idx++] = c1g; result[idx++] = c1b;
    }

    return result;
  }
}
