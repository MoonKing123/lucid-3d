/**
 * Skeleton & Bone 骨骼系统。
 * @see test/unit/animation/skeleton.test.ts
 */

import { multiply } from '../math/mat4';
import { quatToMat4 } from '../math/quat';

export interface BoneData {
  name: string;
  parentIndex: number; // -1 表示根骨骼
}

/**
 * 由 position、rotation、scale 合成局部矩阵（T * R * S，列主序）。
 */
function compose(
  px: number, py: number, pz: number,
  rx: number, ry: number, rz: number, rw: number,
  sx: number, sy: number, sz: number,
): Float32Array {
  // R 矩阵由四元数生成
  const rot = new Float32Array(4);
  rot[0] = rx; rot[1] = ry; rot[2] = rz; rot[3] = rw;
  const R = quatToMat4(rot);

  // TRS = T * R * S：将 R 的列分别按 scale 缩放，再附加平移
  const m = new Float32Array(16);
  m[0]  = R[0]  * sx;  m[1]  = R[1]  * sx;  m[2]  = R[2]  * sx;  m[3]  = 0;
  m[4]  = R[4]  * sy;  m[5]  = R[5]  * sy;  m[6]  = R[6]  * sy;  m[7]  = 0;
  m[8]  = R[8]  * sz;  m[9]  = R[9]  * sz;  m[10] = R[10] * sz;  m[11] = 0;
  m[12] = px;          m[13] = py;           m[14] = pz;           m[15] = 1;
  return m;
}

export class Skeleton {
  readonly bones: ReadonlyArray<BoneData>;
  readonly boneCount: number;
  readonly inverseBindMatrices: Float32Array;
  readonly boneMatrices: Float32Array;
  readonly localPositions: Float32Array;
  readonly localRotations: Float32Array;
  readonly localScales: Float32Array;

  // rest pose 快照
  private _restPositions: Float32Array;
  private _restRotations: Float32Array;
  private _restScales: Float32Array;

  constructor(bones: BoneData[], inverseBindMatrices: Float32Array) {
    this.bones = bones;
    this.boneCount = bones.length;
    this.inverseBindMatrices = inverseBindMatrices;
    this.boneMatrices = new Float32Array(this.boneCount * 16);

    // 初始化 localPositions = [0,0,0] per bone
    this.localPositions = new Float32Array(this.boneCount * 3);

    // 初始化 localRotations = [0,0,0,1] per bone（单位四元数）
    this.localRotations = new Float32Array(this.boneCount * 4);
    for (let i = 0; i < this.boneCount; i++) {
      this.localRotations[i * 4 + 3] = 1; // w = 1
    }

    // 初始化 localScales = [1,1,1] per bone
    this.localScales = new Float32Array(this.boneCount * 3);
    for (let i = 0; i < this.boneCount * 3; i++) {
      this.localScales[i] = 1;
    }

    // rest pose 初始化为默认值（identity）
    this._restPositions = new Float32Array(this.localPositions);
    this._restRotations = new Float32Array(this.localRotations);
    this._restScales    = new Float32Array(this.localScales);
  }

  /**
   * 按拓扑顺序（parent index < child index）更新骨骼矩阵。
   * boneMatrices[i] = worldMatrix[i] * inverseBindMatrices[i]
   */
  update(): void {
    const worldMatrices: Float32Array[] = new Array(this.boneCount);

    for (let i = 0; i < this.boneCount; i++) {
      const p3 = i * 3;
      const p4 = i * 4;

      const localMat = compose(
        this.localPositions[p3],     this.localPositions[p3 + 1], this.localPositions[p3 + 2],
        this.localRotations[p4],     this.localRotations[p4 + 1], this.localRotations[p4 + 2], this.localRotations[p4 + 3],
        this.localScales[p3],        this.localScales[p3 + 1],    this.localScales[p3 + 2],
      );

      const parentIndex = this.bones[i].parentIndex;
      worldMatrices[i] = parentIndex === -1
        ? localMat
        : multiply(worldMatrices[parentIndex], localMat);

      // boneMatrix[i] = worldMatrix[i] * IBM[i]
      const ibm = this.inverseBindMatrices.subarray(i * 16, i * 16 + 16);
      const bm = multiply(worldMatrices[i], ibm);
      this.boneMatrices.set(bm, i * 16);
    }
  }

  /** 线性扫描返回骨骼索引，未找到返回 -1 */
  getBoneIndex(name: string): number {
    for (let i = 0; i < this.boneCount; i++) {
      if (this.bones[i].name === name) return i;
    }
    return -1;
  }

  /** 将当前变换快照为 rest pose */
  setRestPose(): void {
    this._restPositions.set(this.localPositions);
    this._restRotations.set(this.localRotations);
    this._restScales.set(this.localScales);
  }

  /** 从 rest pose 快照恢复变换 */
  resetToRestPose(): void {
    this.localPositions.set(this._restPositions);
    this.localRotations.set(this._restRotations);
    this.localScales.set(this._restScales);
  }
}
