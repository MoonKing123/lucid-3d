/**
 * Vec3 — pure-function 3D vector math library.
 * Vec3 is a Float32Array of length 3.
 * All functions are pure (no mutation of inputs).
 */

export type Vec3 = Float32Array;

/** Create a new Vec3 from components (defaults to 0). */
export function vec3(x = 0, y = 0, z = 0): Vec3 {
  const v = new Float32Array(3);
  v[0] = x;
  v[1] = y;
  v[2] = z;
  return v;
}

/** Add two vectors, returning a new Vec3. */
export function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
}

/** Subtract b from a, returning a new Vec3. */
export function sub(a: Vec3, b: Vec3): Vec3 {
  return vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Scale a vector by a scalar, returning a new Vec3. */
export function scale(v: Vec3, s: number): Vec3 {
  return vec3(v[0] * s, v[1] * s, v[2] * s);
}

/** Compute the dot product of two vectors. */
export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Compute the cross product of two vectors, returning a new Vec3. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  );
}

/** Compute the Euclidean length of a vector. */
export function length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/** Normalize a vector to unit length, returning a new Vec3. */
export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return vec3(0, 0, 0);
  return scale(v, 1 / len);
}

/** Compute the Euclidean distance between two points. */
export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/** Negate all components of a vector, returning a new Vec3. */
export function negate(v: Vec3): Vec3 {
  return vec3(-v[0], -v[1], -v[2]);
}

/** Linearly interpolate between two vectors at parameter t. */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return vec3(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}
