/**
 * Mat4 — pure-function 4x4 matrix math library.
 * Column-major layout (OpenGL/WebGL convention).
 * Mat4 is a Float32Array of length 16.
 * Element at row r, col c is stored at index [r + c*4].
 * All functions are pure (no mutation of inputs).
 */

import { vec3, sub, cross, normalize, dot, type Vec3 } from './vec3';

export type Mat4 = Float32Array;

/** Create a zero matrix (all elements 0). */
export function mat4(): Mat4 {
  return new Float32Array(16);
}

/** Create the identity matrix. */
export function identity(): Mat4 {
  const m = mat4();
  m[0]  = 1;
  m[5]  = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/**
 * Multiply two matrices: a * b.
 * Column-major: result[col*4 + row] = sum over k of a[k*4+row] * b[col*4+k]
 */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = mat4();
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/**
 * Apply translation m * T(v).
 * Translation is stored in column 3 in column-major layout.
 */
export function translate(m: Mat4, v: Vec3): Mat4 {
  const t = identity();
  // Column 3 of translation matrix
  t[12] = v[0];
  t[13] = v[1];
  t[14] = v[2];
  return multiply(m, t);
}

/**
 * Apply scale m * S(v).
 */
export function scale(m: Mat4, v: Vec3): Mat4 {
  const s = mat4();
  s[0]  = v[0];
  s[5]  = v[1];
  s[10] = v[2];
  s[15] = 1;
  return multiply(m, s);
}

/**
 * Apply rotation around X axis: m * Rx(angle).
 * angle in radians.
 */
export function rotateX(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = mat4();
  // Column-major rotation around X:
  // [1,  0,  0,  0]
  // [0,  c,  s,  0]
  // [0, -s,  c,  0]
  // [0,  0,  0,  1]
  r[0]  = 1;
  r[5]  = c;
  r[6]  = s;
  r[9]  = -s;
  r[10] = c;
  r[15] = 1;
  return multiply(m, r);
}

/**
 * Apply rotation around Y axis: m * Ry(angle).
 * angle in radians.
 */
export function rotateY(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = mat4();
  // Column-major rotation around Y:
  // [ c,  0, -s,  0]
  // [ 0,  1,  0,  0]
  // [ s,  0,  c,  0]
  // [ 0,  0,  0,  1]
  r[0]  = c;
  r[2]  = -s;
  r[5]  = 1;
  r[8]  = s;
  r[10] = c;
  r[15] = 1;
  return multiply(m, r);
}

/**
 * Apply rotation around Z axis: m * Rz(angle).
 * angle in radians.
 */
export function rotateZ(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = mat4();
  // Column-major rotation around Z:
  // [ c,  s,  0,  0]
  // [-s,  c,  0,  0]
  // [ 0,  0,  1,  0]
  // [ 0,  0,  0,  1]
  r[0]  = c;
  r[1]  = s;
  r[4]  = -s;
  r[5]  = c;
  r[10] = 1;
  r[15] = 1;
  return multiply(m, r);
}

/**
 * Create a perspective projection matrix.
 * fov: vertical field of view in radians
 * aspect: width / height
 * near, far: near and far clip planes
 * Standard OpenGL convention, column-major output.
 */
export function perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  const m = mat4();
  // Column-major perspective matrix:
  // [f/aspect,  0,              0,  0]
  // [0,         f,              0,  0]
  // [0,         0,  (far+near)*nf, -1]
  // [0,         0, 2*far*near*nf,  0]
  m[0]  = f / aspect;
  m[5]  = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  m[15] = 0;
  return m;
}

/**
 * Create a view matrix (lookAt).
 * eye: camera position
 * target: point to look at
 * up: world up vector
 */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  // Forward vector: from eye toward target, then negate for right-hand view space
  const f = normalize(sub(target, eye));
  // Right vector
  const r = normalize(cross(f, up));
  // Recomputed up
  const u = cross(r, f);

  // Build column-major view matrix
  // The view matrix is:
  // [rx,  ux, -fx, 0]   (column 0: x-axis)
  // [ry,  uy, -fy, 0]   (column 1: y-axis)
  // [rz,  uz, -fz, 0]   (column 2: z-axis)
  // [-dot(r,eye), -dot(u,eye), dot(f,eye), 1]  (column 3: translation)
  const m = mat4();
  // Column 0
  m[0] = r[0];
  m[1] = u[0];
  m[2] = -f[0];
  m[3] = 0;
  // Column 1
  m[4] = r[1];
  m[5] = u[1];
  m[6] = -f[1];
  m[7] = 0;
  // Column 2
  m[8]  = r[2];
  m[9]  = u[2];
  m[10] = -f[2];
  m[11] = 0;
  // Column 3 (translation)
  m[12] = -dot(r, eye);
  m[13] = -dot(u, eye);
  m[14] =  dot(f, eye);
  m[15] = 1;
  return m;
}

/**
 * Compute the inverse of a 4x4 matrix using cofactor expansion.
 * Returns null if the matrix is singular (determinant ~= 0).
 */
export function invert(m: Mat4): Mat4 | null {
  const a = m;
  const inv = new Float32Array(16);

  inv[0]  =  a[5]*a[10]*a[15] - a[5]*a[11]*a[14] - a[9]*a[6]*a[15] + a[9]*a[7]*a[14] + a[13]*a[6]*a[11] - a[13]*a[7]*a[10];
  inv[4]  = -a[4]*a[10]*a[15] + a[4]*a[11]*a[14] + a[8]*a[6]*a[15] - a[8]*a[7]*a[14] - a[12]*a[6]*a[11] + a[12]*a[7]*a[10];
  inv[8]  =  a[4]*a[9]*a[15]  - a[4]*a[11]*a[13] - a[8]*a[5]*a[15] + a[8]*a[7]*a[13] + a[12]*a[5]*a[11] - a[12]*a[7]*a[9];
  inv[12] = -a[4]*a[9]*a[14]  + a[4]*a[10]*a[13] + a[8]*a[5]*a[14] - a[8]*a[6]*a[13] - a[12]*a[5]*a[10] + a[12]*a[6]*a[9];

  inv[1]  = -a[1]*a[10]*a[15] + a[1]*a[11]*a[14] + a[9]*a[2]*a[15] - a[9]*a[3]*a[14] - a[13]*a[2]*a[11] + a[13]*a[3]*a[10];
  inv[5]  =  a[0]*a[10]*a[15] - a[0]*a[11]*a[14] - a[8]*a[2]*a[15] + a[8]*a[3]*a[14] + a[12]*a[2]*a[11] - a[12]*a[3]*a[10];
  inv[9]  = -a[0]*a[9]*a[15]  + a[0]*a[11]*a[13] + a[8]*a[1]*a[15] - a[8]*a[3]*a[13] - a[12]*a[1]*a[11] + a[12]*a[3]*a[9];
  inv[13] =  a[0]*a[9]*a[14]  - a[0]*a[10]*a[13] - a[8]*a[1]*a[14] + a[8]*a[2]*a[13] + a[12]*a[1]*a[10] - a[12]*a[2]*a[9];

  inv[2]  =  a[1]*a[6]*a[15]  - a[1]*a[7]*a[14]  - a[5]*a[2]*a[15] + a[5]*a[3]*a[14] + a[13]*a[2]*a[7]  - a[13]*a[3]*a[6];
  inv[6]  = -a[0]*a[6]*a[15]  + a[0]*a[7]*a[14]  + a[4]*a[2]*a[15] - a[4]*a[3]*a[14] - a[12]*a[2]*a[7]  + a[12]*a[3]*a[6];
  inv[10] =  a[0]*a[5]*a[15]  - a[0]*a[7]*a[13]  - a[4]*a[1]*a[15] + a[4]*a[3]*a[13] + a[12]*a[1]*a[7]  - a[12]*a[3]*a[5];
  inv[14] = -a[0]*a[5]*a[14]  + a[0]*a[6]*a[13]  + a[4]*a[1]*a[14] - a[4]*a[2]*a[13] - a[12]*a[1]*a[6]  + a[12]*a[2]*a[5];

  inv[3]  = -a[1]*a[6]*a[11]  + a[1]*a[7]*a[10]  + a[5]*a[2]*a[11] - a[5]*a[3]*a[10] - a[9]*a[2]*a[7]   + a[9]*a[3]*a[6];
  inv[7]  =  a[0]*a[6]*a[11]  - a[0]*a[7]*a[10]  - a[4]*a[2]*a[11] + a[4]*a[3]*a[10] + a[8]*a[2]*a[7]   - a[8]*a[3]*a[6];
  inv[11] = -a[0]*a[5]*a[11]  + a[0]*a[7]*a[9]   + a[4]*a[1]*a[11] - a[4]*a[3]*a[9]  - a[8]*a[1]*a[7]   + a[8]*a[3]*a[5];
  inv[15] =  a[0]*a[5]*a[10]  - a[0]*a[6]*a[9]   - a[4]*a[1]*a[10] + a[4]*a[2]*a[9]  + a[8]*a[1]*a[6]   - a[8]*a[2]*a[5];

  const det = a[0]*inv[0] + a[1]*inv[4] + a[2]*inv[8] + a[3]*inv[12];
  if (Math.abs(det) < 1e-10) return null;

  const invDet = 1.0 / det;
  for (let i = 0; i < 16; i++) {
    inv[i] *= invDet;
  }
  return inv;
}

/**
 * Transform a 3D point by a 4x4 matrix, performing perspective divide (w-divide).
 * Treats the point as a homogeneous coordinate (x, y, z, 1).
 */
export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = p[0], y = p[1], z = p[2];
  const rx = m[0]*x + m[4]*y + m[8]*z  + m[12];
  const ry = m[1]*x + m[5]*y + m[9]*z  + m[13];
  const rz = m[2]*x + m[6]*y + m[10]*z + m[14];
  const rw = m[3]*x + m[7]*y + m[11]*z + m[15];

  if (rw !== 0 && rw !== 1) {
    return vec3(rx / rw, ry / rw, rz / rw);
  }
  return vec3(rx, ry, rz);
}
