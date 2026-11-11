/**
 * mat4 — 4×4 matrices for Parts A and C.
 *
 * CONVENTIONS (the tests check exactly these):
 *   • A matrix is a Float32Array(16) in COLUMN-MAJOR order — the layout WebGPU
 *     expects for a mat4x4f in a uniform buffer. Element (row r, column c)
 *     lives at index  c * 4 + r.  The translation of an affine matrix is
 *     therefore at indices 12, 13, 14.
 *   • Column vectors: a point p is transformed as  M · p.
 *     multiply(A, B) returns A·B, so B is applied FIRST.
 *   • Right-handed world space. Angles in RADIANS. A positive angle rotates
 *     counter-clockwise when you look down the axis towards the origin
 *     (rotateZ(π/2) takes +x to +y).
 *   • View space: the camera sits at the origin and looks down −z, +y is up.
 *   • Clip space is WebGPU's: after the divide by w, x and y are in [−1, 1]
 *     and z is in [0, 1] (near → 0, far → 1). NOT OpenGL's [−1, 1].
 *
 * No maths libraries (no gl-matrix, no Three.js). Tests: tests/mat4.test.js
 */
import { todo } from './todo.js';
import * as v from './vec3.js';


/* ------------------------------------------------------------- Part A ---- */

/** The 4×4 identity. */
export function identity() { 
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/** A · B (apply B first, then A). Must not modify a or b. */
export function multiply(a, b) { 
  const m = new Float32Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r] * b[c * 4 + k];
      }
      m[c * 4 + r] = sum;
    }
  }
  return m;
  }

/** Translation by (tx, ty, tz). */
export function translate(tx, ty, tz) {
  const m = identity();
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  return m;
}

/** Rotation by `rad` about the x axis. */
export function rotateX(rad) {
  const m = identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m; 
}

/** Rotation by `rad` about the y axis. */
export function rotateY(rad) {
  const m = identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m; 
}

/** Rotation by `rad` about the z axis. */
export function rotateZ(rad) {
  const m = identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m; 
}
  
/** Non-uniform scale by (sx, sy, sz). */
export function scale(sx, sy, sz) { 
  const m = identity();
  m[0] = sx;
  m[5] = sy;
  m[10] = sz;

  return m;
}

/** Mᵀ */
export function transpose(m) { 
  const t = new Float32Array(16);
  t[0] = m[0];
  t[1] = m[4];
  t[2] = m[8];
  t[3] = m[12];

  t[4] = m[1];
  t[5] = m[5];
  t[6] = m[9];
  t[7] = m[13];

  t[8] = m[2];
  t[9] = m[6];
  t[10] = m[10];
  t[11] = m[14];

  t[12] = m[3];
  t[13] = m[7];
  t[14] = m[11];
  t[15] = m[15];

  return t;  
  
 }


/**
 * Inverse of a RIGID transform M = T·R (rotation + translation only, no scale).
 * Do not write a general 4×4 inverse: use the structure (Week 3).
 */
export function invertRigid(m) { 
  const t = new Float32Array(16);
  t[0] = m[0];
  t[1] = m[4];
  t[2] = m[8];
  t[3] = 0;

  t[4] = m[1];
  t[5] = m[5];
  t[6] = m[9];
  t[7] = 0;

  t[8] = m[2];
  t[9] = m[6];
  t[10] = m[10];
  t[11] = 0;

  const tx = m[12];
  const ty = m[13];
  const tz = m[14];

  t[12] = -(t[0] * tx + t[4] * ty + t[8] * tz);
  t[13] = -(t[1] * tx + t[5] * ty + t[9] * tz);
  t[14] = -(t[2] * tx + t[6] * ty + t[10] * tz);
  t[15] = 1;

  return t;
  }

/** M · v for a 4-component v = [x, y, z, w]; returns [x', y', z', w']. */
export function transformVec4(m, v) {
  const x = v[0], y = v[1], z = v[2], w = v[3];
  const n = new Float32Array(4);
  n[0]= m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  n[1]= m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  n[2]= m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  n[3]= m[3] * x + m[7] * y + m[11] * z + m[15] * w;

  return n;
}




/* ------------------------------------------------------------- Part C ---- */

/**
 * View matrix for a camera at `eye` looking at `target`, with `up` as the
 * approximate up direction. Build the camera basis with two cross products.
 * Must stay finite when `up` is parallel to the view direction — handle it.
 * eye, target, up: [x, y, z]
 */
export function lookAt(eye, target, up) {
  const e = new Float32Array(3);
  e[0] = eye[0];
  e[1] = eye[1];
  e[2] = eye[2];

  const t = new Float32Array(3);
  t[0] = target[0];
  t[1] = target[1];
  t[2] = target[2];

  const u = new Float32Array(3);
  u[0] = up[0];
  u[1] = up[1];
  u[2] = up[2];

  const zAxis = v.normalize(v.sub(e, t));
  const xAxis = v.normalize(v.cross(u, zAxis));
  const yAxis = v.cross(zAxis, xAxis);

  const m = new Float32Array(16);
  m[0] = xAxis[0];
  m[1] = yAxis[0];
  m[2] = zAxis[0];
  m[3] = 0;

  m[4] = xAxis[1];
  m[5] = yAxis[1];
  m[6] = zAxis[1];
  m[7] = 0;

  m[8] = xAxis[2];
  m[9] = yAxis[2];
  m[10] = zAxis[2];
  m[11] = 0;

  m[12] = -v.dot(xAxis, e);
  m[13] = -v.dot(yAxis, e);
  m[14] = -v.dot(zAxis, e);
  m[15] = 1;

  const c = v.cross(v.sub(e, t), u);
  if (v.length(c) < 1e-6) {
    // up is parallel to view direction, choose a new up vector
    const newUp = Math.abs(zAxis[0]) < 0.99 ? [1, 0, 0] : [0, 1, 0];
    const newZAxis = v.normalize(v.sub(e, t));
    const newXAxis = v.normalize(v.cross(newUp, newZAxis));
    const newYAxis = v.cross(newZAxis, newXAxis);

    m[0] = newXAxis[0];
    m[1] = newYAxis[0];
    m[2] = newZAxis[0];

    m[4] = newXAxis[1];
    m[5] = newYAxis[1];
    m[6] = newZAxis[1];

    m[8] = newXAxis[2];
    m[9] = newYAxis[2];
    m[10] = newZAxis[2];

    m[12] = -v.dot(newXAxis, e);
    m[13] = -v.dot(newYAxis, e);
    m[14] = -v.dot(newZAxis, e);
  }

  return m;
}
  

/**
 * Perspective projection for WebGPU (depth z ∈ [0, 1])
 * fovY: vertical field of view in radians; aspect = width / height;
 * near, far: positive distances along −z.
 */
export function perspective(fovY, aspect, near, far) {
  const f =   1 / Math.tan(fovY / 2);
  const rangeInv = 1 / (near - far);

  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[1] = 0;
  m[2] = 0;
  m[3] = 0;

  m[4] = 0;
  m[5] = f;
  m[6] = 0;
  m[7] = 0;

  m[8] = 0;
  m[9] = 0;
  m[10] = far * rangeInv;
  m[11] = -1;

  m[12] = 0;
  m[13] = 0;
  m[14] = near * far * rangeInv;
  m[15] = 0;

  return m;
  
}

/**
 * Orthographic projection for WebGPU (depth z ∈ [0, 1]) of the box
 * x ∈ [left, right], y ∈ [bottom, top], z ∈ [−near, −far] in view space.
 */
export function orthographic(left, right, bottom, top, near, far) {
  const lrInv = 1 / (left - right);
  const btInv = 1 / (bottom - top);
  const nfInv = 1 / (near - far);

  const m = new Float32Array(16);

  m[0] = -2 * lrInv;
  m[5] = -2 * btInv;
  m[10] = nfInv;

  m[12] = (left + right) * lrInv;
  m[13] = (top + bottom) * btInv;
  m[14] = near * nfInv;
  m[15] = 1;
  return m;

}

/* ------------------------------------------------- provided (not graded) - */

/**
 * Pretty-print a column-major matrix as four rows, for showing matrices on
 * screen (Part A asks you to display T·R·S and S·R·T).
 */
export function format(m, digits = 2) {
  if (!m) return '(none)';
  const w = digits + 4;
  let s = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) s += (+m[c * 4 + r]).toFixed(digits).padStart(w);
    if (r < 3) s += '\n';
  }
  return s;
}
