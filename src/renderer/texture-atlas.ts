/**
 * TextureAtlas — 精灵表 / 图集 UV 区域管理。
 * 支持均匀网格布局和自定义命名区域，用于粒子纹理、UI 图标、Tile 地图等。
 * @see test/unit/renderer/texture-atlas.test.ts
 */

import type { Texture } from './texture';

export interface AtlasRegion {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  width: number;
  height: number;
}

export class TextureAtlas {
  readonly texture: Texture;
  readonly cols: number;
  readonly rows: number;

  private readonly _named: Map<string, AtlasRegion> = new Map();

  private constructor(texture: Texture, cols: number, rows: number) {
    this.texture = texture;
    this.cols = cols;
    this.rows = rows;
  }

  /** 创建均匀网格图集 */
  static fromGrid(texture: Texture, cols: number, rows: number): TextureAtlas {
    return new TextureAtlas(texture, cols, rows);
  }

  /** 获取网格索引对应的区域（索引从 0 开始，左到右、上到下） */
  getRegion(index: number): AtlasRegion {
    const total = this.cols * this.rows;
    if (index < 0 || index >= total) {
      throw new RangeError(`TextureAtlas.getRegion: 索引 ${index} 越界（共 ${total} 个区域）`);
    }
    const col = index % this.cols;
    const row = Math.floor(index / this.cols);
    return {
      u0: col / this.cols,
      v0: row / this.rows,
      u1: (col + 1) / this.cols,
      v1: (row + 1) / this.rows,
      width: this.texture.width / this.cols,
      height: this.texture.height / this.rows,
    };
  }

  /** 定义自定义命名区域（像素坐标转 UV）。同名覆盖旧定义 */
  defineRegion(name: string, x: number, y: number, width: number, height: number): void {
    this._named.set(name, {
      u0: x / this.texture.width,
      v0: y / this.texture.height,
      u1: (x + width) / this.texture.width,
      v1: (y + height) / this.texture.height,
      width,
      height,
    });
  }

  /** 获取命名区域，不存在返回 undefined */
  getNamedRegion(name: string): AtlasRegion | undefined {
    return this._named.get(name);
  }

  /** 网格区域总数 */
  get regionCount(): number {
    return this.cols * this.rows;
  }

  /** 所有命名区域的名称列表 */
  get namedRegions(): string[] {
    return Array.from(this._named.keys());
  }
}
