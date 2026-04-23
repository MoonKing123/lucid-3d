/**
 * DebugDraw — immediate-mode 调试绘制 API
 *
 * 提供 frame 内有效的 line/sphere/box/arrow 绘制，调用一次只在当前帧显示，
 * 自动累积到 buffer，flush() 后清空。供 AI Agent 调试运行时几何/路径/碰撞用。
 *
 * @see test/unit/debug/debug-draw.test.ts
 */

import type { Vec3 } from '../math/vec3';

export interface DebugLine {
  start: Vec3;
  end: Vec3;
  color: Vec3;
  thickness: number;
}

export interface DebugSphere {
  center: Vec3;
  radius: number;
  color: Vec3;
  segments: number;
}

export interface DebugBox {
  min: Vec3;
  max: Vec3;
  color: Vec3;
}

export interface DebugArrow {
  origin: Vec3;
  direction: Vec3;
  length: number;
  color: Vec3;
  headSize: number;
}

const WHITE: Vec3 = [1, 1, 1];

export class DebugDraw {
  private _lines: DebugLine[] = [];
  private _spheres: DebugSphere[] = [];
  private _boxes: DebugBox[] = [];
  private _arrows: DebugArrow[] = [];

  drawLine(start: Vec3, end: Vec3, color: Vec3 = WHITE, thickness: number = 1): void {
    this._lines.push({ start, end, color, thickness });
  }

  drawSphere(center: Vec3, radius: number, color: Vec3 = WHITE, segments: number = 16): void {
    if (radius <= 0) throw new Error(`drawSphere: radius 必须大于 0，收到 ${radius}`);
    this._spheres.push({ center, radius, color, segments });
  }

  drawBox(min: Vec3, max: Vec3, color: Vec3 = WHITE): void {
    this._boxes.push({ min, max, color });
  }

  drawArrow(origin: Vec3, direction: Vec3, length: number, color: Vec3 = WHITE, headSize?: number): void {
    this._arrows.push({ origin, direction, length, color, headSize: headSize ?? 0.2 * length });
  }

  getLines(): readonly DebugLine[] {
    return this._lines;
  }

  getSpheres(): readonly DebugSphere[] {
    return this._spheres;
  }

  getBoxes(): readonly DebugBox[] {
    return this._boxes;
  }

  getArrows(): readonly DebugArrow[] {
    return this._arrows;
  }

  flush(): void {
    this._lines = [];
    this._spheres = [];
    this._boxes = [];
    this._arrows = [];
  }

  get count(): number {
    return this._lines.length + this._spheres.length + this._boxes.length + this._arrows.length;
  }
}
