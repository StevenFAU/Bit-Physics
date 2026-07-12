// lbm-multiphase — composite renderer (single fragment pass over live sim
// buffers + additive tracer sprites). Cosmetics only: never on the gate path.

import renderWgsl from "./render.wgsl?raw";
import type { LbmGpu } from "./solver.js";
import { N_TRACERS } from "./solver.js";

export const LAYER = {
  phase: 1,
  curl: 2,
  speed: 4,
  schlieren: 8,
  refraction: 16,
  walls: 32,
  parasite: 64,
  iso: 128,
} as const;

export interface RenderState {
  layers: number;
  rhoV: number;
  rhoL: number;
  exposure: number;
  time: number;
  speedGain: number;
  curlGain: number;
  parasiteGain: number;
  tracersOn: boolean;
  tracerAlpha: number;
}

export class Renderer {
  private device: GPUDevice;
  private composite: GPURenderPipeline;
  private tracerPipe: GPURenderPipeline;
  private uni: GPUBuffer;
  private tuni: GPUBuffer;
  private bgl: GPUBindGroupLayout;
  private tbgl: GPUBindGroupLayout;
  private bg: GPUBindGroup | null = null;
  private tbg: GPUBindGroup | null = null;
  private boundTo: LbmGpu | null = null;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    const module = device.createShaderModule({ label: "lbm-render", code: renderWgsl });
    this.bgl = device.createBindGroupLayout({
      label: "lbm-render-bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    this.tbgl = device.createBindGroupLayout({
      label: "lbm-tracer-bgl",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    this.composite = device.createRenderPipeline({
      label: "lbm-composite",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bgl] }),
      vertex: { module, entryPoint: "vs_full" },
      fragment: { module, entryPoint: "fs_composite", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.tracerPipe = device.createRenderPipeline({
      label: "lbm-tracers",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.tbgl] }),
      vertex: { module, entryPoint: "vs_tracer" },
      fragment: {
        module,
        entryPoint: "fs_tracer",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    this.uni = device.createBuffer({
      label: "lbm-render-uni",
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.tuni = device.createBuffer({
      label: "lbm-tracer-uni",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  attach(gpu: LbmGpu): void {
    this.bg = this.device.createBindGroup({
      label: "lbm-render-bg",
      layout: this.bgl,
      entries: [
        { binding: 0, resource: { buffer: this.uni } },
        { binding: 1, resource: { buffer: gpu.macro } },
        { binding: 2, resource: { buffer: gpu.rhopsi } },
        { binding: 3, resource: { buffer: gpu.flags } },
      ],
    });
    this.tbg = this.device.createBindGroup({
      label: "lbm-tracer-bg",
      layout: this.tbgl,
      entries: [
        { binding: 0, resource: { buffer: this.tuni } },
        { binding: 1, resource: { buffer: gpu.tracers } },
      ],
    });
    this.boundTo = gpu;
  }

  draw(enc: GPUCommandEncoder, view: GPUTextureView, rs: RenderState): void {
    const gpu = this.boundTo;
    if (!gpu || !this.bg || !this.tbg) return;
    const u = new ArrayBuffer(48);
    const dv = new DataView(u);
    dv.setUint32(0, gpu.nx, true);
    dv.setUint32(4, gpu.ny, true);
    dv.setUint32(8, rs.layers, true);
    dv.setFloat32(16, rs.rhoV, true);
    dv.setFloat32(20, rs.rhoL, true);
    dv.setFloat32(24, rs.exposure, true);
    dv.setFloat32(28, rs.time, true);
    dv.setFloat32(32, rs.speedGain, true);
    dv.setFloat32(36, rs.curlGain, true);
    dv.setFloat32(40, rs.parasiteGain, true);
    this.device.queue.writeBuffer(this.uni, 0, u);
    const tu = new Float32Array([gpu.nx, gpu.ny, 2.2 / Math.max(gpu.nx, gpu.ny), rs.tracerAlpha]);
    this.device.queue.writeBuffer(this.tuni, 0, tu);

    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view, loadOp: "clear", storeOp: "store", clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 } },
      ],
    });
    pass.setPipeline(this.composite);
    pass.setBindGroup(0, this.bg);
    pass.draw(3);
    if (rs.tracersOn) {
      pass.setPipeline(this.tracerPipe);
      pass.setBindGroup(0, this.tbg);
      pass.draw(6, N_TRACERS);
    }
    pass.end();
  }
}
