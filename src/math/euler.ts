/**
 * STUB — Euler angle rotation (not yet implemented).
 * @see test/unit/math/euler.test.ts
 */
export const __STUB__ = true;

export type RotationOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'XZY' | 'YZX' | 'ZYX';

export class Euler {
  x: number;
  y: number;
  z: number;
  order: RotationOrder;

  constructor(_x = 0, _y = 0, _z = 0, _order: RotationOrder = 'XYZ') {
    this.x = _x;
    this.y = _y;
    this.z = _z;
    this.order = _order;
    throw new Error('Not implemented');
  }

  set(_x: number, _y: number, _z: number, _order?: RotationOrder): this {
    throw new Error('Not implemented');
  }

  clone(): Euler {
    throw new Error('Not implemented');
  }

  copy(_other: Euler): this {
    throw new Error('Not implemented');
  }

  equals(_other: Euler): boolean {
    throw new Error('Not implemented');
  }

  setFromQuaternion(_q: Float32Array, _order?: RotationOrder): this {
    throw new Error('Not implemented');
  }

  setFromRotationMatrix(_m: Float32Array, _order?: RotationOrder): this {
    throw new Error('Not implemented');
  }

  toQuaternion(): Float32Array {
    throw new Error('Not implemented');
  }
}
