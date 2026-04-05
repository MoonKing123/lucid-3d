/**
 * Color — RGB 颜色类，游戏开发标准颜色操作。
 * 内部以 [0,1] 浮点存储，支持 hex/HSL 互转、插值、混合。
 */

import { vec3, type Vec3 } from './vec3';

export class Color {
  r: number;
  g: number;
  b: number;

  constructor(r = 0, g = 0, b = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  /** 从十六进制字符串或数字创建 Color，如 '#ff0000' 或 0xff0000 */
  static fromHex(hex: string | number): Color {
    let n: number;
    if (typeof hex === 'number') {
      n = hex;
    } else {
      const s = hex.startsWith('#') ? hex.slice(1) : hex;
      n = parseInt(s, 16);
    }
    const r = ((n >> 16) & 0xff) / 255;
    const g = ((n >> 8) & 0xff) / 255;
    const b = (n & 0xff) / 255;
    return new Color(r, g, b);
  }

  /** 转为十六进制字符串 '#rrggbb' */
  toHex(): string {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /** 转为十六进制数字 0xRRGGBB */
  toHexNumber(): number {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return (r << 16) | (g << 8) | b;
  }

  /** 从 HSL 创建 Color，h/s/l 均 [0,1] */
  static fromHSL(h: number, s: number, l: number): Color {
    if (s === 0) {
      return new Color(l, l, l);
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return new Color(
      hue2rgb(p, q, h + 1 / 3),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1 / 3),
    );
  }

  /** 转为 HSL 对象，h/s/l 均 [0,1] */
  toHSL(): { h: number; s: number; l: number } {
    const { r, g, b } = this;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;

    return { h, s, l };
  }

  /** 设置 RGB 分量 */
  set(r: number, g: number, b: number): this {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }

  /** 克隆 */
  clone(): Color {
    return new Color(this.r, this.g, this.b);
  }

  /** 从另一个 Color 复制 */
  copy(other: Color): this {
    this.r = other.r;
    this.g = other.g;
    this.b = other.b;
    return this;
  }

  /** 相等判断（epsilon 1e-6） */
  equals(other: Color): boolean {
    const eps = 1e-6;
    return (
      Math.abs(this.r - other.r) < eps &&
      Math.abs(this.g - other.g) < eps &&
      Math.abs(this.b - other.b) < eps
    );
  }

  /** 线性插值 a→b */
  static lerp(a: Color, b: Color, t: number): Color {
    return new Color(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t,
    );
  }

  /** 分量相乘（用于光照颜色调制） */
  multiply(other: Color): this {
    this.r *= other.r;
    this.g *= other.g;
    this.b *= other.b;
    return this;
  }

  /** 标量乘法 */
  multiplyScalar(s: number): this {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    return this;
  }

  /** 分量相加 */
  add(other: Color): this {
    this.r += other.r;
    this.g += other.g;
    this.b += other.b;
    return this;
  }

  /** 转为 [r, g, b] 数组（用于 uniform 上传） */
  toArray(): [number, number, number] {
    return [this.r, this.g, this.b];
  }

  /** 转为 Vec3（兼容引擎现有 Vec3 颜色接口） */
  toVec3(): Vec3 {
    return vec3(this.r, this.g, this.b);
  }
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
