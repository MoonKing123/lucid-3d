/**
 * SplatmapMaterial — 多层纹理混合材质
 *
 * 用途：大地图地形按 splatmap RGBA 通道权重混合 4 层漫反射纹理
 * （例：R=草地 G=沙漠 B=岩石 A=雪地）。
 *
 * API 设计（Forge 实现时参考）：
 * - new SplatmapMaterial({ splatmap, layer0, layer1, layer2, layer3, tiling })
 * - splatmap: RGBA 纹理，4 通道分别对应 layer0-3 权重（归一化或自动归一化）
 * - layer0-3: 4 个 diffuse 纹理
 * - tiling: 每层纹理的平铺倍数（Vec2 或 number[4]）
 * - 光照支持 (diffuse with PhongMaterial 等价的 directional light)
 */

export const __STUB__ = true;

import type { Texture } from '../renderer/texture';

export interface SplatmapMaterialOptions {
  splatmap: Texture;
  layer0: Texture;
  layer1: Texture;
  layer2?: Texture | null;
  layer3?: Texture | null;
  tiling?: number | [number, number, number, number];
}

export class SplatmapMaterial {
  constructor(_opts: SplatmapMaterialOptions) {
    throw new Error('Not implemented');
  }
}
