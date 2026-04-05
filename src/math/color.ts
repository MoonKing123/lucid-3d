/**
 * Color — RGB 颜色类，游戏开发标准颜色操作。
 * 内部以 [0,1] 浮点存储，支持 hex/HSL 互转、插值、混合。
 */

export const __STUB__ = true;

import { type Vec3 } from './vec3';

export class Color {
  r: number;
  g: number;
  b: number;

  constructor(_r?: number, _g?: number, _b?: number) {
    this.r = 0; this.g = 0; this.b = 0;
    throw new Error('Not implemented');
  }

  /** 从十六进制字符串或数字创建 Color，如 '#ff0000' 或 0xff0000 */
  static fromHex(_hex: string | number): Color { throw new Error('Not implemented'); }

  /** 转为十六进制字符串 '#rrggbb' */
  toHex(): string { throw new Error('Not implemented'); }

  /** 转为十六进制数字 0xRRGGBB */
  toHexNumber(): number { throw new Error('Not implemented'); }

  /** 从 HSL 创建 Color，h/s/l 均 [0,1] */
  static fromHSL(_h: number, _s: number, _l: number): Color { throw new Error('Not implemented'); }

  /** 转为 HSL 对象，h/s/l 均 [0,1] */
  toHSL(): { h: number; s: number; l: number } { throw new Error('Not implemented'); }

  /** 设置 RGB 分量 */
  set(_r: number, _g: number, _b: number): this { throw new Error('Not implemented'); }

  /** 克隆 */
  clone(): Color { throw new Error('Not implemented'); }

  /** 从另一个 Color 复制 */
  copy(_other: Color): this { throw new Error('Not implemented'); }

  /** 相等判断（epsilon 1e-6） */
  equals(_other: Color): boolean { throw new Error('Not implemented'); }

  /** 线性插值 a→b */
  static lerp(_a: Color, _b: Color, _t: number): Color { throw new Error('Not implemented'); }

  /** 分量相乘（用于光照颜色调制） */
  multiply(_other: Color): this { throw new Error('Not implemented'); }

  /** 标量乘法 */
  multiplyScalar(_s: number): this { throw new Error('Not implemented'); }

  /** 分量相加 */
  add(_other: Color): this { throw new Error('Not implemented'); }

  /** 转为 [r, g, b] 数组（用于 uniform 上传） */
  toArray(): [number, number, number] { throw new Error('Not implemented'); }

  /** 转为 Vec3（兼容引擎现有 Vec3 颜色接口） */
  toVec3(): Vec3 { throw new Error('Not implemented'); }
}
