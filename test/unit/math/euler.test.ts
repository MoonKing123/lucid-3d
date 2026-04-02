/**
 * Pre-written tests for Euler — rotation represented as three angles + order.
 * AI must implement src/math/euler.ts to make these pass.
 *
 * API:
 *   type RotationOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'XZY' | 'YZX' | 'ZYX';
 *
 *   class Euler {
 *     x: number;  y: number;  z: number;  order: RotationOrder;
 *
 *     constructor(x?: number, y?: number, z?: number, order?: RotationOrder);
 *     set(x: number, y: number, z: number, order?: RotationOrder): this;
 *     clone(): Euler;
 *     copy(other: Euler): this;
 *     equals(other: Euler): boolean;
 *     setFromQuaternion(q: Quat, order?: RotationOrder): this;
 *     setFromRotationMatrix(m: Mat4, order?: RotationOrder): this;
 *     toQuaternion(): Quat;
 *   }
 *
 * Implementation notes:
 * - Default order is 'XYZ'
 * - Angles are in radians
 * - toQuaternion() and setFromQuaternion() must round-trip correctly
 * - setFromRotationMatrix() extracts Euler angles from a rotation Mat4
 * - All 6 rotation orders must be supported
 * - Use the same Quat type from src/math/quat.ts
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/math/euler';
import { quat, fromAxisAngle, toMat4 } from '../../../src/math/quat';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Euler } = mod;

const PI = Math.PI;
const HALF_PI = PI / 2;
const EPSILON = 1e-6;

function near(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/* ───────────── Construction ───────────── */

describeImpl('Euler — construction', () => {
  it('should default to (0, 0, 0, XYZ)', () => {
    const e = new Euler();
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
    expect(e.z).toBe(0);
    expect(e.order).toBe('XYZ');
  });

  it('should accept initial values', () => {
    const e = new Euler(1, 2, 3, 'YXZ');
    expect(e.x).toBe(1);
    expect(e.y).toBe(2);
    expect(e.z).toBe(3);
    expect(e.order).toBe('YXZ');
  });

  it('should default order to XYZ when only angles given', () => {
    const e = new Euler(0.5, 0.6, 0.7);
    expect(e.order).toBe('XYZ');
  });
});

/* ───────────── set / clone / copy / equals ───────────── */

describeImpl('Euler — set / clone / copy / equals', () => {
  it('set() should update all components', () => {
    const e = new Euler();
    const ret = e.set(1, 2, 3, 'ZYX');
    expect(e.x).toBe(1);
    expect(e.y).toBe(2);
    expect(e.z).toBe(3);
    expect(e.order).toBe('ZYX');
    expect(ret).toBe(e); // chainable
  });

  it('set() without order should keep existing order', () => {
    const e = new Euler(0, 0, 0, 'YXZ');
    e.set(1, 2, 3);
    expect(e.order).toBe('YXZ');
  });

  it('clone() should return an independent copy', () => {
    const a = new Euler(1, 2, 3, 'ZXY');
    const b = a.clone();
    expect(b.x).toBe(1);
    expect(b.y).toBe(2);
    expect(b.z).toBe(3);
    expect(b.order).toBe('ZXY');
    b.x = 99;
    expect(a.x).toBe(1); // original unchanged
  });

  it('copy() should copy from another Euler', () => {
    const a = new Euler(1, 2, 3, 'XZY');
    const b = new Euler();
    const ret = b.copy(a);
    expect(b.x).toBe(1);
    expect(b.y).toBe(2);
    expect(b.z).toBe(3);
    expect(b.order).toBe('XZY');
    expect(ret).toBe(b);
  });

  it('equals() should compare all components and order', () => {
    const a = new Euler(1, 2, 3, 'XYZ');
    const b = new Euler(1, 2, 3, 'XYZ');
    const c = new Euler(1, 2, 3, 'YXZ');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false); // different order
  });
});

/* ───────────── Quaternion conversion ───────────── */

describeImpl('Euler — toQuaternion', () => {
  it('should convert identity euler to identity quaternion', () => {
    const e = new Euler(0, 0, 0);
    const q = e.toQuaternion();
    expect(near(q[0], 0)).toBe(true);
    expect(near(q[1], 0)).toBe(true);
    expect(near(q[2], 0)).toBe(true);
    expect(near(q[3], 1)).toBe(true);
  });

  it('should match quat.fromAxisAngle for single-axis rotation (X)', () => {
    const e = new Euler(HALF_PI, 0, 0, 'XYZ');
    const q = e.toQuaternion();
    const expected = fromAxisAngle(vec3(1, 0, 0), HALF_PI);
    for (let i = 0; i < 4; i++) {
      expect(near(q[i], expected[i])).toBe(true);
    }
  });

  it('should match quat.fromAxisAngle for single-axis rotation (Y)', () => {
    const e = new Euler(0, HALF_PI, 0, 'XYZ');
    const q = e.toQuaternion();
    const expected = fromAxisAngle(vec3(0, 1, 0), HALF_PI);
    for (let i = 0; i < 4; i++) {
      expect(near(q[i], expected[i])).toBe(true);
    }
  });

  it('should match quat.fromAxisAngle for single-axis rotation (Z)', () => {
    const e = new Euler(0, 0, HALF_PI, 'XYZ');
    const q = e.toQuaternion();
    const expected = fromAxisAngle(vec3(0, 0, 1), HALF_PI);
    for (let i = 0; i < 4; i++) {
      expect(near(q[i], expected[i])).toBe(true);
    }
  });
});

describeImpl('Euler — setFromQuaternion (round-trip)', () => {
  it('should round-trip XYZ through quaternion', () => {
    const original = new Euler(0.3, 0.5, 0.7, 'XYZ');
    const q = original.toQuaternion();
    const recovered = new Euler().setFromQuaternion(q, 'XYZ');
    expect(near(recovered.x, original.x)).toBe(true);
    expect(near(recovered.y, original.y)).toBe(true);
    expect(near(recovered.z, original.z)).toBe(true);
  });

  it('should round-trip YXZ through quaternion', () => {
    const original = new Euler(0.2, 0.4, 0.6, 'YXZ');
    const q = original.toQuaternion();
    const recovered = new Euler().setFromQuaternion(q, 'YXZ');
    expect(near(recovered.x, original.x)).toBe(true);
    expect(near(recovered.y, original.y)).toBe(true);
    expect(near(recovered.z, original.z)).toBe(true);
  });

  it('should round-trip ZXY through quaternion', () => {
    const original = new Euler(0.1, -0.3, 0.8, 'ZXY');
    const q = original.toQuaternion();
    const recovered = new Euler().setFromQuaternion(q, 'ZXY');
    expect(near(recovered.x, original.x)).toBe(true);
    expect(near(recovered.y, original.y)).toBe(true);
    expect(near(recovered.z, original.z)).toBe(true);
  });

  it('should handle gimbal lock (pitch near ±90°) gracefully', () => {
    const e = new Euler(0.1, HALF_PI * 0.999, 0.2, 'XYZ');
    const q = e.toQuaternion();
    const r = new Euler().setFromQuaternion(q, 'XYZ');
    const q2 = r.toQuaternion();
    const sign = Math.sign(q[3]) === Math.sign(q2[3]) ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      expect(near(q[i], sign * q2[i], 1e-4)).toBe(true);
    }
  });
});

/* ───────────── setFromRotationMatrix ───────────── */

describeImpl('Euler — setFromRotationMatrix', () => {
  it('should extract identity angles from identity matrix', () => {
    const m = toMat4(quat(0, 0, 0, 1));
    const e = new Euler().setFromRotationMatrix(m, 'XYZ');
    expect(near(e.x, 0)).toBe(true);
    expect(near(e.y, 0)).toBe(true);
    expect(near(e.z, 0)).toBe(true);
  });

  it('should extract correct angles from a known rotation matrix', () => {
    const original = new Euler(0.3, 0.5, 0.7, 'XYZ');
    const q = original.toQuaternion();
    const m = toMat4(q);
    const recovered = new Euler().setFromRotationMatrix(m, 'XYZ');
    expect(near(recovered.x, original.x)).toBe(true);
    expect(near(recovered.y, original.y)).toBe(true);
    expect(near(recovered.z, original.z)).toBe(true);
  });

  it('should work with YXZ order', () => {
    const original = new Euler(0.4, -0.2, 0.6, 'YXZ');
    const q = original.toQuaternion();
    const m = toMat4(q);
    const recovered = new Euler().setFromRotationMatrix(m, 'YXZ');
    expect(near(recovered.x, original.x)).toBe(true);
    expect(near(recovered.y, original.y)).toBe(true);
    expect(near(recovered.z, original.z)).toBe(true);
  });
});

/* ───────────── All 6 rotation orders ───────────── */

describeImpl('Euler — all rotation orders', () => {
  const orders: mod.RotationOrder[] = ['XYZ', 'YXZ', 'ZXY', 'XZY', 'YZX', 'ZYX'];
  const angles = [0.3, -0.5, 0.7];

  for (const order of orders) {
    it(`should round-trip through quaternion with order ${order}`, () => {
      const original = new Euler(angles[0], angles[1], angles[2], order);
      const q = original.toQuaternion();
      const recovered = new Euler().setFromQuaternion(q, order);
      expect(near(recovered.x, original.x, 1e-5)).toBe(true);
      expect(near(recovered.y, original.y, 1e-5)).toBe(true);
      expect(near(recovered.z, original.z, 1e-5)).toBe(true);
    });
  }
});
