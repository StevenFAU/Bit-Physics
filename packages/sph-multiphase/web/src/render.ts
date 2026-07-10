// Presentation-tier renderer (never gated): orbit camera, container box,
// and the debug/honesty particle view (instanced sphere impostors with
// common-web colormaps). The SSFR water surface lives in ssfr.ts; this
// module owns the camera, the canvas, and the raw-particle path that the
// pipeline-explorer and debug views use.

import particlesWgsl from "./render/particles.wgsl?raw";
import {
  PACKED_BYTES,
  emitColormapWgsl,
  getColormap,
  packColormap,
} from "../../../../common/common-web/src/colormap.js";

// ---- minimal mat4 (column-major, WebGPU clip space) ------------------------
export type Mat4 = Float32Array;

export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = far / (near - far);
  m[11] = -1;
  m[14] = (near * far) / (near - far);
  return m;
}

export function lookAt(eye: number[], target: number[], up: number[]): Mat4 {
  const zx = eye[0] - target[0];
  const zy = eye[1] - target[1];
  const zz = eye[2] - target[2];
  let zl = Math.hypot(zx, zy, zz);
  const z = [zx / zl, zy / zl, zz / zl];
  const x = [
    up[1] * z[2] - up[2] * z[1],
    up[2] * z[0] - up[0] * z[2],
    up[0] * z[1] - up[1] * z[0],
  ];
  const xl = Math.hypot(x[0], x[1], x[2]);
  x[0] /= xl;
  x[1] /= xl;
  x[2] /= xl;
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];
  const m = new Float32Array(16);
  m[0] = x[0]; m[1] = y[0]; m[2] = z[0];
  m[4] = x[1]; m[5] = y[1]; m[6] = z[1];
  m[8] = x[2]; m[9] = y[2]; m[10] = z[2];
  m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  m[15] = 1;
  return m;
}

export interface OrbitCamera {
  theta: number;
  phi: number;
  dist: number;
  target: [number, number, number];
}

export function cameraEye(cam: OrbitCamera): [number, number, number] {
  const cp = Math.cos(cam.phi);
  return [
    cam.target[0] + cam.dist * cp * Math.cos(cam.theta),
    cam.target[1] + cam.dist * cp * Math.sin(cam.theta),
    cam.target[2] + cam.dist * Math.sin(cam.phi),
  ];
}

export type ColorMode = 0 | 1 | 2 | 3 | 4; // speed | number density | neighbors | residual | phase

export interface DrawOptions {
  n: number;
  radius: number;
  colorMode: ColorMode;
  scalarMin: number;
  scalarMax: number;
  colormap: string;
}

export type Renderer = Awaited<ReturnType<typeof createRenderer>>;

export async function createRenderer(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  simBuffers: { pos: GPUBuffer; vel: GPUBuffer; partAux: GPUBuffer },
) {
  const ctx = canvas.getContext("webgpu");
  if (!ctx) throw new Error("no webgpu canvas context");
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

  const cam: OrbitCamera = { theta: -0.62, phi: 0.32, dist: 2.35, target: [0.5, 0.5, 0.32] };

  const camBuf = device.createBuffer({
    label: "camU",
    size: 64 + 64 + 16 + 16 + PACKED_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // container box wireframe (12 edges = 24 vertices)
  const E = [
    [0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1],
  ];
  const lineData = new Float32Array(24 * 4);
  E.forEach((e, i) => {
    lineData.set([e[0], e[1], e[2], 0], i * 8);
    lineData.set([e[3], e[4], e[5], 0], i * 8 + 4);
  });
  const lineBuf = device.createBuffer({
    label: "lines",
    size: lineData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(lineBuf, 0, lineData);

  const code =
    particlesWgsl +
    emitColormapWgsl({ fnName: "cmap_sample", stopsExpr: "CAM.stops", countExpr: "CAM.cmeta.x" });
  const module = device.createShaderModule({ label: "render", code });

  const particlePipe = await device.createRenderPipelineAsync({
    label: "particles",
    layout: "auto",
    vertex: { module, entryPoint: "vs_particle" },
    fragment: { module, entryPoint: "fs_particle", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
  });
  const linePipe = await device.createRenderPipelineAsync({
    label: "lines",
    layout: "auto",
    vertex: { module, entryPoint: "vs_line" },
    fragment: {
      module,
      entryPoint: "fs_line",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          },
        },
      ],
    },
    primitive: { topology: "line-list" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "less" },
  });

  const particleBG = device.createBindGroup({
    layout: particlePipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: camBuf } },
      { binding: 1, resource: { buffer: simBuffers.pos } },
      { binding: 2, resource: { buffer: simBuffers.vel } },
      { binding: 3, resource: { buffer: simBuffers.partAux } },
    ],
  });
  const lineBG = device.createBindGroup({
    layout: linePipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: camBuf } },
      { binding: 1, resource: { buffer: lineBuf } },
    ],
  });

  let depth: GPUTexture | null = null;
  let depthW = 0;
  let depthH = 0;

  function ensureDepth(): GPUTextureView {
    const w = canvas.width;
    const h = canvas.height;
    if (!depth || depthW !== w || depthH !== h) {
      depth?.destroy();
      depth = device.createTexture({
        size: [w, h],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      depthW = w;
      depthH = h;
    }
    return depth.createView();
  }

  const camScratch = new Float32Array((64 + 64 + 16 + 16 + PACKED_BYTES) / 4);

  function writeCam(opts: DrawOptions) {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const eye = cameraEye(cam);
    const view = lookAt(eye, cam.target, [0, 0, 1]);
    const proj = perspective(0.9, aspect, 0.02, 40);
    camScratch.set(view, 0);
    camScratch.set(proj, 16);
    camScratch.set([eye[0], eye[1], eye[2], 0], 32);
    camScratch.set([opts.radius, opts.colorMode, opts.scalarMin, opts.scalarMax], 36);
    packColormap(getColormap(opts.colormap), camScratch.subarray(40));
    device.queue.writeBuffer(camBuf, 0, camScratch);
    return { view, proj, eye };
  }

  function draw(opts: DrawOptions) {
    writeCam(opts);
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx!.getCurrentTexture().createView(),
          clearValue: { r: 0.024, g: 0.035, b: 0.051, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: ensureDepth(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    pass.setPipeline(linePipe);
    pass.setBindGroup(0, lineBG);
    pass.draw(24);
    if (opts.n > 0) {
      pass.setPipeline(particlePipe);
      pass.setBindGroup(0, particleBG);
      pass.draw(6, opts.n);
    }
    pass.end();
    device.queue.submit([enc.finish()]);
  }

  // screen ray -> point on the camera-facing plane through the box center
  function unprojectToPlane(px: number, py: number): [number, number, number] {
    const eye = cameraEye(cam);
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const f = 1 / Math.tan(0.45);
    const ndcX = (px / canvas.clientWidth) * 2 - 1;
    const ndcY = 1 - (py / canvas.clientHeight) * 2;
    // camera basis
    const fwd = [cam.target[0] - eye[0], cam.target[1] - eye[1], cam.target[2] - eye[2]];
    const fl = Math.hypot(fwd[0], fwd[1], fwd[2]);
    fwd[0] /= fl; fwd[1] /= fl; fwd[2] /= fl;
    const right = [fwd[1] * 1 - fwd[2] * 0, fwd[2] * 0 - fwd[0] * 1, fwd[0] * 0 - fwd[1] * 0];
    const rl = Math.hypot(right[0], right[1], right[2]);
    right[0] /= rl; right[1] /= rl; right[2] /= rl;
    const up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];
    const dir = [
      fwd[0] + (ndcX / f) * aspect * right[0] + (ndcY / f) * up[0],
      fwd[1] + (ndcX / f) * aspect * right[1] + (ndcY / f) * up[1],
      fwd[2] + (ndcX / f) * aspect * right[2] + (ndcY / f) * up[2],
    ];
    // plane through target, normal = fwd
    const t =
      (fwd[0] * (cam.target[0] - eye[0]) +
        fwd[1] * (cam.target[1] - eye[1]) +
        fwd[2] * (cam.target[2] - eye[2])) /
      (fwd[0] * dir[0] + fwd[1] * dir[1] + fwd[2] * dir[2]);
    return [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
  }

  return { cam, draw, writeCam, unprojectToPlane, ensureDepth, ctxFormat: format, gpuCtx: ctx };
}
