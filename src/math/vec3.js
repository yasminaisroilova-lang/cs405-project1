/**
 * vec3 — 3-component vectors as plain arrays [x, y, z].
 *
 * Every function returns a NEW array and never modifies its arguments.
 * Write these yourself (Week 1, Linear Algebra I). Tests: tests/vec3.test.js
 */
import { todo } from './todo.js';

/** a + b */
export function add(a, b) {
    const m = new Float32Array(3);
    m[0] = a[0] + b[0];
    m[1] = a[1] + b[1];
    m[2] = a[2] + b[2];
    return m;
}

/** a − b */
export function sub(a, b) {
    const m = new Float32Array(3);
    m[0] = a[0] - b[0];
    m[1] = a[1] - b[1];
    m[2] = a[2] - b[2];
    return m;
}
 

/** s · a  (s is a number) */
export function scale(a, s) {
    const m = new Float32Array(3);
    m[0] = a[0] * s;
    m[1] = a[1] * s;
    m[2] = a[2] * s;
    return m;
}

/** a · b  → number */
export function dot(a, b) {
    const m = new Float32Array(3);
    m[0] = a[0] * b[0];
    m[1] = a[1] * b[1];
    m[2] = a[2] * b[2];
    return m[0] + m[1] + m[2];
}

/** a × b  (right-handed: cross([1,0,0],[0,1,0]) = [0,0,1]) */
export function cross(a, b) {
    const m = new Float32Array(3);
    m[0] = a[1] * b[2] - a[2] * b[1];
    m[1] = a[2] * b[0] - a[0] * b[2];
    m[2] = a[0] * b[1] - a[1] * b[0];
    return m;
}

/** |a|  → number */
export function length(a) {
    const m = new Float32Array(3);
    m[0] = a[0] * a[0];
    m[1] = a[1] * a[1];
    m[2] = a[2] * a[2];
    const r = Math.sqrt(m[0] + m[1] + m[2])
    return r; ;
}
    
/**
 * a / |a|.
 * For a zero-length vector return [0, 0, 0] — never NaN.
 */
export function normalize(a) {

    const m = new Float32Array(3);
    m[0] = a[0] * a[0];
    m[1] = a[1] * a[1];
    m[2] = a[2] * a[2];
    const r = Math.sqrt(m[0] + m[1] + m[2])
    const n = new Float32Array(3);
    if (r === 0) {
        n[0] = 0;
        n[1] = 0;
        n[2] = 0;
    } else {
        n[0] = a[0] / r;
        n[1] = a[1] / r;
        n[2] = a[2] / r;
    }
    return n;
}
