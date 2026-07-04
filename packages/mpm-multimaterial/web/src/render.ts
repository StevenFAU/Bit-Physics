// render.ts — presentation renderer (never affects the gate).
// Sphere-impostor particles with per-material shading, density-grid
// ray-marched shadows (compute pass writing a per-particle transmittance
// buffer + the same march in the ground fragment for contact shadows),
// domain wireframe, orbit camera, hiDPI at min(devicePixelRatio, 2).

import preludeWgsl from "../../src/mpm_prelude.wgsl?raw";
import renderWgsl from "./render/render.wgsl?raw";
import type { MpmGpu } from "./solver.js";

export interface CameraState {
  yaw: number;
  pitch: number;
  dist: number;
  center: [number, number, number];
}

export interface RenderSettings {
  particleScale: number; // multiple of dx/2
  shadowKappa: number;
  sparkle: number;
  ambient: number;
  debugMode: number; // 0 material, 1 speed, 2 J, 3 shade, 4 Jp
  colors: [number, number, number, number][]; // per material rgb+gloss
}

const LIGHT_DIR: [number, number, number] = normalize3([0.35, 0.3, 0.88]);

function normalize3(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross3(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Column-major 4x4 perspective * lookAt (WebGPU clip z in [0,1]). */
function viewProj(cam: CameraState, aspect: number): {
  m: Float32Array;
  eye: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
} {
  const cp = Math.cos(cam.pitch);
  const eye: [number, number, number] = [
    cam.center[0] + cam.dist * cp * Math.cos(cam.yaw),
    cam.center[1] + cam.dist * cp * Math.sin(cam.yaw),
    cam.center[2] + cam.dist * Math.sin(cam.pitch),
  ];
  const f = normalize3([
    cam.center[0] - eye[0],
    cam.center[1] - eye[1],
    cam.center[2] - eye[2],
  ]);
  const right = normalize3(cross3(f, [0, 0, 1]));
  const up = cross3(right, f);
  // view matrix (row-major thinking, stored column-major)
  const tx = -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2]);
  const ty = -(up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2]);
  const tz = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
  const fovy = (38 * Math.PI) / 180;
  const t = 1 / Math.tan(fovy / 2);
  const near = 0.05;
  const far = 30;
  const a = far / (far - near);
  const b = -near * a;
  // clip = P * V * world; P,V composed by hand (column-major storage)
  const v = [
    right[0], up[0], -f[0], 0,
    right[1], up[1], -f[1], 0,
    right[2], up[2], -f[2], 0,
    tx, ty, tz, 1,
  ];
  const p = [
    t / aspect, 0, 0, 0,
    0, t, 0, 0,
    0, 0, -a, -1,
    0, 0, b, 0,
  ];
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += p[k * 4 + r] * v[c * 4 + k];
      m[c * 4 + r] = s;
    }
  }
  return { m, eye, right, up };
}

/**
 * Project a canvas-relative pointer (u, v in [0,1]) onto the vertical-ish
 * plane through `planePoint` facing the camera — the INTERACT force target.
 */
export function screenToWorld(
  cam: CameraState,
  u: number,
  v: number,
  planePoint: [number, number, number],
): [number, number, number] {
  const cp = Math.cos(cam.pitch);
  const eye: [number, number, number] = [
    cam.center[0] + cam.dist * cp * Math.cos(cam.yaw),
    cam.center[1] + cam.dist * cp * Math.sin(cam.yaw),
    cam.center[2] + cam.dist * Math.sin(cam.pitch),
  ];
  const f = normalize3([
    cam.center[0] - eye[0],
    cam.center[1] - eye[1],
    cam.center[2] - eye[2],
  ]);
  const right = normalize3(cross3(f, [0, 0, 1]));
  const up = cross3(right, f);
  const tanF = Math.tan((38 * Math.PI) / 360);
  const dx = (2 * u - 1) * tanF;
  const dy = (1 - 2 * v) * tanF;
  const dir = normalize3([
    f[0] + dx * right[0] + dy * up[0],
    f[1] + dx * right[1] + dy * up[1],
    f[2] + dx * right[2] + dy * up[2],
  ]);
  const denom = dir[0] * f[0] + dir[1] * f[1] + dir[2] * f[2];
  const t =
    ((planePoint[0] - eye[0]) * f[0] +
      (planePoint[1] - eye[1]) * f[1] +
      (planePoint[2] - eye[2]) * f[2]) /
    Math.max(denom, 1e-6);
  return [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
}

export class Renderer {
  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private readonly canvas: HTMLCanvasElement;

  private readonly rpBuf: GPUBuffer;
  private readonly colorsBuf: GPUBuffer;
  private readonly shadeBuf: GPUBuffer;

  private readonly pipeShadow: GPUComputePipeline;
  private readonly pipeParticle: GPURenderPipeline;
  private readonly pipeGround: GPURenderPipeline;
  private readonly pipeBox: GPURenderPipeline;

  private bgShadow: GPUBindGroup;
  private bgParticle: GPUBindGroup;
  private bgGround: GPUBindGroup;
  private bgBox: GPUBindGroup;

  private msaaTex: GPUTexture | null = null;
  private depthTex: GPUTexture | null = null;
  private texSize: [number, number] = [0, 0];

  constructor(device: GPUDevice, canvas: HTMLCanvasElement, gpu: MpmGpu) {
    this.device = device;
    this.canvas = canvas;
    const ctx = canvas.getContext("webgpu");
    if (!ctx) throw new Error("webgpu canvas context unavailable");
    this.ctx = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format: this.format, alphaMode: "opaque" });

    const code = `${preludeWgsl}\n${renderWgsl}`;
    const module = device.createShaderModule({ label: "mpm_render", code });

    this.rpBuf = device.createBuffer({
      label: "render_params",
      size: 160,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.colorsBuf = device.createBuffer({
      label: "mat_colors",
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.shadeBuf = device.createBuffer({
      label: "shade",
      size: gpu.maxParticles * 4,
      usage: GPUBufferUsage.STORAGE,
    });

    this.pipeShadow = device.createComputePipeline({
      label: "shadow",
      layout: "auto",
      compute: { module, entryPoint: "shadow" },
    });
    const target: GPUColorTargetState = { format: this.format };
    const depth: GPUDepthStencilState = {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    };
    this.pipeParticle = device.createRenderPipeline({
      label: "particles",
      layout: "auto",
      vertex: { module, entryPoint: "vs_particle" },
      fragment: { module, entryPoint: "fs_particle", targets: [target] },
      primitive: { topology: "triangle-list" },
      depthStencil: depth,
      multisample: { count: 4 },
    });
    this.pipeGround = device.createRenderPipeline({
      label: "ground",
      layout: "auto",
      vertex: { module, entryPoint: "vs_ground" },
      fragment: { module, entryPoint: "fs_ground", targets: [target] },
      primitive: { topology: "triangle-list" },
      depthStencil: depth,
      multisample: { count: 4 },
    });
    this.pipeBox = device.createRenderPipeline({
      label: "box",
      layout: "auto",
      vertex: { module, entryPoint: "vs_box" },
      fragment: { module, entryPoint: "fs_box", targets: [target] },
      primitive: { topology: "line-list" },
      depthStencil: depth,
      multisample: { count: 4 },
    });

    const e = (binding: number, buffer: GPUBuffer): GPUBindGroupEntry => ({
      binding,
      resource: { buffer },
    });
    this.bgShadow = device.createBindGroup({
      layout: this.pipeShadow.getBindGroupLayout(0),
      entries: [
        e(0, this.rpBuf),
        e(1, gpu.particleBuf),
        e(2, gpu.gridVelBuf),
        e(3, this.shadeBuf),
      ],
    });
    this.bgParticle = device.createBindGroup({
      layout: this.pipeParticle.getBindGroupLayout(0),
      entries: [
        e(0, this.rpBuf),
        e(1, gpu.particleBuf),
        e(4, this.colorsBuf),
        e(5, this.shadeBuf),
      ],
    });
    this.bgGround = device.createBindGroup({
      layout: this.pipeGround.getBindGroupLayout(0),
      entries: [e(0, this.rpBuf), e(2, gpu.gridVelBuf)],
    });
    this.bgBox = device.createBindGroup({
      layout: this.pipeBox.getBindGroupLayout(0),
      entries: [e(0, this.rpBuf)],
    });
  }

  setColors(colors: [number, number, number, number][]): void {
    const f = new Float32Array(16);
    for (let i = 0; i < 4; i += 1) f.set(colors[Math.min(i, colors.length - 1)], i * 4);
    this.device.queue.writeBuffer(this.colorsBuf, 0, f);
  }

  /** Upload frame uniforms; returns nothing GPU-visible until draw(). */
  private writeParams(
    cam: CameraState,
    s: RenderSettings,
    gridN: number,
    floorZ: number,
    nParticles: number,
    frame: number,
  ): void {
    const dx = 1 / gridN;
    const { m, eye, right, up } = viewProj(cam, 1);
    const buf = new ArrayBuffer(160);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    f.set(m, 0);
    f.set(eye, 16);
    f[19] = s.particleScale * (dx / 2);
    f.set(right, 20);
    f[23] = s.shadowKappa;
    f.set(up, 24);
    f[27] = s.sparkle;
    f.set(LIGHT_DIR, 28);
    f[31] = floorZ * dx;
    f[32] = gridN;
    f[33] = gridN; // inv_dx (dx = 1/gridN)
    u[34] = nParticles;
    u[35] = frame;
    u[36] = s.debugMode;
    u[37] = 14; // shadow_steps
    f[38] = 1.6 * dx; // shadow_step_len
    f[39] = s.ambient;
    this.device.queue.writeBuffer(this.rpBuf, 0, buf);
  }

  private ensureTargets(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.texSize[0] === w && this.texSize[1] === h && this.msaaTex) return;
    this.msaaTex?.destroy();
    this.depthTex?.destroy();
    this.msaaTex = this.device.createTexture({
      size: [w, h],
      sampleCount: 4,
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTex = this.device.createTexture({
      size: [w, h],
      sampleCount: 4,
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.texSize = [w, h];
  }

  draw(
    cam: CameraState,
    settings: RenderSettings,
    gridN: number,
    floorZ: number,
    nParticles: number,
    frame: number,
  ): void {
    this.ensureTargets();
    this.writeParams(cam, settings, gridN, floorZ, nParticles, frame);
    const encoder = this.device.createCommandEncoder();

    const cp = encoder.beginComputePass({ label: "shadow" });
    cp.setPipeline(this.pipeShadow);
    cp.setBindGroup(0, this.bgShadow);
    cp.dispatchWorkgroups(Math.ceil(Math.max(nParticles, 1) / 64));
    cp.end();

    const view = this.ctx.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: (this.msaaTex as GPUTexture).createView(),
          resolveTarget: view,
          clearValue: { r: 0.024, g: 0.035, b: 0.05, a: 1 },
          loadOp: "clear",
          storeOp: "discard",
        },
      ],
      depthStencilAttachment: {
        view: (this.depthTex as GPUTexture).createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "discard",
      },
    });
    pass.setPipeline(this.pipeGround);
    pass.setBindGroup(0, this.bgGround);
    pass.draw(6);
    pass.setPipeline(this.pipeBox);
    pass.setBindGroup(0, this.bgBox);
    pass.draw(24);
    if (nParticles > 0) {
      pass.setPipeline(this.pipeParticle);
      pass.setBindGroup(0, this.bgParticle);
      pass.draw(6, nParticles);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
