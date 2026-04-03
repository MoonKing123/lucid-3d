/**
 * CubeTexture — 6 面立方体贴图，用于天空盒和环境映射。
 *
 * 每个面是一张正方形 RGBA 图片（Uint8Array），按标准顺序排列：
 * +X, -X, +Y, -Y, +Z, -Z（gl.TEXTURE_CUBE_MAP_POSITIVE_X 等）。
 *
 * @see test/unit/renderer/cube-texture.test.ts
 * @module
 */

export const __STUB__ = true;

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

  constructor(_faceSize: number) {
    this.faceSize = _faceSize;
  }

  /** 设置某个面的像素数据 */
  setFace(_face: CubeTextureFaceValue, _data: Uint8Array): void {
    throw new Error('Not implemented — stub');
  }

  /** 是否所有 6 个面都已设置 */
  isComplete(): boolean {
    throw new Error('Not implemented — stub');
  }

  /** 释放所有面数据 */
  dispose(): void {
    throw new Error('Not implemented — stub');
  }
}
