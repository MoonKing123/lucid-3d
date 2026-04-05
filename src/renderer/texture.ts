/**
 * Texture — 纹理数据容器（CPU 端）
 * 支持从原始 RGBA 数据构造，以及工厂方法创建常用纹理。
 */

export enum TextureWrap {
  ClampToEdge    = 'clamp',
  Repeat         = 'repeat',
  MirroredRepeat = 'mirror',
}

export enum TextureFilter {
  Nearest              = 'nearest',
  Linear               = 'linear',
  NearestMipmapNearest = 'nearest-mipmap-nearest',
  NearestMipmapLinear  = 'nearest-mipmap-linear',
  LinearMipmapNearest  = 'linear-mipmap-nearest',
  LinearMipmapLinear   = 'linear-mipmap-linear',
}

export class Texture {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  wrapS: TextureWrap   = TextureWrap.ClampToEdge;
  wrapT: TextureWrap   = TextureWrap.ClampToEdge;
  minFilter: TextureFilter = TextureFilter.Nearest;
  magFilter: TextureFilter = TextureFilter.Nearest;
  generateMipmaps: boolean = false;
  flipY: boolean = false;

  private _version: number = 0;
  get version(): number { return this._version; }
  needsUpdate(): void { this._version++; }

  private constructor(width: number, height: number, data: Uint8Array) {
    this.width  = width;
    this.height = height;
    this.data   = data;
  }

  /** 从原始 RGBA Uint8Array 创建纹理（拷贝数据，不共享引用） */
  static fromData(width: number, height: number, data: Uint8Array): Texture {
    return new Texture(width, height, new Uint8Array(data));
  }

  /** 创建 1×1 不透明白色纹理 */
  static defaultWhite(): Texture {
    return new Texture(1, 1, new Uint8Array([255, 255, 255, 255]));
  }

  /**
   * 创建棋盘格纹理（黑白交替，alpha 恒为 255）
   * 像素 (x, y) 颜色由 (x + y) 的奇偶决定：偶数=白，奇数=黑
   */
  static checkerboard(w: number, h: number): Texture {
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const offset = (y * w + x) * 4;
        const white  = (x + y) % 2 === 0;
        const v      = white ? 255 : 0;
        data[offset + 0] = v;
        data[offset + 1] = v;
        data[offset + 2] = v;
        data[offset + 3] = 255;
      }
    }
    return new Texture(w, h, data);
  }
}
