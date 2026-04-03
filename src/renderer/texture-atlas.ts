/**
 * TextureAtlas — 精灵表 / 图集 UV 区域管理。
 * 支持均匀网格布局和自定义命名区域，用于粒子纹理、UI 图标、Tile 地图等。
 * @see test/unit/renderer/texture-atlas.test.ts
 */

export const __STUB__ = true;

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

  private constructor(_texture: Texture, _cols: number, _rows: number) {
    throw new Error('STUB: TextureAtlas not implemented');
  }

  /** 创建均匀网格图集 */
  static fromGrid(_texture: Texture, _cols: number, _rows: number): TextureAtlas {
    throw new Error('STUB: TextureAtlas.fromGrid not implemented');
  }

  /** 获取网格索引对应的区域 */
  getRegion(_index: number): AtlasRegion {
    throw new Error('STUB: TextureAtlas.getRegion not implemented');
  }

  /** 定义自定义命名区域（像素坐标） */
  defineRegion(_name: string, _x: number, _y: number, _width: number, _height: number): void {
    throw new Error('STUB: TextureAtlas.defineRegion not implemented');
  }

  /** 获取命名区域 */
  getNamedRegion(_name: string): AtlasRegion | undefined {
    throw new Error('STUB: TextureAtlas.getNamedRegion not implemented');
  }

  /** 网格区域总数 */
  get regionCount(): number {
    throw new Error('STUB: TextureAtlas.regionCount not implemented');
  }

  /** 所有命名区域的名称列表 */
  get namedRegions(): string[] {
    throw new Error('STUB: TextureAtlas.namedRegions not implemented');
  }
}
