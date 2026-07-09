// fdtd-optics — renderer: HDR uber-composite + photon tracers + mip bloom +
// ACES present (spec-ref § 5.1 / § 5.7). Render-only path: nothing here is
// gated, so builtin trig / textureSample filtering are fair game.

import renderWgsl from "./render.wgsl?raw";
import type { FdtdGpu, PointSource } from "./solver.js";

export const LAYER = {
  field: 1,
  underlay: 2,
  isophase: 4,
  schlieren: 8,
  envelope: 16,
  domain: 32,
  energy: 64,
  pml: 128,
  sources: 256,
  power: 512,
} as const;

export const TRACER_COUNT = 262144;

// Moreland cool-warm diverging anchors (kennethmoreland.com, sRGB bytes) —
// interpolated to a 256-entry LUT at boot. Render-only (not a golden).
const COOLWARM: Array<[number, number, number]> = [
  [59, 76, 192],
  [98, 130, 234],
  [141, 176, 254],
  [184, 208, 249],
  [221, 221, 221],
  [245, 196, 173],
  [244, 154, 123],
  [222, 96, 77],
  [180, 4, 38],
];

// inferno-style sequential anchors (matplotlib inferno, sRGB bytes)
const INFERNO: Array<[number, number, number]> = [
  [0, 0, 4],
  [22, 11, 57],
  [66, 10, 104],
  [106, 23, 110],
  [147, 38, 103],
  [188, 55, 84],
  [221, 81, 58],
  [243, 120, 25],
  [252, 165, 10],
  [246, 215, 70],
  [252, 255, 164],
];

function buildLuts(): Float32Array {
  const out = new Float32Array(3 * 256 * 4);
  const write = (map: number, i: number, r: number, g: number, b: number): void => {
    const o = (map * 256 + i) * 4;
    // store linear-light values; present pass re-encodes
    out[o] = (r / 255) ** 2.2;
    out[o + 1] = (g / 255) ** 2.2;
    out[o + 2] = (b / 255) ** 2.2;
    out[o + 3] = 1;
  };
  const interp = (map: number, anchors: Array<[number, number, number]>): void => {
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * (anchors.length - 1);
      const k = Math.min(Math.floor(x), anchors.length - 2);
      const f = x - k;
      const a = anchors[k];
      const b = anchors[k + 1];
      write(map, i, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    }
  };
  interp(0, COOLWARM);
  interp(1, INFERNO);
  // cyclic hue wheel with softened luma (phase map)
  for (let i = 0; i < 256; i++) {
    const h = (i / 256) * 6;
    const k = (n: number): number => {
      const x = (n + h) % 6;
      return 1 - Math.max(Math.min(Math.min(x, 4 - x), 1), 0);
    };
    write(2, i, 255 * (1 - k(5) * 0.85), 255 * (1 - k(3) * 0.85), 255 * (1 - k(1) * 0.85));
  }
  return out;
}

export interface RenderState {
  layers: number;
  exposure: number;
  fieldGain: number;
  ampGain: number;
  dftInvW: number;
  time: number;
  pmlN: number;
  isoK: number;
  tracersOn: boolean;
  tracerSpeed: number;
  bloomThreshold: number;
  bloomStrength: number;
  sources: PointSource[];
  frame: number;
}

export class Renderer {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private module: GPUShaderModule;
  private lutBuf: GPUBuffer;
  private ru: GPUBuffer;
  private tu: GPUBuffer;
  private puA: GPUBuffer;
  private puB: GPUBuffer;
  private puC: GPUBuffer;
  private parts: GPUBuffer;
  private samp: GPUSampler;

  private uberPipe: GPURenderPipeline;
  private tracerPipe: GPURenderPipeline;
  private tracerCs: GPUComputePipeline;
  private brightPipe: GPURenderPipeline;
  private blurPipe: GPURenderPipeline;
  private presentPipe: GPURenderPipeline;

  private uberBgl: GPUBindGroupLayout;
  private tracerBgl: GPUBindGroupLayout;
  private tracerDrawBgl!: GPUBindGroupLayout;
  private postBgl: GPUBindGroupLayout;

  private uberBg: GPUBindGroup | null = null;
  private tracerCsBg: GPUBindGroup | null = null;
  private tracerDrawBg: GPUBindGroup | null = null;

  private hdr: GPUTexture | null = null;
  private bloomA: GPUTexture | null = null;
  private bloomB: GPUTexture | null = null;
  private postBgA: GPUBindGroup | null = null;
  private postBgB: GPUBindGroup | null = null;
  private w = 0;
  private h = 0;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
    this.module = device.createShaderModule({ label: "fdtd-render", code: renderWgsl });
    this.samp = device.createSampler({ magFilter: "linear", minFilter: "linear" });

    this.lutBuf = device.createBuffer({
      size: 3 * 256 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.lutBuf, 0, buildLuts());
    const mkUni = (size: number): GPUBuffer =>
      device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.ru = mkUni(304);
    this.tu = mkUni(304);
    this.puA = mkUni(16);
    this.puB = mkUni(16);
    this.puC = mkUni(16);
    this.parts = device.createBuffer({
      size: TRACER_COUNT * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const vis = GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE;
    const ro = (binding: number): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: vis,
      buffer: { type: "read-only-storage" as const },
    });
    this.uberBgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: vis, buffer: { type: "uniform" } },
        ro(1),
        ro(2),
        ro(3),
        ro(4),
        ro(5),
        ro(6),
      ],
    });
    // the particle buffer must NOT appear as read-write and read-only in the
    // same pass scope (hit live on the tracer draw) — compute and draw get
    // disjoint layouts: advect sees parts as read-write, the draw only reads
    // the read-only alias at binding 3.
    this.tracerBgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" as const },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" as const },
        },
      ],
    });
    this.tracerDrawBgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: vis, buffer: { type: "uniform" } },
        ro(2),
        ro(3),
      ],
    });
    this.postBgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });

    const uberLayout = device.createPipelineLayout({ bindGroupLayouts: [this.uberBgl] });
    const tracerLayout = device.createPipelineLayout({ bindGroupLayouts: [this.tracerBgl] });
    const tracerDrawLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.tracerDrawBgl],
    });
    const postLayout = device.createPipelineLayout({ bindGroupLayouts: [this.postBgl] });

    this.uberPipe = device.createRenderPipeline({
      label: "uber",
      layout: uberLayout,
      vertex: { module: this.module, entryPoint: "fs_vs" },
      fragment: {
        module: this.module,
        entryPoint: "uber_fs",
        targets: [{ format: "rgba16float" }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.tracerPipe = device.createRenderPipeline({
      label: "tracers",
      layout: tracerDrawLayout,
      vertex: { module: this.module, entryPoint: "tracer_vs" },
      fragment: {
        module: this.module,
        entryPoint: "tracer_fs",
        targets: [
          {
            format: "rgba16float",
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "point-list" },
    });
    this.tracerCs = device.createComputePipeline({
      label: "tracer-advect",
      layout: tracerLayout,
      compute: { module: this.module, entryPoint: "tracer_advect" },
    });
    const mkPost = (entry: string, format: GPUTextureFormat): GPURenderPipeline =>
      device.createRenderPipeline({
        label: entry,
        layout: postLayout,
        vertex: { module: this.module, entryPoint: "fs_vs" },
        fragment: { module: this.module, entryPoint: entry, targets: [{ format }] },
        primitive: { topology: "triangle-list" },
      });
    this.brightPipe = mkPost("bright_fs", "rgba16float");
    this.blurPipe = mkPost("blur_fs", "rgba16float");
    this.presentPipe = mkPost("present_fs", this.format);
  }

  /** (Re)bind the field buffers of a solver instance. */
  attach(gpu: FdtdGpu): void {
    this.uberBg = this.device.createBindGroup({
      layout: this.uberBgl,
      entries: [
        { binding: 0, resource: { buffer: this.ru } },
        { binding: 1, resource: { buffer: gpu.ez } },
        { binding: 2, resource: { buffer: gpu.mat } },
        { binding: 3, resource: { buffer: gpu.mat2 } },
        { binding: 4, resource: { buffer: gpu.auxE } },
        { binding: 5, resource: { buffer: gpu.phasor } },
        { binding: 6, resource: { buffer: this.lutBuf } },
      ],
    });
    this.tracerCsBg = this.device.createBindGroup({
      layout: this.tracerBgl,
      entries: [
        { binding: 0, resource: { buffer: this.tu } },
        { binding: 1, resource: { buffer: this.parts } },
        { binding: 2, resource: { buffer: gpu.phasor } },
      ],
    });
    this.tracerDrawBg = this.device.createBindGroup({
      layout: this.tracerDrawBgl,
      entries: [
        { binding: 0, resource: { buffer: this.tu } },
        { binding: 2, resource: { buffer: gpu.phasor } },
        { binding: 3, resource: { buffer: this.parts } },
      ],
    });
    // scatter particles off-grid so they respawn immediately
    this.device.queue.writeBuffer(this.parts, 0, new Float32Array(TRACER_COUNT * 4));
  }

  private ensureTargets(w: number, h: number): void {
    if (this.w === w && this.h === h && this.hdr) return;
    this.w = w;
    this.h = h;
    this.hdr?.destroy();
    this.bloomA?.destroy();
    this.bloomB?.destroy();
    const mk = (tw: number, th: number): GPUTexture =>
      this.device.createTexture({
        size: [Math.max(1, tw), Math.max(1, th)],
        format: "rgba16float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
    this.hdr = mk(w, h);
    this.bloomA = mk(w >> 1, h >> 1);
    this.bloomB = mk(w >> 1, h >> 1);
    const bg = (uni: GPUBuffer, src: GPUTexture, bloom: GPUTexture): GPUBindGroup =>
      this.device.createBindGroup({
        layout: this.postBgl,
        entries: [
          { binding: 0, resource: { buffer: uni } },
          { binding: 1, resource: src.createView() },
          { binding: 2, resource: this.samp },
          { binding: 3, resource: bloom.createView() },
        ],
      });
    this.postBgA = bg(this.puA, this.hdr, this.hdr); // bright: src=hdr
    this.postBgB = bg(this.puB, this.bloomA, this.bloomA); // blur: src=bloomA
    this.postBgC = bg(this.puC, this.hdr, this.bloomB); // present
    this.device.queue.writeBuffer(this.puA, 0, new Float32Array([1 / w, 1 / h, 0.55, 0]));
    this.device.queue.writeBuffer(
      this.puB,
      0,
      new Float32Array([2 / w, 2 / h, 0, 0]),
    );
  }
  private postBgC: GPUBindGroup | null = null;

  private packRu(gpu: FdtdGpu, st: RenderState): void {
    const buf = new ArrayBuffer(304);
    const dv = new DataView(buf);
    dv.setUint32(0, gpu.nx, true);
    dv.setUint32(4, gpu.ny, true);
    dv.setUint32(8, st.layers, true);
    dv.setUint32(12, Math.min(st.sources.length, 16), true);
    dv.setFloat32(16, st.exposure, true);
    dv.setFloat32(20, st.fieldGain, true);
    dv.setFloat32(24, st.dftInvW, true);
    dv.setFloat32(28, st.time, true);
    dv.setFloat32(32, st.pmlN, true);
    dv.setFloat32(36, st.isoK, true);
    dv.setFloat32(40, 1, true);
    dv.setFloat32(44, st.ampGain, true);
    for (let k = 0; k < 16; k++) {
      const s = st.sources[k];
      const o = 48 + k * 16;
      dv.setFloat32(o, s ? s.i : 0, true);
      dv.setFloat32(o + 4, s ? s.j : 0, true);
      dv.setFloat32(o + 8, 0, true);
      dv.setFloat32(o + 12, s?.on ? 1 : 0, true);
    }
    this.device.queue.writeBuffer(this.ru, 0, buf);
  }

  private packTu(gpu: FdtdGpu, st: RenderState): void {
    const buf = new ArrayBuffer(304);
    const dv = new DataView(buf);
    dv.setUint32(0, gpu.nx, true);
    dv.setUint32(4, gpu.ny, true);
    dv.setUint32(8, TRACER_COUNT, true);
    dv.setUint32(12, st.frame, true);
    dv.setFloat32(16, st.tracerSpeed, true);
    dv.setFloat32(20, st.dftInvW, true);
    dv.setFloat32(24, 1, true);
    dv.setFloat32(28, 0, true);
    for (let k = 0; k < 16; k++) {
      const s = st.sources[k];
      const o = 32 + k * 16;
      dv.setFloat32(o, s ? s.i : 0, true);
      dv.setFloat32(o + 4, s ? s.j : 0, true);
      dv.setFloat32(o + 8, 1, true);
      dv.setFloat32(o + 12, s?.on ? 1 : 0, true);
    }
    dv.setUint32(288, Math.min(st.sources.length, 16), true);
    this.device.queue.writeBuffer(this.tu, 0, buf);
  }

  draw(
    enc: GPUCommandEncoder,
    gpu: FdtdGpu,
    canvasView: GPUTextureView,
    w: number,
    h: number,
    st: RenderState,
  ): void {
    if (!this.uberBg || !this.tracerCsBg) return;
    this.ensureTargets(w, h);
    if (!this.hdr || !this.bloomA || !this.bloomB) return;
    this.packRu(gpu, st);
    this.device.queue.writeBuffer(
      this.puC,
      0,
      new Float32Array([1 / w, 1 / h, 0, st.bloomStrength]),
    );
    this.device.queue.writeBuffer(
      this.puA,
      0,
      new Float32Array([1 / w, 1 / h, st.bloomThreshold, 0]),
    );

    if (st.tracersOn) {
      this.packTu(gpu, st);
      const cp = enc.beginComputePass();
      cp.setPipeline(this.tracerCs);
      cp.setBindGroup(0, this.tracerCsBg);
      cp.dispatchWorkgroups(Math.ceil(TRACER_COUNT / 64));
      cp.end();
    }

    const rp = (
      view: GPUTextureView,
      clear: boolean,
    ): GPURenderPassEncoder =>
      enc.beginRenderPass({
        colorAttachments: [
          {
            view,
            loadOp: clear ? "clear" : "load",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });

    // 1. uber composite into HDR
    let pass = rp(this.hdr.createView(), true);
    pass.setPipeline(this.uberPipe);
    pass.setBindGroup(0, this.uberBg);
    pass.draw(3);
    pass.end();
    // 2. tracers additive into HDR
    if (st.tracersOn && this.tracerDrawBg) {
      pass = rp(this.hdr.createView(), false);
      pass.setPipeline(this.tracerPipe);
      pass.setBindGroup(0, this.tracerDrawBg);
      pass.draw(TRACER_COUNT);
      pass.end();
    }
    // 3. bright pass -> bloomA (half res)
    if (!this.postBgA || !this.postBgB || !this.postBgC) return;
    pass = rp(this.bloomA.createView(), true);
    pass.setPipeline(this.brightPipe);
    pass.setBindGroup(0, this.postBgA);
    pass.draw(3);
    pass.end();
    // 4. blur bloomA -> bloomB
    pass = rp(this.bloomB.createView(), true);
    pass.setPipeline(this.blurPipe);
    pass.setBindGroup(0, this.postBgB);
    pass.draw(3);
    pass.end();
    // 5. present: hdr + bloomB -> canvas (ACES)
    pass = rp(canvasView, true);
    pass.setPipeline(this.presentPipe);
    pass.setBindGroup(0, this.postBgC);
    pass.draw(3);
    pass.end();
  }
}
