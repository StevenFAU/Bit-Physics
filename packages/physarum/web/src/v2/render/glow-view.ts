// Slime Mould renderer: trail → field texture (+ mips) → emissive glow into
// the HDR scene target, then a sample of agents as additive sparks. The A/B
// compare shows a checkpoint's trail left of a split and the live one right.

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import type { Camera2D } from "@bp/render";
import { SCENE_FORMAT } from "@bp/render";
import prepSrc from "./glow-prep.wgsl?raw";
import mipSrc from "./glow-mip.wgsl?raw";
import glowSrc from "./glow.wgsl?raw";
import type { Palette } from "./look.js";
import { COLONIES } from "./look.js";

const MIPS = 4;
const SCALE = 65536;

export interface GlowSource {
  w: number;
  h: number;
  trail: GPUBuffer;
  /** Deposits of the last step (u32 ×65536 per agent). */
  deposit: GPUBuffer;
  agents: GPUBuffer;
  n: number;
  meanTrail: number;
  depositPerAgent: number;
  /** Bumps whenever the trail changes (the sim's step count). */
  version: number;
  /** The scene's environment (walls are marked in it) and whether it has walls. */
  env: GPUBuffer;
  walls: boolean;
  /** Territories: colonies (trail planes) and each plane's mean when the agents are shared equally. */
  colonies?: number;
  colonyMeans?: number[];
}

export interface LookOptions {
  palette: Palette;
  /** Trail (× its mean) at the top of the colour ramp. */
  top: number;
  /** HDR lift past the top of the ramp. */
  hot: number;
  /** Glow from agents crossing a cell. */
  busy: number;
  /** Overall emission gain. */
  gain: number;
  /** Spark gain (0 hides sparks). */
  spark: number;
  /** Draw every n-th agent as a spark. */
  sparkStride: number;
  /** Agar grain amount (0–1). */
  grain: number;
}

export const DEFAULT_LOOK: Omit<LookOptions, "palette"> = {
  top: 24,
  hot: 6,
  busy: 0.02,
  gain: 1,
  spark: 0.05,
  sparkStride: 3,
  grain: 0.35,
};

interface FieldTex {
  tex: GPUTexture;
  w: number;
  h: number;
  levels: GPUTextureView[];
  view: GPUTextureView;
  prepBG: GPUBindGroup | null;
  prepFor: [GPUBuffer, GPUBuffer, GPUBuffer] | null;
  mipBGs: GPUBindGroup[];
}

export class GlowView {
  look: LookOptions;
  private readonly device: GPUDevice;
  private readonly prepPipe: GPUComputePipeline;
  private readonly mipPipe: GPUComputePipeline;
  private readonly glowPipe: GPURenderPipeline;
  private readonly sparkPipe: GPURenderPipeline;
  private readonly prepLayout: GPUBindGroupLayout;
  private readonly mipLayout: GPUBindGroupLayout;
  private readonly lookLayout: GPUBindGroupLayout;
  private readonly sparkLayout: GPUBindGroupLayout;
  private readonly markLayout: GPUBindGroupLayout;
  private readonly markPipe: GPURenderPipeline;
  private readonly markInfo: GPUBuffer;
  private markBuf: GPUBuffer;
  private markBG: GPUBindGroup;
  private markCount = 0;
  private readonly sampler: GPUSampler;
  private readonly lookBuf: GPUBuffer;
  private readonly prepBufA: GPUBuffer;
  private readonly prepBufB: GPUBuffer;
  private readonly sparkBuf: GPUBuffer;
  private a: FieldTex | null = null;
  private b: FieldTex | null = null;
  private lookBG: GPUBindGroup | null = null;
  private sparkBGs = new Map<GPUBuffer, GPUBindGroup>();
  private preparedVersion = -1;
  private preparedB = "";
  /** Compare split in CSS-px fraction of the width (null = off). */
  split: number | null = null;
  /** Emission fade (0–1) for the scene director's cross-over; the agar stays. */
  fade = 1;

  constructor(device: GPUDevice, look: LookOptions) {
    this.device = device;
    this.look = look;
    const C = GPUShaderStage.COMPUTE;
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.prepLayout = device.createBindGroupLayout({
      label: "glow-prep",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform" } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: C, storageTexture: { access: "write-only", format: "rgba16float" } },
        { binding: 4, visibility: C, buffer: { type: "read-only-storage" } },
      ],
    });
    this.mipLayout = device.createBindGroupLayout({
      label: "glow-mip",
      entries: [
        { binding: 0, visibility: C, texture: { sampleType: "float" } },
        { binding: 1, visibility: C, storageTexture: { access: "write-only", format: "rgba16float" } },
      ],
    });
    this.lookLayout = device.createBindGroupLayout({
      label: "glow-look",
      entries: [
        { binding: 0, visibility: VF, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ],
    });
    this.sparkLayout = device.createBindGroupLayout({
      label: "glow-spark",
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      ],
    });
    this.markLayout = device.createBindGroupLayout({
      label: "glow-marks",
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      ],
    });
    const prepModule = device.createShaderModule({ code: prepSrc, label: "glow-prep" });
    const mipModule = device.createShaderModule({ code: mipSrc, label: "glow-mip" });
    const glowModule = device.createShaderModule({ code: wgsl(glowSrc), label: "glow" });
    this.prepPipe = device.createComputePipeline({
      label: "glow-prep",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.prepLayout] }),
      compute: { module: prepModule, entryPoint: "prep" },
    });
    this.mipPipe = device.createComputePipeline({
      label: "glow-mip",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.mipLayout] }),
      compute: { module: mipModule, entryPoint: "downsample" },
    });
    this.glowPipe = device.createRenderPipeline({
      label: "glow",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.lookLayout] }),
      vertex: { module: glowModule, entryPoint: "vs" },
      fragment: { module: glowModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT }] },
      primitive: { topology: "triangle-list" },
    });
    this.sparkPipe = device.createRenderPipeline({
      label: "glow-sparks",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.lookLayout, this.sparkLayout] }),
      vertex: { module: glowModule, entryPoint: "spark_vs" },
      fragment: {
        module: glowModule,
        entryPoint: "spark_fs",
        targets: [
          {
            format: SCENE_FORMAT,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "point-list" },
    });
    const additive: GPUBlendState = {
      color: { srcFactor: "one", dstFactor: "one", operation: "add" },
      alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
    };
    this.markPipe = device.createRenderPipeline({
      label: "glow-marks",
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.lookLayout, this.markLayout] }),
      vertex: { module: glowModule, entryPoint: "mark_vs" },
      fragment: { module: glowModule, entryPoint: "mark_fs", targets: [{ format: SCENE_FORMAT, blend: additive }] },
      primitive: { topology: "triangle-list" },
    });
    this.sampler = device.createSampler({
      label: "glow-field",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });
    const U = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    this.lookBuf = device.createBuffer({ size: 240, usage: U, label: "glow-look" });
    this.prepBufA = device.createBuffer({ size: 48, usage: U, label: "glow-prep-a" });
    this.prepBufB = device.createBuffer({ size: 48, usage: U, label: "glow-prep-b" });
    this.sparkBuf = device.createBuffer({ size: 32, usage: U, label: "glow-sparks" });
    this.markInfo = device.createBuffer({ size: 16, usage: U, label: "glow-marks-info" });
    this.markBuf = device.createBuffer({ size: 16 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "glow-marks" });
    this.markBG = this.makeMarkBG();
  }

  private makeMarkBG(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.markLayout,
      label: "glow-marks",
      entries: [
        { binding: 0, resource: { buffer: this.markInfo } },
        { binding: 1, resource: { buffer: this.markBuf } },
      ],
    });
  }

  /** Food crumbs and lights to draw (cells): kind 0 food, 1 light, 2 food preview. */
  setMarkers(list: readonly { x: number; y: number; r: number; kind: 0 | 1 | 2 }[]): void {
    this.markCount = list.length;
    if (list.length === 0) return;
    if (this.markBuf.size < list.length * 16) {
      this.markBuf.destroy();
      this.markBuf = this.device.createBuffer({ size: list.length * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "glow-marks" });
      this.markBG = this.makeMarkBG();
    }
    const f = new Float32Array(list.length * 4);
    list.forEach((m, i) => f.set([m.x, m.y, m.r, m.kind], i * 4));
    this.device.queue.writeBuffer(this.markBuf, 0, f);
  }

  private makeField(w: number, h: number, label: string): FieldTex {
    const levels = Math.max(1, Math.min(MIPS, Math.floor(Math.log2(Math.min(w, h))) - 2));
    const tex = this.device.createTexture({
      label,
      size: [w, h],
      format: "rgba16float",
      mipLevelCount: levels,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const views = Array.from({ length: levels }, (_, i) => tex.createView({ baseMipLevel: i, mipLevelCount: 1 }));
    const mipBGs = views.slice(1).map((dst, i) =>
      this.device.createBindGroup({
        layout: this.mipLayout,
        label: `${label}-mip-${i + 1}`,
        entries: [
          { binding: 0, resource: views[i]! },
          { binding: 1, resource: dst },
        ],
      }),
    );
    return { tex, w, h, levels: views, view: tex.createView(), prepBG: null, prepFor: null, mipBGs };
  }

  /** Point the renderer at a (new) simulation; reallocates on a size change. */
  private ensureFields(src: GlowSource): void {
    if (!this.a || this.a.w !== src.w || this.a.h !== src.h) {
      this.a?.tex.destroy();
      this.b?.tex.destroy();
      this.a = this.makeField(src.w, src.h, "glow-field-a");
      this.b = this.makeField(src.w, src.h, "glow-field-b");
      this.lookBG = this.device.createBindGroup({
        layout: this.lookLayout,
        label: "glow-look",
        entries: [
          { binding: 0, resource: { buffer: this.lookBuf } },
          { binding: 1, resource: this.a.view },
          { binding: 2, resource: this.b.view },
          { binding: 3, resource: this.sampler },
        ],
      });
      this.preparedVersion = -1;
      this.preparedB = "";
    }
  }

  private prepBG(f: FieldTex, buf: GPUBuffer, trail: GPUBuffer, dep: GPUBuffer, env: GPUBuffer): GPUBindGroup {
    if (f.prepBG && f.prepFor?.[0] === trail && f.prepFor[1] === dep && f.prepFor[2] === env) return f.prepBG;
    f.prepFor = [trail, dep, env];
    f.prepBG = this.device.createBindGroup({
      layout: this.prepLayout,
      label: "glow-prep",
      entries: [
        { binding: 0, resource: { buffer: buf } },
        { binding: 1, resource: { buffer: trail } },
        { binding: 2, resource: { buffer: dep } },
        { binding: 3, resource: f.levels[0]! },
        { binding: 4, resource: { buffer: env } },
      ],
    });
    return f.prepBG;
  }

  private writePrep(buf: GPUBuffer, src: GlowSource, withAgents: boolean): void {
    const ab = new ArrayBuffer(48);
    const u = new Uint32Array(ab);
    const f = new Float32Array(ab);
    u[0] = src.w;
    u[1] = src.h;
    u[2] = src.walls ? 1 : 0;
    u[3] = src.colonies ?? 1;
    f[4] = 1 / Math.max(src.meanTrail, 1e-12);
    f[5] = withAgents ? 1 / (src.depositPerAgent * SCALE) : 0;
    (src.colonyMeans ?? []).slice(0, 4).forEach((m, k) => {
      f[8 + k] = 1 / Math.max(m, 1e-12);
    });
    this.device.queue.writeBuffer(buf, 0, ab);
  }

  private encodePrep(pass: GPUComputePassEncoder, f: FieldTex, bind: GPUBindGroup): void {
    pass.setPipeline(this.prepPipe);
    pass.setBindGroup(0, bind);
    pass.dispatchWorkgroups(Math.ceil(f.w / 16), Math.ceil(f.h / 16));
    pass.setPipeline(this.mipPipe);
    f.mipBGs.forEach((bg, i) => {
      const w = Math.max(1, f.w >> (i + 1));
      const h = Math.max(1, f.h >> (i + 1));
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(w / 16), Math.ceil(h / 16));
    });
  }

  /** Forget the prepared field (a scene change reuses the version numbers). */
  invalidate(): void {
    this.preparedVersion = -1;
    this.preparedB = "";
  }

  encode(
    enc: GPUCommandEncoder,
    target: GPUTextureView,
    targetW: number,
    targetH: number,
    camera: Camera2D,
    pixelScale: number,
    src: GlowSource,
    compare: { trail: GPUBuffer; key: string } | null,
    profiler?: GpuProfiler,
  ): void {
    this.ensureFields(src);
    const a = this.a!;
    const b = this.b!;
    const needA = src.version !== this.preparedVersion;
    const needB = compare !== null && compare.key !== this.preparedB;
    if (needA || needB) {
      const pass = enc.beginComputePass({ label: "glow-prep", timestampWrites: profiler?.pass("prep") });
      if (needA) {
        this.writePrep(this.prepBufA, src, true);
        this.encodePrep(pass, a, this.prepBG(a, this.prepBufA, src.trail, src.deposit, src.env));
        this.preparedVersion = src.version;
      }
      if (needB && compare) {
        // a checkpoint holds no deposits: the agent glow is zeroed (the binding still needs a buffer)
        this.writePrep(this.prepBufB, src, false);
        this.encodePrep(pass, b, this.prepBG(b, this.prepBufB, compare.trail, src.deposit, src.env));
        this.preparedB = compare.key;
      }
      pass.end();
    }
    if (!compare) this.preparedB = "";

    // look uniform
    const L = this.look;
    const cam = camera.uniform(pixelScale);
    const f = new Float32Array(60);
    f.set([cam.cx, cam.cy, cam.unitsPerPx, 0], 0);
    f.set([targetW, targetH, src.w, src.h], 4);
    L.palette.stops.forEach((s, i) => f.set([s[0], s[1], s[2], 0], 8 + i * 4));
    f.set([...L.palette.bg, L.grain], 28);
    f.set([L.top, L.hot, L.busy, L.gain * this.fade], 32);
    f.set([...L.palette.spark, L.spark * this.fade], 36);
    f.set([compare && this.split !== null ? this.split * targetW : -1, 0.7, 0, src.colonies ?? 1], 40);
    COLONIES.forEach((c, k) => f.set([...c.hue, 0], 44 + k * 4));
    this.device.queue.writeBuffer(this.lookBuf, 0, f);

    // sparks: periodic images needed to cover the view
    const stride = Math.max(1, Math.round(L.sparkStride));
    const viewW = targetW * cam.unitsPerPx;
    const viewH = targetH * cam.unitsPerPx;
    // images at d + k·dom with d in [−dom/2, dom/2) cover [−view/2, view/2] for |k| ≤ K
    const images = (view: number, dom: number): number => Math.min(5, 2 * Math.max(0, Math.ceil(view / (2 * dom) + 0.5) - 1) + 1);
    const ix = images(viewW, src.w);
    const iy = images(viewH, src.h);
    this.device.queue.writeBuffer(this.sparkBuf, 0, new Uint32Array([stride, 0, src.n, ix, iy, src.colonies ?? 1, 0, 0]));
    let sparkBG = this.sparkBGs.get(src.agents);
    if (!sparkBG) {
      sparkBG = this.device.createBindGroup({
        layout: this.sparkLayout,
        label: "glow-sparks",
        entries: [
          { binding: 0, resource: { buffer: this.sparkBuf } },
          { binding: 1, resource: { buffer: src.agents } },
        ],
      });
      if (this.sparkBGs.size > 8) this.sparkBGs.clear();
      this.sparkBGs.set(src.agents, sparkBG);
    }

    const rp = enc.beginRenderPass({
      label: "glow",
      colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("glow"),
    });
    rp.setPipeline(this.glowPipe);
    rp.setBindGroup(0, this.lookBG!);
    rp.draw(3);
    if (L.spark > 0) {
      rp.setPipeline(this.sparkPipe);
      rp.setBindGroup(0, this.lookBG!);
      rp.setBindGroup(1, sparkBG);
      rp.draw(Math.ceil(src.n / stride), ix * iy);
    }
    if (this.markCount > 0) {
      this.device.queue.writeBuffer(this.markInfo, 0, new Uint32Array([this.markCount, ix, iy, 0]));
      rp.setPipeline(this.markPipe);
      rp.setBindGroup(0, this.lookBG!);
      rp.setBindGroup(1, this.markBG);
      rp.draw(6, this.markCount * ix * iy);
    }
    rp.end();
  }

  /** Drop cached bind groups for buffers that are gone (scene change). */
  forgetBuffers(): void {
    this.sparkBGs.clear();
    for (const f of [this.a, this.b]) {
      if (!f) continue;
      f.prepBG = null;
      f.prepFor = null;
    }
    this.invalidate();
  }

  destroy(): void {
    this.a?.tex.destroy();
    this.b?.tex.destroy();
    for (const b of [this.lookBuf, this.prepBufA, this.prepBufB, this.sparkBuf, this.markInfo, this.markBuf]) b.destroy();
  }
}
