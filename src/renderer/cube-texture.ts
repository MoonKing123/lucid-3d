/**
 * CubeTexture — 6 面立方体贴图，用于天空盒和环境映射。
 *
 * 每个面是一张正方形 RGBA 图片（Uint8Array），按标准顺序排列：
 * +X, -X, +Y, -Y, +Z, -Z（gl.TEXTURE_CUBE_MAP_POSITIVE_X 等）。
 *
 * @see test/unit/renderer/cube-texture.test.ts
 * @module
 */

/** 立方体贴图的 6 个面索引 */
export const CubeTextureFace = {
  PositiveX: 0,
  NegativeX: 1,
  PositiveY: 2,
  NegativeY: 3,
  PositiveZ: 4,
  NegativeZ: 5,
} as const;

export type CubeTextureFaceValue = (typeof CubeTextureFace)[keyof typeof CubeTextureFace];

export class CubeTexture {
  /** 每个面的像素数据（RGBA），null 表示未设置 */
  readonly faces: (Uint8Array | null)[] = [null, null, null, null, null, null];
  /** 每个面的边长（像素） */
  readonly faceSize: number;
  /** 是否需要重新上传 GPU */
  needsUpdate: boolean = false;

  constructor(faceSize: number) {
    this.faceSize = faceSize;
  }

  /** 设置某个面的像素数据 */
  setFace(face: CubeTextureFaceValue, data: Uint8Array): void {
    const expected = this.faceSize * this.faceSize * 4;
    if (data.byteLength !== expected) {
      throw new Error(
        `CubeTexture.setFace: 数据长度不正确。期望 ${expected} 字节，实际 ${data.byteLength} 字节。`
      );
    }
    this.faces[face] = data;
    this.needsUpdate = true;
  }

  /** 是否所有 6 个面都已设置 */
  isComplete(): boolean {
    return this.faces.every((f) => f !== null);
  }

  /** 释放所有面数据 */
  dispose(): void {
    for (let i = 0; i < 6; i++) {
      this.faces[i] = null;
    }
  }
}
