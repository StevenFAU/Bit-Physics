// A WebGPU canvas that draws a counts buffer as a heat map (hist.wgsl),
// straight from the GPU: the diagram never round-trips through the CPU.
// One per panel (Road to Chaos, Lorenz's Map, Slice); a 2D canvas laid over
// it carries the axes and markers (drawn by the panel).

import { wgsl } from "@bp/gpu";
import type { ColormapName } from "@bp/render";
import { ColormapLibrary } from "@bp/render";
import src from "./hist.wgsl?raw";

export interface HistSource {
  counts: GPUBuffer;
  /** totals[0] (whole mode) or totals[col] (per-column mode). */
  totals: GPUBuffer;
  w: number;
  h: number;
  perColumn: boolean;
}

export interface HistLook {
  /** totals × scale is the count drawn at full brightness. */
  scale: number;
  gamma: number;
  /** Brightness of a single count (0–1). */
  floor: number;
}

export class HistView {
  readonly canvas: HTMLCanvasElement;
  look: HistLook = { scale: 0.02, gamma: 0.9, floor: 0.22 };
  private readonly context: GPUCanvasContext;
  private readonly params: GPUBuffer;
  private readonly sampler: GPUSampler;
  private bind: GPUBindGroup | null = null;
  private src: HistSource | null = null;

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipe: GPURenderPipeline,
    private readonly lut: GPUTextureView,
    label: string,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "cx-hist-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    const ctx = this.canvas.getContext("webgpu");
    if (!ctx) throw new Error("no WebGPU canvas context");
    this.context = ctx;
    this.context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: "opaque" });
    this.params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `${label}-params` });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  }

  static async create(device: GPUDevice, colormap: ColormapName, label: string): Promise<HistView> {
    const module = device.createShaderModule({ code: wgsl(src), label: "hist" });
    const pipe = await device.createRenderPipelineAsync({
      label: "hist",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] },
    });
    const lut = new ColormapLibrary(device).view(colormap);
    return new HistView(device, pipe, lut, label);
  }

  setSource(s: HistSource): void {
    this.src = s;
    this.bind = this.device.createBindGroup({
      layout: this.pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.params } },
        { binding: 1, resource: { buffer: s.counts } },
        { binding: 2, resource: { buffer: s.totals } },
        { binding: 3, resource: this.lut },
        { binding: 4, resource: this.sampler },
      ],
    });
  }

  /** Draw into the canvas (sized to its CSS box × dpr); call within a frame's encoder. */
  encode(enc: GPUCommandEncoder): void {
    if (!this.bind || !this.src) return;
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const b = new ArrayBuffer(32);
    new Uint32Array(b, 0, 4).set([this.src.w, this.src.h, this.src.perColumn ? 1 : 0, 0]);
    new Float32Array(b, 16, 4).set([this.look.scale, this.look.gamma, this.look.floor, 0]);
    this.device.queue.writeBuffer(this.params, 0, b);
    const pass = enc.beginRenderPass({
      label: "hist",
      colorAttachments: [{ view: this.context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    pass.setPipeline(this.pipe);
    pass.setBindGroup(0, this.bind);
    pass.draw(3);
    pass.end();
  }
}
