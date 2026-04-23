/**
 * DebugDraw — immediate-mode 调试绘制 API
 *
 * 提供 frame 内有效的 line/sphere/box/arrow 绘制，调用一次只在当前帧显示，
 * 自动累积到 buffer，flush() 后清空。供 AI Agent 调试运行时几何/路径/碰撞用。
 *
 * @see test/unit/debug/debug-draw.test.ts
 *
 * STUB — Phase 44 Architect 预写
 */

export const __STUB__ = true;

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

export class DebugDraw {
  drawLine(_start: Vec3, _end: Vec3, _color?: Vec3, _thickness?: number): void {
    throw new Error('Not implemented');
  }

  drawSphere(_center: Vec3, _radius: number, _color?: Vec3, _segments?: number): void {
    throw new Error('Not implemented');
  }

  drawBox(_min: Vec3, _max: Vec3, _color?: Vec3): void {
    throw new Error('Not implemented');
  }

  drawArrow(_origin: Vec3, _direction: Vec3, _length: number, _color?: Vec3, _headSize?: number): void {
    throw new Error('Not implemented');
  }

  getLines(): readonly DebugLine[] {
    throw new Error('Not implemented');
  }

  getSpheres(): readonly DebugSphere[] {
    throw new Error('Not implemented');
  }

  getBoxes(): readonly DebugBox[] {
    throw new Error('Not implemented');
  }

  getArrows(): readonly DebugArrow[] {
    throw new Error('Not implemented');
  }

  flush(): void {
    throw new Error('Not implemented');
  }

  get count(): number {
    throw new Error('Not implemented');
  }
}
