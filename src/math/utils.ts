/**
 * MathUtils — 集中式数学工具函数。
 * 纯函数，零依赖，覆盖游戏开发常用的数值操作。
 */

/** 将 value 限制在 [min, max] 范围内 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** 线性插值 a→b，t ∈ [0,1] */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 逆线性插值：给定 value 在 [a,b] 中的位置，返回 t；a===b 时返回 0 */
export function inverseLerp(a: number, b: number, value: number): number {
  const d = b - a;
  return d === 0 ? 0 : (value - a) / d;
}

/** Hermite 平滑插值（3t²-2t³），edge0→edge1 之间返回 [0,1] */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 角度转弧度 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** 弧度转角度 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/** 将 value 从 [inMin, inMax] 映射到 [outMin, outMax] */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

/** 返回 [min, max) 范围内的随机浮点数 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** 判断 n 是否为 2 的幂（n > 0） */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/** 返回 ≥ n 的最小 2 的幂；nextPowerOfTwo(0) === 1 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}
