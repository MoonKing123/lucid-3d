/**
 * TextureLoader — 图片数据解码为 Texture 的加载器。
 * 支持从 ImageData、原始 RGBA 字节、或图片 ArrayBuffer（PNG/JPEG）创建纹理。
 * @see test/unit/loader/texture-loader.test.ts
 */

import { Texture } from '../renderer/texture';

export class TextureLoader {
  /** 从 ImageData（canvas getImageData 结果）同步创建 Texture */
  static fromImageData(imageData: { width: number; height: number; data: Uint8ClampedArray }): Texture {
    // 拷贝为 Uint8Array，不共享引用
    const data = new Uint8Array(imageData.data);
    return Texture.fromData(imageData.width, imageData.height, data);
  }

  /** 从原始 RGBA 字节创建 Texture，带维度验证 */
  static fromRGBA(width: number, height: number, data: Uint8Array): Texture {
    if (width <= 0 || height <= 0) {
      throw new Error(`TextureLoader.fromRGBA: 宽高必须大于 0，得到 ${width}x${height}`);
    }
    const expected = width * height * 4;
    if (data.length !== expected) {
      throw new Error(`TextureLoader.fromRGBA: 数据长度不匹配，期望 ${expected}，实际 ${data.length}`);
    }
    return Texture.fromData(width, height, data);
  }

  /**
   * 异步解码图片 ArrayBuffer（PNG/JPEG）为 Texture。
   * 使用 createImageBitmap（浏览器）或传入的 decode 函数。
   */
  static async fromArrayBuffer(
    data: ArrayBuffer,
    decode?: (ab: ArrayBuffer) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>,
  ): Promise<Texture> {
    if (decode) {
      const imageData = await decode(data);
      return TextureLoader.fromImageData(imageData);
    }

    // 浏览器环境：使用 createImageBitmap + OffscreenCanvas
    if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      const blob = new Blob([data]);
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      return TextureLoader.fromImageData(imageData);
    }

    throw new Error(
      'TextureLoader.fromArrayBuffer: 无法解码图片，请提供 decode 函数或在支持 createImageBitmap 的环境中运行',
    );
  }
}
