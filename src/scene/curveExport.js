/**
 * Curve export — Part D.
 *
 * Required JSON format (control points in NORMALISED painting coordinates:
 * u, v ∈ [0, 1], origin at the TOP-LEFT corner of the painting, v downwards,
 * the same as texture coordinates):
 *
 * {
 *   "painting": "kavunlu",
 *   "kind": "bezier-c1",                 // or "catmull-rom" / "bspline"
 *   "segments": [                          // for "bezier-c1": 4 points each
 *     [[0.12, 0.40], [0.18, 0.31], [0.27, 0.30], [0.33, 0.38]],
 *     ...
 *   ],
 *   "points": [[u, v], ...]                // for "catmull-rom" / "bspline"
 * }
 *
 * The painting quad spans x ∈ [−a, a], y ∈ [−1, 1] at z = 0 (a = image
 * width / height), so  u = (x + a) / (2a)  and  v = (1 − y) / 2.
 */
import { todo } from '../math/todo.js';

/** TODO (Part D): build the object above from your curve data. */
export function curveToJSON(curve) {
  const { painting = 'selim-turbesi', kind = 'bezier-c1', aspect } = curve;

  const toUV = (pt) => {
    if (typeof aspect === 'number' && aspect > 0) {
      const u = (pt[0] + aspect) / (2 * aspect);
      const v = (1 - pt[1]) / 2;
      return [Number(u.toFixed(4)), Number(v.toFixed(4))];
    }
    return [pt[0], pt[1]];
  };

  const out = { painting, kind };

  if (curve.segments) {
    out.segments = curve.segments.map((seg) => seg.map(toUV));
  }
  if (curve.points) {
    out.points = curve.points.map(toUV);
  }

  return out;
}

/** Provided: save any object as a .json download in the browser. */
export function downloadJSON(obj, filename = 'curve.json') {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
