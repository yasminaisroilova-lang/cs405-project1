/**
 * curves — Part D.
 *
 * Points are plain arrays of any dimension: [x, y] in the plane of the
 * painting, or [x, y, z] in world space. Every function must work for both
 * (the tests use 2D and 3D). Return new arrays; never modify the inputs.
 *
 * A piecewise cubic Bézier curve is an array of segments, each segment being
 * four control points [P0, P1, P2, P3]. Consecutive segments share a joint:
 * segments[i][3] equals segments[i + 1][0].
 *
 * Tests: tests/curves.test.js
 */
import { todo } from './todo.js';

/* ---------------------------------------------------------- Bézier ------ */

/** The four cubic Bernstein basis values [B0(t), B1(t), B2(t), B3(t)]. */
export function bernstein3(t) {
  const m = new Float32Array(4);
  const u = 1 - t;
  m[0] = u * u * u;
  m[1] = 3 * u * u * t;
  m[2] = 3 * u * t * t;
  m[3] = t * t * t;
  return m;
}

/** Point on the cubic Bézier curve with control points p0..p3 at t ∈ [0, 1]. */
export function cubicBezier(p0, p1, p2, p3, t) {
  const b = bernstein3(t);
  const m = new Float32Array(p0.length);
  for (let i = 0; i < p0.length; i++) {
    m[i] = b[0] * p0[i] + b[1] * p1[i] + b[2] * p2[i] + b[3] * p3[i];
  }
  return m;
}

/** First derivative dB/dt of the cubic Bézier at t (not normalised). */
export function cubicBezierTangent(p0, p1, p2, p3, t) {
  const m = new Float32Array(p0.length);
  const u = 1 - t;
  for (let i = 0; i < p0.length; i++) {
    m[i] = -3 * u * u * p0[i] + (3 * u * u - 6 * u * t) * p1[i] + (6 * u * t - 3 * t * t) * p2[i] + 3 * t * t * p3[i];
  }
  return m;
}

/**
 * de Casteljau's construction for any number of control points.
 * Returns every level, for drawing the construction:
 *   levels[0] = the input points (n points)
 *   levels[1] = n − 1 interpolated points
 *   …
 *   levels[n − 1] = [the point on the curve]
 */
export function deCasteljau(points, t) {
  if (!points || points.length === 0) return [];

  const levels = [points];

  while (levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1];
    const next = [];

    for (let i = 0; i < prev.length - 1; i++) {
      const p0 = prev[i];
      const p1 = prev[i + 1];

      if (Array.isArray(p0) || ArrayBuffer.isView(p0)) {
        const dim = p0.length;
        const pt = new Float32Array(dim);
        for (let j = 0; j < dim; j++) {
          pt[j] = (1 - t) * p0[j] + t * p1[j];
        }
        next.push(pt);
      } else {
        next.push((1 - t) * p0 + t * p1);
      }
    }
    levels.push(next);
  }

  return levels;
}
/* ----------------------------------------------- piecewise, C¹ joints --- */

/**
 * Given the last two control points P2, P3 of one segment, return the P1 of
 * the NEXT segment that makes the joint at P3 C¹-continuous.
 */
export function c1NextControl(p2, p3) {
  return p2.map((v, i) => 2 * p3[i] - v);
}
  
/**
 * Evaluate a piecewise cubic Bézier at a global parameter u ∈ [0, 1] that
 * runs over the whole curve: with n segments, segment i covers
 * u ∈ [i/n, (i+1)/n]. u = 0 is the first P0, u = 1 the last P3.
 */
export function evalPiecewise(segments, u) {
  const h = segments.length;
  if (h === 0) return null;
  if (u <= 0) return segments[0][0];
  if (u >= 1) return segments[h - 1][3];

  const scaled = u * h;
  let idx = Math.floor(scaled);
  if (idx >= h) idx = h - 1;
  const localU = scaled - idx;

  const seg = segments[idx];
  return cubicBezier(seg[0], seg[1], seg[2], seg[3], localU);
}
  

/* ---------------------------- second curve family: implement ONE -------- */
/* The tests skip whichever of the two you leave as a TODO, and fail only   */
/* if you implement neither.                                                */

/**
 * Uniform Catmull–Rom: the segment between p1 and p2 (passes through both),
 * t ∈ [0, 1], with tangents (p2 − p0)/2 at p1 and (p3 − p1)/2 at p2.
 */
export function catmullRom (p0, p1, p2, p3, t) {
  const c1 = p1.map((v, i) => v + (p2[i] - p0[i]) / 6);
  const c2 = p2.map((v, i) => v - (p3[i] - p1[i]) / 6);
  return cubicBezier(p1, c1, c2, p2, t);
}

/** Uniform cubic B-spline basis values [N0(t), N1(t), N2(t), N3(t)]. */
export function bsplineBasis(t) { return todo('curves.bsplineBasis'); }

/** Point on the uniform cubic B-spline segment controlled by p0..p3. */
export function bspline(p0, p1, p2, p3, t) { return todo('curves.bspline'); }
