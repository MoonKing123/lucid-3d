/**
 * LineRenderer — 3D 线段/折线渲染。
 * 支持 LINES（成对线段）、LINE_STRIP（连续折线）、LINE_LOOP（封闭折线）三种绘制模式。
 * 用于调试可视化（路径/包围盒/射线）和游戏效果（激光/轨迹/连线）。
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Node3D } from '../core/node3d';
import { Material } from './material';

export type LineDrawMode = 'LINES' | 'LINE_STRIP' | 'LINE_LOOP';

// 线段顶点着色器：MVP 变换，逐顶点颜色直通
const LINE_VERT_SRC = `
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_mvp;
varying vec3 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  v_color = a_color;
}
`.trim();

// 线段片元着色器：v_color * u_color，u_opacity 控制透明度
const LINE_FRAG_SRC = `
precision mediump float;
uniform vec3 u_color;
uniform float u_opacity;
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color * u_color, u_opacity);
}
`.trim();

/**
 * LineGeometry — 线段顶点数据容器。
 * 存储 3D 点列表和可选逐顶点颜色。
 */
export class LineGeometry {
  positions: Float32Array;
  colors: Float32Array;

  constructor(opts: { points: Vec3[]; colors?: Vec3[] }) {
    this.positions = LineGeometry._toBuffer(opts.points);
    this.colors = opts.colors
      ? LineGeometry._toBuffer(opts.colors)
      : new Float32Array(opts.points.length * 3).fill(1);
  }

  /** 更新点列表（重新分配缓冲区） */
  setPoints(points: Vec3[]): void {
    this.positions = LineGeometry._toBuffer(points);
  }

  /** 更新逐顶点颜色 */
  setColors(colors: Vec3[]): void {
    this.colors = LineGeometry._toBuffer(colors);
  }

  /** 点数量 */
  get pointCount(): number {
    return this.positions.length / 3;
  }

  private static _toBuffer(vecs: Vec3[]): Float32Array {
    const buf = new Float32Array(vecs.length * 3);
    for (let i = 0; i < vecs.length; i++) {
      buf[i * 3]     = vecs[i][0];
      buf[i * 3 + 1] = vecs[i][1];
      buf[i * 3 + 2] = vecs[i][2];
    }
    return buf;
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

  constructor(opts?: { color?: Vec3; lineWidth?: number; opacity?: number }) {
    super({ vertexShader: LINE_VERT_SRC, fragmentShader: LINE_FRAG_SRC });
    this.color = opts?.color ?? vec3(1, 1, 1);
    this.lineWidth = opts?.lineWidth ?? 1;
    this.opacity = opts?.opacity ?? 1;
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
    geometry: LineGeometry,
    material?: LineMaterial,
    drawMode?: LineDrawMode,
  ) {
    super('line');
    this.geometry = geometry;
    this.material = material ?? new LineMaterial();
    this.drawMode = drawMode ?? 'LINE_STRIP';
  }
}
