/**
 * YOUR SCENE — Parts A, B and D live here (and in files you add next to it).
 *
 * main.js calls, every frame:
 *     scene.update(dt, time)          dt and time in seconds
 *     scene.draw(pass, viewProj)      inside the frame's render pass
 * and scene.reset() from the panel's "reset" button.
 *
 * Suggested steps
 *   Part A  Write a small mesh pipeline (copy the structure of
 *           render/painting.js: vertex buffer → uniform buffer → bind group
 *           → pipeline → draw). Use geometry.js for cube data. Place at least
 *           three objects in front of the painting (z > 0) with YOUR mat4.
 *   Part B  Build a SceneNode tree (scene/node.js), call root.updateWorld()
 *           in update(), and draw every node with  viewProj · node.world.
 *   Part D  Draw control points and the curve over the painting
 *           (topology 'line-strip' or 'point-list' works for a start).
 *
 * WebGPU gotcha: queue.writeBuffer() calls all run BEFORE the frame's
 * commands execute. If several objects share ONE uniform buffer, they all
 * see the last value written. Give each object its own uniform buffer (or
 * its own slice of a big one, with a dynamic offset).
 *
 * Call renderer.countDraw(vertexCount) after each draw so the vertex
 * counter in the panel is correct (Part E).
 */
import meshWGSL from '../render/shaders/mesh.wgsl?raw';
import { createShader, fragmentConstants } from '../render/shader.js';
import { DEPTH_FORMAT } from '../render/renderer.js';
import * as mat4 from '../math/mat4.js';
import { SceneNode } from './node.js';
import axesWGSL from '../render/shaders/axes.wgsl?raw';
import { cube, axes } from './geometry.js';
import { cubicBezier, c1NextControl, evalPiecewise } from '../math/curves.js';
import { curveToJSON, downloadJSON } from './curveExport.js';


export function createScene({ gpu, renderer, painting, panel }) {
  const { device } = gpu;
  const module = createShader(device, meshWGSL, 'mesh');
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module, entryPoint: 'vs',
      buffers: [{
        arrayStride: 6 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' },
        ],
      }],
    },
    fragment: { module, entryPoint: 'fs', targets: [{ format: gpu.viewFormat }], constants: fragmentConstants(gpu) },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: 'less' },
  });

  const cubeData = cube();
  const vertexBuffer = device.createBuffer({
    size: cubeData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, cubeData);
  const axesModule = createShader(device, axesWGSL, 'axes');
  const axesPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: axesModule, entryPoint: 'vs',
      buffers: [{
        arrayStride: 6 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' },
        ],
      }],
    },
    fragment: { module: axesModule, entryPoint: 'fs', targets: [{ format: gpu.viewFormat }], constants: fragmentConstants(gpu) },
    primitive: { topology: 'line-list' },
    depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: false, depthCompare: 'always' },
  });
  const axesData = axes(0.4);
  const axesBuffer = device.createBuffer({
    size: axesData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const frustumVertexBuffer = device.createBuffer({
    size: 24 * 6 * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const frustumUniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const frustumBindGroup = device.createBindGroup({
    layout: axesPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: frustumUniformBuffer } }],
  });

  let frustumCorners = null;



  device.queue.writeBuffer(axesBuffer, 0, axesData);

  function makeObject(color) {
    const uniformBuffer = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
    return { uniformBuffer, bindGroup, color, model: mat4.identity() };
  }

  const objects = [
    makeObject([0.9, 0.3, 0.2, 1]),
    makeObject([0.2, 0.6, 0.9, 1]),
    makeObject([0.3, 0.8, 0.4, 1]),
  ];

  const base = new SceneNode('base', mat4.translate(0, -0.3, 0.4));
  const arm  = base.addChild(new SceneNode('arm', mat4.translate(0, 0.3, 0)));
  const hand = arm.addChild(new SceneNode('hand', mat4.translate(0, 0.3, 0)));
  const finger = hand.addChild(new SceneNode('finger', mat4.translate(0, 0.2, 0)));
  const arm2 = base.addChild(new SceneNode('arm2', mat4.translate(0.3, 0, 0)));

  const nodeColors = {
  base: [0.9, 0.8, 0.2, 1], arm: [0.9, 0.3, 0.2, 1], hand: [0.2, 0.6, 0.9, 1],
  finger: [0.3, 0.8, 0.4, 1], arm2: [0.7, 0.4, 0.9, 1],
  };
  base.traverse((node) => {
    node.data.obj = makeObject(nodeColors[node.name]);
    node.data.size = 0.18;
    const ub = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    node.data.axes = {
    uniformBuffer: ub,
    bindGroup: device.createBindGroup({
      layout: axesPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ub } }],
    }),
    };


  });

  const state = {
    debugAxes: false,
    tx:0, ty:0, tz:0.5,
    angleX: 0, angleY: 0, angleZ: 0,
    scale: 0.3,
    trs: true,
    showCurve: true,
  };

  // Example of wiring a control. Add a folder per part as you go.
  const f = panel.folder('Scene');
  f.toggle('debug axes', state, 'debugAxes');
  f.toggle('T·R·S order', state, 'trs');
  f.toggle('show curve', state, 'showCurve');
  f.slider('x', state, 'tx', -1, 1, 0.01);
  f.slider('y', state, 'ty', -1, 1, 0.01);
  f.slider('z', state, 'tz', -1, 1, 0.01);
  f.slider('angle X', state, 'angleX', 0, 2 * Math.PI, 0.01);
  f.slider('angle Y', state, 'angleY', 0, 2 * Math.PI, 0.01);
  f.slider('angle Z', state, 'angleZ', 0, 2 * Math.PI, 0.01);
  f.slider('scale', state, 'scale', 0.1, 2, 0.01);
  

  const readoutA = f.text();
  const readoutB = f.text();
  const controlPoints = [
    [-0.45, -0.20, 0.01],
    [-0.45,  0.25, 0.01],
    [-0.20,  0.45, 0.01],
    [ 0.00,  0.45, 0.01],
    [ 0.30,  0.30, 0.01],
    [ 0.35,  0.05, 0.01],
    [ 0.45, -0.15, 0.01],
    [ 0.45, -0.35, 0.01],
  ];
  const initialControlPoints = controlPoints.map(p => [...p]);

  function buildSegments(points) {
    return [
      [points[0], points[1], points[2], points[3]],
      [points[3], c1NextControl(points[2], points[3]), points[4], points[5]],
      [points[5], c1NextControl(points[4], points[5]), points[6], points[7]],
    ];
  }
  const jsonReadout = f.text();
  f.button('export JSON', () => {
    const data = curveToJSON({
      painting: 'selim-turbesi',
      kind: 'bezier-c1',
      aspect: painting.aspect,
      segments: buildSegments(controlPoints),
    });
    jsonReadout.set(JSON.stringify(data, null, 2));
    downloadJSON(data, 'curve.json');
  });
  const cpObjects = controlPoints.map(() => makeObject([0.0, 0.85, 1.0, 1.0]));

  const curveVertexBuffer = device.createBuffer({
    size: 200 * 6 * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  const curveUniformBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const curveBindGroup = device.createBindGroup({
    layout: axesPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: curveUniformBuffer } }],
  });

  return {
    state,

    setFrustum(corners) {
      frustumCorners = corners;
    },

    update(dt, time) {
      const T = mat4.translate(state.tx, state.ty, state.tz);
      const R = mat4.multiply(mat4.rotateX(state.angleX),
            mat4.multiply(mat4.rotateY(state.angleY), mat4.rotateZ(state.angleZ)));
      const S = mat4.scale(state.scale, state.scale, state.scale);
      const MA = mat4.multiply(T, mat4.multiply(R, S));
      const MB = mat4.multiply(S, mat4.multiply(R, T));

      objects[0].model = state.trs ? MA : MB;
      objects[1].model = mat4.multiply(mat4.translate(-0.6, 0.3, 0.4), mat4.scale(0.25, 0.25, 0.25));  
      objects[2].model = mat4.multiply(mat4.translate(0.5, -0.3, 0.1), mat4.scale(0.25, 0.25, 0.25));    

      
      readoutA.set('T·R·S\n' + mat4.format(MA));
      readoutB.set('S·R·T\n' + mat4.format(MB));

      arm.local = mat4.multiply(mat4.translate(0, 0.3, 0), mat4.rotateZ(time));
      base.updateWorld();
    },

    /** @param {GPURenderPassEncoder} pass  @param {Float32Array} viewProj  P · V */
    draw(pass, viewProj) {
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      for (const o of objects) {
        const mvp = mat4.multiply(viewProj, o.model);
        device.queue.writeBuffer(o.uniformBuffer, 0, mvp);
        device.queue.writeBuffer(o.uniformBuffer, 64, new Float32Array(o.color));
        pass.setBindGroup(0, o.bindGroup);
        pass.draw(36);
        renderer.countDraw(36);
      }
      base.traverse((node) => {
      const s = node.data.size; 
      const model = mat4.multiply(node.world, mat4.scale(s, s, s));
      const mvp = mat4.multiply(viewProj, model);
      device.queue.writeBuffer(node.data.obj.uniformBuffer, 0, mvp);
      device.queue.writeBuffer(node.data.obj.uniformBuffer, 64, new Float32Array(node.data.obj.color));
      pass.setBindGroup(0, node.data.obj.bindGroup);
      pass.draw(36);
      renderer.countDraw(36);
      });
      if (state.debugAxes) {
        pass.setPipeline(axesPipeline);
        pass.setVertexBuffer(0, axesBuffer);
        base.traverse((node) => {
        const mvp = mat4.multiply(viewProj, node.world);
        device.queue.writeBuffer(node.data.axes.uniformBuffer, 0, mvp);
        pass.setBindGroup(0, node.data.axes.bindGroup);
        pass.draw(6);
        renderer.countDraw(6);
        });
      }
      if (frustumCorners) {
        const color = [1.0, 0.9, 0.2]; 
        const indices = [
          0,1, 1,2, 2,3, 3,0, 
          4,5, 5,6, 6,7, 7,4, 
          0,4, 1,5, 2,6, 3,7  
        ];

        const vertexData = new Float32Array(24 * 6);
        let offset = 0;
        for (const idx of indices) {
          const pt = frustumCorners[idx];
          vertexData[offset++] = pt[0];
          vertexData[offset++] = pt[1];
          vertexData[offset++] = pt[2];
          vertexData[offset++] = color[0];
          vertexData[offset++] = color[1];
          vertexData[offset++] = color[2];
        }

        device.queue.writeBuffer(frustumVertexBuffer, 0, vertexData);
        device.queue.writeBuffer(frustumUniformBuffer, 0, viewProj);

        pass.setPipeline(axesPipeline);
        pass.setVertexBuffer(0, frustumVertexBuffer);
        pass.setBindGroup(0, frustumBindGroup);
        pass.draw(24);
        renderer.countDraw(24);
      }
      if (state.showCurve) {
      const segments = buildSegments(controlPoints);
      const pts = [];
      for (let i = 0; i <= 100; i++) {
        pts.push(evalPiecewise(segments, i / 100));
      }

      const curveColor = [0.2, 0.9, 0.4]; // Grün
      const curveVertexData = new Float32Array(200 * 6);
      let cOffset = 0;

      for (let i = 0; i < 100; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        curveVertexData[cOffset++] = a[0];
        curveVertexData[cOffset++] = a[1];
        curveVertexData[cOffset++] = a[2];
        curveVertexData[cOffset++] = curveColor[0];
        curveVertexData[cOffset++] = curveColor[1];
        curveVertexData[cOffset++] = curveColor[2];

        curveVertexData[cOffset++] = b[0];
        curveVertexData[cOffset++] = b[1];
        curveVertexData[cOffset++] = b[2];
        curveVertexData[cOffset++] = curveColor[0];
        curveVertexData[cOffset++] = curveColor[1];
        curveVertexData[cOffset++] = curveColor[2];
      }

      device.queue.writeBuffer(curveVertexBuffer, 0, curveVertexData);
      device.queue.writeBuffer(curveUniformBuffer, 0, viewProj);

      pass.setPipeline(axesPipeline);
      pass.setVertexBuffer(0, curveVertexBuffer);
      pass.setBindGroup(0, curveBindGroup);
      pass.draw(200);
      renderer.countDraw(200);

      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      for (let i = 0; i < controlPoints.length; i++) {
        const pt = controlPoints[i];
        const cp = cpObjects[i];
        const model = mat4.multiply(
          mat4.translate(pt[0], pt[1], 0.01),
          mat4.scale(0.03, 0.03, 0.03)
        );
        const mvp = mat4.multiply(viewProj, model);

        device.queue.writeBuffer(cp.uniformBuffer, 0, mvp);
        device.queue.writeBuffer(cp.uniformBuffer, 64, new Float32Array(cp.color));
        pass.setBindGroup(0, cp.bindGroup);
        pass.draw(36);
        renderer.countDraw(36);
      }
      }


    },

    reset() {
      // TODO: put every object (and the camera, in main.js) back where it started
      state.debugAxes = false;
      state.tx = 0;
      state.ty = 0;
      state.tz = 0.5;
      state.angleX = 0;
      state.angleY = 0;
      state.angleZ = 0;
      state.scale = 0.3;
      state.trs = true;
      state.showCurve = true;

      for (let i = 0; i < controlPoints.length; i++) {
        controlPoints[i][0] = initialControlPoints[i][0];
        controlPoints[i][1] = initialControlPoints[i][1];
        controlPoints[i][2] = initialControlPoints[i][2];
      }
    },
  };
}
