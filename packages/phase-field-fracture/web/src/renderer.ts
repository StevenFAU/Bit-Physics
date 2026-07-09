// phase-field-fracture — RENDER layer host (uber-composite pass, § 5.1).

import renderWgsl from "./render.wgsl?raw";
import type { FractureGpu } from "./solver.js";

export const LAYER = {
  stress: 1,
  glow: 2,
  shimmer: 4,
  labels: 8,
  warp: 16,
} as const;

const RU_BYTES = 8 * 4;

export class Renderer {
  private readonly device: GPUDevice;
  private readonly ctx: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private layout!: GPUBindGroupLayout;
  private uni: GPUBuffer;
  private uniData = new ArrayBuffer(RU_BYTES);
  private group: GPUBindGroup | null = null;
  private boundTo: string = "";

  layers: number = LAYER.stress | LAYER.glow | LAYER.shimmer | LAYER.labels | LAYER.warp;
  warp = 6.0;
  exposure = 0.12;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.device = device;
    const ctx = canvas.getContext("webgpu");
    if (!ctx) throw new Error("no webgpu canvas context");
    this.ctx = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device, format: this.format, alphaMode: "opaque" });
    this.uni = device.createBuffer({
      size: RU_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const module = device.createShaderModule({ code: renderWgsl });
    this.layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        ...[1, 2, 3, 4, 5, 6].map((binding) => ({
          binding,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" as GPUBufferBindingType },
        })),
      ],
    });
    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.layout] }),
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
    });
  }

  private bind(gpu: FractureGpu): GPUBindGroup {
    // rebind when the solver's ping buffers rotate
    const key = `${gpu.n}:${gpu.dPing}:${gpu.labPing}`;
    if (this.group && key === this.boundTo) return this.group;
    this.group = this.device.createBindGroup({
      layout: this.layout,
      entries: [
        { binding: 0, resource: { buffer: this.uni } },
        { binding: 1, resource: { buffer: gpu.bufU } },
        { binding: 2, resource: { buffer: gpu.bufV } },
        { binding: 3, resource: { buffer: gpu.currentD } },
        { binding: 4, resource: { buffer: gpu.bufH } },
        { binding: 5, resource: { buffer: gpu.matBuf } },
        { binding: 6, resource: { buffer: gpu.currentLabels } },
      ],
    });
    this.boundTo = key;
    return this.group;
  }

  render(gpu: FractureGpu, lam: number, mu: number, h: number): void {
    const f = new Float32Array(this.uniData);
    const u = new Uint32Array(this.uniData);
    u[0] = gpu.n;
    u[1] = gpu.n + 1;
    f[2] = h;
    f[3] = this.warp;
    u[4] = this.layers;
    f[5] = this.exposure;
    f[6] = lam;
    f[7] = mu;
    this.device.queue.writeBuffer(this.uni, 0, this.uniData);

    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0.02, g: 0.025, b: 0.033, a: 1 },
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bind(gpu));
    pass.draw(3);
    pass.end();
    this.device.queue.submit([enc.finish()]);
  }

  /** Force a rebind (scene reload swaps solver buffers). */
  invalidate(): void {
    this.group = null;
    this.boundTo = "";
  }
}
