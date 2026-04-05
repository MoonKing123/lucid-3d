/**
 * LineRenderer — 3D 线段/折线渲染。
 * 支持 LINES（成对线段）、LINE_STRIP（连续折线）、LINE_LOOP（封闭折线）三种绘制模式。
 * 用于调试可视化（路径/包围盒/射线）和游戏效果（激光/轨迹/连线）。
 */

export const __STUB__ = true;

import { type Vec3, vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Material } from './material';

export type LineDrawMode = 'LINES' | 'LINE_STRIP' | 'LINE_LOOP';

/**
 * LineGeometry — 线段顶点数据容器。
 * 存储 3D 点列表和可选逐顶点颜色。
 */
export class LineGeometry {
  positions: Float32Array;
  colors: Float32Array;

  constructor(_opts: { points: Vec3[]; colors?: Vec3[] }) {
    throw new Error('Not implemented');
  }

  /** 更新点列表（重新分配缓冲区） */
  setPoints(_points: Vec3[]): void {
    throw new Error('Not implemented');
  }

  /** 更新逐顶点颜色 */
  setColors(_colors: Vec3[]): void {
    throw new Error('Not implemented');
  }

  /** 点数量 */
  get pointCount(): number {
    throw new Error('Not implemented');
  }
}

/**
 * LineMaterial — 线段材质。
 * 统一颜色 + lineWidth + opacity。
 * lineWidth 在 WebGL 中受驱动限制（多数平台仅支持 1.0），但 API 层面保留设置。
 */
export class LineMaterial extends Material {
  color: Vec3;
  lineWidth: number;

  constructor(_opts?: { color?: Vec3; lineWidth?: number; opacity?: number }) {
    super();
    throw new Error('Not implemented');
  }
}

/**
 * Line — 3D 线段节点，参与场景图。
 * 结合 LineGeometry + LineMaterial + LineDrawMode 描述一条可渲染的线段/折线。
 */
export class Line extends Node3D {
  geometry: LineGeometry;
  material: LineMaterial;
  drawMode: LineDrawMode;

  constructor(
    _geometry: LineGeometry,
    _material?: LineMaterial,
    _drawMode?: LineDrawMode,
  ) {
    super('line');
    throw new Error('Not implemented');
  }
}
