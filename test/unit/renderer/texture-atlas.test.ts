/**
 * TextureAtlas — 精灵表 / 图集 UV 区域管理预写测试（Architect）
 * AI 必须实现 src/renderer/texture-atlas.ts 使这些测试通过。
 *
 * API:
 *   interface AtlasRegion {
 *     u0: number; v0: number;  // 左上角 UV
 *     u1: number; v1: number;  // 右下角 UV
 *     width: number;           // 像素宽度
 *     height: number;          // 像素高度
 *   }
 *
 *   class TextureAtlas {
 *     readonly texture: Texture;
 *     readonly cols: number;
 *     readonly rows: number;
 *     static fromGrid(texture: Texture, cols: number, rows: number): TextureAtlas;
 *     getRegion(index: number): AtlasRegion;
 *     defineRegion(name: string, x: number, y: number, width: number, height: number): void;
 *     getNamedRegion(name: string): AtlasRegion | undefined;
 *     get regionCount(): number;
 *     get namedRegions(): string[];
 *   }
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../src/renderer/texture-atlas';
import { Texture } from '../../src/renderer/texture';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { TextureAtlas } = mod as any;

/** 辅助：创建指定尺寸的 dummy 纹理 */
function dummyTexture(w: number, h: number): Texture {
  return Texture.fromData(w, h, new Uint8Array(w * h * 4));
}

/* ═══════════════════════════════════════════
   fromGrid — 均匀网格图集创建
   ═══════════════════════════════════════════ */

describeImpl('TextureAtlas.fromGrid', () => {
  it('创建 4×2 网格图集', () => {
    const tex = dummyTexture(128, 64);
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    expect(atlas.texture).toBe(tex);
    expect(atlas.cols).toBe(4);
    expect(atlas.rows).toBe(2);
    expect(atlas.regionCount).toBe(8);
  });

  it('1×1 网格覆盖整张纹理', () => {
    const tex = dummyTexture(64, 64);
    const atlas = TextureAtlas.fromGrid(tex, 1, 1);
    expect(atlas.regionCount).toBe(1);
    const r = atlas.getRegion(0);
    expect(r.u0).toBeCloseTo(0);
    expect(r.v0).toBeCloseTo(0);
    expect(r.u1).toBeCloseTo(1);
    expect(r.v1).toBeCloseTo(1);
    expect(r.width).toBe(64);
    expect(r.height).toBe(64);
  });
});

/* ═══════════════════════════════════════════
   getRegion — 网格索引查询
   ═══════════════════════════════════════════ */

describeImpl('TextureAtlas.getRegion', () => {
  const tex = dummyTexture(128, 64);

  it('索引 0 返回左上角区域', () => {
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    const r = atlas.getRegion(0);
    expect(r.u0).toBeCloseTo(0);
    expect(r.v0).toBeCloseTo(0);
    expect(r.u1).toBeCloseTo(0.25);
    expect(r.v1).toBeCloseTo(0.5);
    expect(r.width).toBe(32);
    expect(r.height).toBe(32);
  });

  it('索引 3 返回第一行最后一列', () => {
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    const r = atlas.getRegion(3);
    expect(r.u0).toBeCloseTo(0.75);
    expect(r.v0).toBeCloseTo(0);
    expect(r.u1).toBeCloseTo(1.0);
    expect(r.v1).toBeCloseTo(0.5);
  });

  it('索引 4 返回第二行第一列', () => {
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    const r = atlas.getRegion(4);
    expect(r.u0).toBeCloseTo(0);
    expect(r.v0).toBeCloseTo(0.5);
    expect(r.u1).toBeCloseTo(0.25);
    expect(r.v1).toBeCloseTo(1.0);
  });

  it('索引 7 返回右下角区域', () => {
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    const r = atlas.getRegion(7);
    expect(r.u0).toBeCloseTo(0.75);
    expect(r.v0).toBeCloseTo(0.5);
    expect(r.u1).toBeCloseTo(1.0);
    expect(r.v1).toBeCloseTo(1.0);
  });

  it('越界索引抛出错误', () => {
    const atlas = TextureAtlas.fromGrid(tex, 4, 2);
    expect(() => atlas.getRegion(-1)).toThrow();
    expect(() => atlas.getRegion(8)).toThrow();
  });
});

/* ═══════════════════════════════════════════
   defineRegion / getNamedRegion — 自定义命名区域
   ═══════════════════════════════════════════ */

describeImpl('TextureAtlas named regions', () => {
  it('定义并获取命名区域（像素坐标 → UV）', () => {
    const tex = dummyTexture(256, 128);
    const atlas = TextureAtlas.fromGrid(tex, 1, 1);
    atlas.defineRegion('icon', 64, 32, 32, 16);
    const r = atlas.getNamedRegion('icon');
    expect(r).toBeDefined();
    expect(r!.u0).toBeCloseTo(64 / 256);
    expect(r!.v0).toBeCloseTo(32 / 128);
    expect(r!.u1).toBeCloseTo((64 + 32) / 256);
    expect(r!.v1).toBeCloseTo((32 + 16) / 128);
    expect(r!.width).toBe(32);
    expect(r!.height).toBe(16);
  });

  it('获取未定义的命名区域返回 undefined', () => {
    const tex = dummyTexture(64, 64);
    const atlas = TextureAtlas.fromGrid(tex, 2, 2);
    expect(atlas.getNamedRegion('missing')).toBeUndefined();
  });

  it('namedRegions 返回所有名称', () => {
    const tex = dummyTexture(64, 64);
    const atlas = TextureAtlas.fromGrid(tex, 1, 1);
    atlas.defineRegion('a', 0, 0, 32, 32);
    atlas.defineRegion('b', 32, 0, 32, 32);
    const names = atlas.namedRegions;
    expect(names).toContain('a');
    expect(names).toContain('b');
    expect(names.length).toBe(2);
  });

  it('同名区域覆盖旧定义', () => {
    const tex = dummyTexture(128, 128);
    const atlas = TextureAtlas.fromGrid(tex, 1, 1);
    atlas.defineRegion('x', 0, 0, 10, 10);
    atlas.defineRegion('x', 50, 50, 20, 20);
    const r = atlas.getNamedRegion('x');
    expect(r!.width).toBe(20);
    expect(atlas.namedRegions.length).toBe(1);
  });
});
