/**
 * TextureLoader — 图片数据解码为 Texture 的预写测试（Architect）
 * AI 必须实现 src/loader/texture-loader.ts 使这些测试通过。
 *
 * API:
 *   class TextureLoader {
 *     // 从 ImageData（canvas getImageData 结果）同步创建 Texture
 *     static fromImageData(imageData: { width: number; height: number; data: Uint8ClampedArray }): Texture;
 *
 *     // 从原始 RGBA 字节创建 Texture，带维度验证
 *     static fromRGBA(width: number, height: number, data: Uint8Array): Texture;
 *
 *     // 异步解码图片 ArrayBuffer（PNG/JPEG）为 Texture。
 *     // 使用 createImageBitmap（浏览器）或传入的 decode 函数。
 *     static fromArrayBuffer(
 *       data: ArrayBuffer,
 *       decode?: (ab: ArrayBuffer) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>
 *     ): Promise<Texture>;
 *   }
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/loader/texture-loader';
import { Texture } from '../../src/renderer/texture';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { TextureLoader } = mod as any;

/* ═══════════════════════════════════════════
   fromRGBA — 从原始 RGBA 字节创建
   ═══════════════════════════════════════════ */

describeImpl('TextureLoader.fromRGBA', () => {
  it('从正确尺寸的 RGBA 数据创建 Texture', () => {
    const w = 2, h = 2;
    const data = new Uint8Array(w * h * 4);
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255; // red pixel
    const tex = TextureLoader.fromRGBA(w, h, data);
    expect(tex).toBeInstanceOf(Texture);
    expect(tex.width).toBe(w);
    expect(tex.height).toBe(h);
    expect(tex.data[0]).toBe(255); // red channel
  });

  it('1×1 纹理正确创建', () => {
    const data = new Uint8Array([128, 64, 32, 255]);
    const tex = TextureLoader.fromRGBA(1, 1, data);
    expect(tex.width).toBe(1);
    expect(tex.height).toBe(1);
    expect(tex.data[0]).toBe(128);
    expect(tex.data[1]).toBe(64);
    expect(tex.data[2]).toBe(32);
    expect(tex.data[3]).toBe(255);
  });

  it('数据长度不匹配时抛出错误', () => {
    const data = new Uint8Array(3); // 不是 w*h*4
    expect(() => TextureLoader.fromRGBA(2, 2, data)).toThrow();
  });

  it('宽或高为 0 时抛出错误', () => {
    expect(() => TextureLoader.fromRGBA(0, 1, new Uint8Array(0))).toThrow();
    expect(() => TextureLoader.fromRGBA(1, 0, new Uint8Array(0))).toThrow();
  });
});

/* ═══════════════════════════════════════════
   fromImageData — 从 ImageData 同步创建
   ═══════════════════════════════════════════ */

describeImpl('TextureLoader.fromImageData', () => {
  it('从 ImageData 对象创建 Texture', () => {
    const imageData = {
      width: 3,
      height: 2,
      data: new Uint8ClampedArray(3 * 2 * 4),
    };
    imageData.data[0] = 255; // R of pixel (0,0)
    const tex = TextureLoader.fromImageData(imageData);
    expect(tex).toBeInstanceOf(Texture);
    expect(tex.width).toBe(3);
    expect(tex.height).toBe(2);
    expect(tex.data[0]).toBe(255);
  });

  it('Uint8ClampedArray 数据被拷贝为 Uint8Array', () => {
    const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 40]),
    };
    const tex = TextureLoader.fromImageData(imageData);
    expect(tex.data).toBeInstanceOf(Uint8Array);
    expect(tex.data[0]).toBe(10);
    // 修改原始数据不影响纹理
    imageData.data[0] = 99;
    expect(tex.data[0]).toBe(10);
  });
});

/* ═══════════════════════════════════════════
   fromArrayBuffer — 异步解码图片字节
   ═══════════════════════════════════════════ */

describeImpl('TextureLoader.fromArrayBuffer', () => {
  it('使用自定义 decode 函数解码 ArrayBuffer', async () => {
    const fakeImage = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(4 * 4 * 4).fill(128),
    };
    const decode = async (_ab: ArrayBuffer) => fakeImage;
    const ab = new ArrayBuffer(16);
    const tex = await TextureLoader.fromArrayBuffer(ab, decode);
    expect(tex).toBeInstanceOf(Texture);
    expect(tex.width).toBe(4);
    expect(tex.height).toBe(4);
    expect(tex.data[0]).toBe(128);
  });

  it('decode 函数抛错时 Promise reject', async () => {
    const decode = async () => { throw new Error('decode failed'); };
    await expect(TextureLoader.fromArrayBuffer(new ArrayBuffer(0), decode))
      .rejects.toThrow('decode failed');
  });

  it('空 ArrayBuffer + 无 decode 函数时抛错', async () => {
    // 无 createImageBitmap 环境下，无自定义 decode 应抛错
    await expect(TextureLoader.fromArrayBuffer(new ArrayBuffer(0)))
      .rejects.toThrow();
  });
});
