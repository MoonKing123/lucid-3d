/**
 * InstancedMesh — 单 Geometry + Material 渲染多个实例，共用一次 draw call。
 * 基于 WebGL 1.0 ANGLE_instanced_arrays 扩展。
 *
 * API 参考 Three.js InstancedMesh，但简化为仅支持 per-instance 变换和颜色。
 * @see test/unit/renderer/instanced-mesh.test.ts
 */
export const __STUB__ = true;

import { Mesh } from './mesh';
import { Geometry } from './geometry';
import { Material } from './material';
import { identity, type Mat4 } from '../math/mat4';
import { vec3, type Vec3 } from '../math/vec3';

export class InstancedMesh extends Mesh {
  /** 实例数量 */
  readonly count: number;

  /** 所有实例的变换矩阵，紧凑存储：count * 16 floats */
  readonly instanceMatrix: Float32Array;

  /** 可选的 per-instance 颜色，count * 3 floats (RGB)。null = 使用材质颜色。 */
  instanceColor: Float32Array | null;

  constructor(geometry: Geometry, material: Material, count: number) {
    super(geometry, material, 'instanced-mesh');
    this.count = count;
    this.instanceMatrix = new Float32Array(count * 16);
    this.instanceColor = null;
    // 初始化为单位矩阵
    for (let i = 0; i < count; i++) {
      const id = identity();
      this.instanceMatrix.set(id, i * 16);
    }
  }

  /** 设置第 index 个实例的变换矩阵 */
  setMatrixAt(index: number, matrix: Mat4): void {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Instance index ${index} out of range [0, ${this.count})`);
    }
    this.instanceMatrix.set(matrix, index * 16);
  }

  /** 获取第 index 个实例的变换矩阵 */
  getMatrixAt(index: number): Mat4 {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Instance index ${index} out of range [0, ${this.count})`);
    }
    return Array.from(this.instanceMatrix.slice(index * 16, index * 16 + 16)) as unknown as Mat4;
  }

  /** 设置第 index 个实例的颜色。首次调用会自动分配 instanceColor 数组。 */
  setColorAt(index: number, color: Vec3): void {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Instance index ${index} out of range [0, ${this.count})`);
    }
    if (!this.instanceColor) {
      this.instanceColor = new Float32Array(this.count * 3).fill(1);
    }
    this.instanceColor[index * 3] = color[0];
    this.instanceColor[index * 3 + 1] = color[1];
    this.instanceColor[index * 3 + 2] = color[2];
  }

  /** 获取第 index 个实例的颜色 */
  getColorAt(index: number): Vec3 {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Instance index ${index} out of range [0, ${this.count})`);
    }
    if (!this.instanceColor) {
      return vec3(1, 1, 1);
    }
    return vec3(
      this.instanceColor[index * 3],
      this.instanceColor[index * 3 + 1],
      this.instanceColor[index * 3 + 2],
    );
  }
}
