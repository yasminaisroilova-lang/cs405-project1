# CS405 Project 1 — Transformations, Projection & Curves from Paintings

Interactive WebGPU application that turns a painting from the Sakıp Sabancı Museum collection into a small 3D scene: objects with hand-written 4×4 transformations, a scene graph, an orbit camera with perspective/orthographic projection and an inspection view of the camera frustum, and C¹-continuous piecewise cubic Bézier curves traced over the painting.

**Painting:** Şevket Dağ — *II. Selim Türbesi Kapısı* (`?painting=selim-turbesi`)
 · **Release tag:** `project1-final`

No maths or scene-graph libraries are used: `vec3`, `mat4`, curves, camera and scene graph are written from scratch (WebGPU + WGSL, served by Vite).

## 1. How to run

Requirements: **Node.js 20.19 or newer** (`node -v`) and a WebGPU browser (current Chrome or Edge, Safari 26+, Firefox 141+ on Windows).

```bash
npm install
npm run dev     # open http://localhost:5173
npm test        # unit tests (Node's built-in test runner)
```

If the page is blank or black, open the browser console (Cmd/Ctrl + Option/Shift + J): WebGPU and WGSL errors are printed there. Serve from `localhost`; opening `index.html` as a file does not work.

## 2. Controls

### Mouse / trackpad (canvas)

| Action | Effect |
|---|---|
| Left-click + drag | Orbit the camera around the target (yaw / pitch; pitch is limited so `up` never becomes parallel to the view direction) |
| Scroll wheel | Zoom (distance to target, clamped to 0.5 … 20) |


On a Mac trackpad, dragging without clicking needs *System Settings → Accessibility → Pointer Control → Trackpad Options → Dragging style → Three Finger Drag*.

### Panel (right side)

**Stats** — frame time (ms / fps), CPU time per frame, number of draw calls and vertices submitted per frame.

**Painting** — `painting`: switch between the bundled paintings (also via `?painting=<id>`).

**Camera**
- `projection`: `perspective` or `orthographic` (both map depth to z ∈ [0, 1], WebGPU convention).
- `view`: `main` (the orbit camera) or `inspection` (a fixed overview camera that draws the main camera's frustum as a yellow wireframe).
- Readout: live `eye`, `target`, `fovY`, `near`, `far` of the main camera.

**Scene (Parts A and B)**
- `debug axes`: draws the local x (red), y (green), z (blue) axes of every scene-graph node.
- `T·R·S order`: switches the model matrix of the controllable cube between `T·R·S` and `S·R·T`.
- `x`, `y`, `z`: translation of the controllable cube (−1 … 1).
- `angle X`, `angle Y`, `angle Z`: rotation in radians (0 … 2π).
- `scale`: uniform scale (0.1 … 2).
- Matrix readouts: both `T·R·S` and `S·R·T` as numbers (4×4).
- Besides the controllable cube, two fixed cubes and an animated scene-graph chain (`base → arm → hand → finger`, plus `arm2`; `arm` rotates over time) are drawn.

**Curves (Part D)**
- `show curve`: shows or hides the curve and its control points.
- [curve type / second curve family: Catmull-Rom spline through the points]
- `export JSON`: shows the control points as JSON in the panel and downloads `curve.json`.

**View**
- `reset`:back to the defaults.

## 3. Curve design (Part D)

The curve consists of 3 cubic Bézier segments with **8 free control points** (4 for the first segment, 2 for each of the next two). The second control point of segments 2 and 3 is not free but derived as `P1' = 2·P3 − P2` of the previous segment (`c1NextControl`), so **C¹ continuity holds at both joints by construction**, however the points are moved.

`curve.json` stores the control points in **normalised painting coordinates** (u, v ∈ [0, 1], origin top-left, v pointing down), as specified in `src/scene/curveExport.js`.

## 4. Project structure

```
src/
  math/    vec3.js, mat4.js (column-major), curves.js
           (bernstein3, cubicBezier, cubicBezierTangent, deCasteljau,
            c1NextControl, evalPiecewise, catmullRom)
  scene/   node.js (SceneNode, updateWorld), camera.js (lookAt-based camera,
           frustumCorners), geometry.js (cube, axes), scene.js (objects, scene
           graph, curve), curveExport.js (JSON export)
  render/  gpu.js, renderer.js (render pass, vertex counter), painting.js
           (textured quad), shaders/*.wgsl (painting, colour, mesh, axes)
  ui/      panel.js, stats.js, input.js
  main.js  wiring: GPU, camera/orbit, scene, panel, render loop
tests/     unit tests for vec3, mat4, node, curves
public/paintings/   painting images
```

## 5. Conventions

- Matrices are `Float32Array(16)`, **column-major** (element row r, column c at `c*4 + r`, translation at 12–14), uploaded as WGSL `mat4x4f`.
- Column vectors, `p' = M·p`; `multiply(A, B)` is `A·B`, so `B` acts first. The application uses **M = T·R·S**.
- Right-handed world, angles in radians, camera looks down −z, clip-space depth z ∈ [0, 1].
- The painting is a quad in the plane z = 0 (y ∈ [−1, 1], x ∈ [−a, a], a = width/height); objects and the curve (z = 0.01) are in front of it.
