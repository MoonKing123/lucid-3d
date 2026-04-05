/**
 * MathUtils — 集中式数学工具函数。
 * 纯函数，零依赖，覆盖游戏开发常用的数值操作。
 */

export const __STUB__ = true;

/** 将 value 限制在 [min, max] 范围内 */
export function clamp(_value: number, _min: number, _max: number): number {
  throw new Error('Not implemented');
}

/** 线性插值 a→b，t ∈ [0,1] */
export function lerp(_a: number, _b: number, _t: number): number {
  throw new Error('Not implemented');
}

/** 逆线性插值：给定 value 在 [a,b] 中的位置，返回 t */
export function inverseLerp(_a: number, _b: number, _value: number): number {
  throw new Error('Not implemented');
}

/** Hermite 平滑插值，edge0→edge1 之间返回 [0,1] */
export function smoothstep(_edge0: number, _edge1: number, _x: number): number {
  throw new Error('Not implemented');
}

/** 角度转弧度 */
export function degToRad(_degrees: number): number {
  throw new Error('Not implemented');
}

/** 弧度转角度 */
export function radToDeg(_radians: number): number {
  throw new Error('Not implemented');
}

/** 将 value 从 [inMin, inMax] 映射到 [outMin, outMax] */
export function mapRange(_value: number, _inMin: number, _inMax: number, _outMin: number, _outMax: number): number {
  throw new Error('Not implemented');
}

/** 返回 [min, max) 范围内的随机浮点数 */
export function randomRange(_min: number, _max: number): number {
  throw new Error('Not implemented');
}

/** 判断 n 是否为 2 的幂 */
export function isPowerOfTwo(_n: number): boolean {
  throw new Error('Not implemented');
}

/** 返回 ≥ n 的最小 2 的幂 */
export function nextPowerOfTwo(_n: number): number {
  throw new Error('Not implemented');
}
