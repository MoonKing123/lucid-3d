/**
 * TextureLoader — 图片数据解码为 Texture 的加载器。
 * 支持从 ImageData、原始 RGBA 字节、或图片 ArrayBuffer（PNG/JPEG）创建纹理。
 * @see test/unit/loader/texture-loader.test.ts
 */

export const __STUB__ = true;

import { Texture } from '../renderer/texture';

export class TextureLoader {
  /** 从 ImageData（canvas getImageData 结果）同步创建 Texture */
  static fromImageData(_imageData: { width: number; height: number; data: Uint8ClampedArray }): Texture {
    throw new Error('STUB: TextureLoader.fromImageData not implemented');
  }

  /** 从原始 RGBA 字节创建 Texture，带维度验证 */
  static fromRGBA(_width: number, _height: number, _data: Uint8Array): Texture {
    throw new Error('STUB: TextureLoader.fromRGBA not implemented');
  }

  /**
   * 异步解码图片 ArrayBuffer（PNG/JPEG）为 Texture。
   * 使用 createImageBitmap（浏览器）或传入的 decode 函数。
   */
  static async fromArrayBuffer(
    _data: ArrayBuffer,
    _decode?: (ab: ArrayBuffer) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>,
  ): Promise<Texture> {
    throw new Error('STUB: TextureLoader.fromArrayBuffer not implemented');
  }
}
