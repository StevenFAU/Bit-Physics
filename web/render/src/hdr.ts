// The HDR pipeline (00-foundation.md § 3.1 — "the white-blob fix").
//
// Scene colour is rendered into an rgba16float target. One composite pass
// then applies measured exposure, a tone map, the sRGB output transform and
// a ±0.5-LSB blue-noise dither into the swapchain. Exposure is measured on
// the GPU every frame (64-bin log2 histogram → percentile → eased), so a
// field that brightens never clips to white and nothing waits on a readback.

import type { GpuContext, GpuProfiler } from "@bp/gpu";
import { wgsl, ReadbackSlot } from "@bp/gpu";
import "./register.js";
import bloomSrc from "./wgsl/bloom.wgsl?raw";
import compositeSrc from "./wgsl/composite.wgsl?raw";
import exposureSrc from "./wgsl/exposure.wgsl?raw";
import { BLUE_NOISE_64_BASE64, BLUE_NOISE_SIZE } from "./blue-noise-64.js";

export const SCENE_FORMAT: GPUTextureFormat = "rgba16float";

export type ToneMap = "neutral" | "agx" | "none";

export interface ExposureConfig {
  /** "auto" measures; "pinned" holds `value` (e.g. for a fixed colour scale). */
  mode: "auto" | "pinned";
  /** Pinned exposure multiplier. */
  value: number;
  /** Which luminance percentile is mapped to `key`. Default 0.95. */
  percentile: number;
  /** Target linear value for that percentile. Default 0.8 (of white). */
  key: number;
  /** Easing time constant in seconds. Default 0.6. */
  tau: number;
  min: number;
  max: number;
}

export const DEFAULT_EXPOSURE: ExposureConfig = {
  mode: "auto",
  value: 1,
  percentile: 0.95,
  key: 0.8,
  tau: 0.6,
  min: 1 / 64,
  max: 64,
};

export interface BloomConfig {
  /**
   * Mix weight of the blurred chain (0 = off, no passes run). Energy-
   * preserving: the composite is mix(scene, bloom, intensity). Foundation
   * default for emissive content: ≤ 0.08.
   */
  intensity: number;
  /** Mip levels below the scene (each half the size of the last). Default 6. */
  levels: number;
}

export interface HdrOptions {
  toneMap?: ToneMap;
  exposure?: Partial<ExposureConfig>;
  /** Dither amplitude in output LSB; 0 disables. Default 1. */
  dither?: number;
  /** Bloom for emissive scenes (glow, fire, sparks). Off unless intensity > 0. */
  bloom?: Partial<BloomConfig>;
}

export interface ExposureReading {
  exposure: number;
  measured: number;
  target: number;
}

function decodeBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function createBlueNoiseTexture(device: GPUDevice): GPUTexture {
  const tex = device.createTexture({
    size: [BLUE_NOISE_SIZE, BLUE_NOISE_SIZE],
    format: "r8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: "blue-noise-64",
  });
  device.queue.writeTexture(
    { texture: tex },
    decodeBase64(BLUE_NOISE_64_BASE64),
    { bytesPerRow: BLUE_NOISE_SIZE },
    [BLUE_NOISE_SIZE, BLUE_NOISE_SIZE],
  );
  return tex;
}

export class HdrPipeline {
  readonly format: GPUTextureFormat;
  readonly context: GPUCanvasContext;
  toneMap: ToneMap;
  dither: number;
  exposure: ExposureConfig;
  /** Bloom intensity and depth; intensity may change per frame, levels at the next resize. */
  bloom: BloomConfig;

  private readonly device: GPUDevice;
  private scene: GPUTexture | null = null;
  private sceneViewCache: GPUTextureView | null = null;
  private readonly noise: GPUTexture;
  private readonly sampler: GPUSampler;
  private readonly bins: GPUBuffer;
  private readonly state: GPUBuffer;
  private readonly exposureParams: GPUBuffer;
  private readonly compositeParams: GPUBuffer;
  private readonly histogramPipeline: GPUComputePipeline;
  private readonly resolvePipeline: GPUComputePipeline;
  private readonly compositePipeline: GPURenderPipeline;
  private exposureBG: GPUBindGroup | null = null;
  private resolveBG: GPUBindGroup | null = null;
  private compositeBG: GPUBindGroup | null = null;
  private readonly readback: ReadbackSlot;
  // bloom: lazily built the first time intensity > 0
  private bloomPipes: { down: GPURenderPipeline; up: GPURenderPipeline; layout: GPUBindGroupLayout; sampler: GPUSampler } | null =
    null;
  private bloomChain: {
    w: number;
    h: number;
    /** Levels asked for (the chain may hold fewer on a small target). */
    requested: number;
    levels: number;
    down: GPUTexture[];
    up: GPUTexture[];
    passes: { target: GPUTextureView; bind: GPUBindGroup; params: GPUBuffer }[];
    top: GPUTextureView;
  } | null = null;
  private readonly blackTex: GPUTexture;
  private readonly blackView: GPUTextureView;
  private compositeBloomView: GPUTextureView | null = null;
  private frame = 0;
  private lastReading: ExposureReading = { exposure: 1, measured: 0, target: 1 };

  /** Scene target size in pixels. */
  width = 0;
  height = 0;

  constructor(
    gpu: GpuContext,
    readonly canvas: HTMLCanvasElement,
    options: HdrOptions = {},
  ) {
    const { device } = gpu;
    this.device = device;
    this.toneMap = options.toneMap ?? "neutral";
    this.dither = options.dither ?? 1;
    this.exposure = { ...DEFAULT_EXPOSURE, ...options.exposure };
    this.bloom = { intensity: 0, levels: 6, ...options.bloom };
    const ctx = canvas.getContext("webgpu");
    if (!ctx) throw new Error("canvas.getContext('webgpu') returned null");
    this.context = ctx;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format: this.format, alphaMode: "opaque" });

    this.noise = createBlueNoiseTexture(device);
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", label: "hdr-scene" });
    this.bins = device.createBuffer({ size: 64 * 4, usage: GPUBufferUsage.STORAGE, label: "exposure-bins" });
    this.state = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      label: "exposure-state",
    });
    this.exposureParams = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "exposure-params",
    });
    this.compositeParams = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "composite-params",
    });
    this.readback = new ReadbackSlot(device, 16, "exposure-readback");
    this.blackTex = device.createTexture({
      size: [1, 1],
      format: SCENE_FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING,
      label: "bloom-off",
    });
    this.blackView = this.blackTex.createView();

    const exposureModule = device.createShaderModule({ code: wgsl(exposureSrc), label: "exposure" });
    this.histogramPipeline = device.createComputePipeline({
      label: "exposure-histogram",
      layout: "auto",
      compute: { module: exposureModule, entryPoint: "histogram" },
    });
    this.resolvePipeline = device.createComputePipeline({
      label: "exposure-resolve",
      layout: "auto",
      compute: { module: exposureModule, entryPoint: "resolve" },
    });
    const compositeModule = device.createShaderModule({ code: wgsl(compositeSrc), label: "composite" });
    this.compositePipeline = device.createRenderPipeline({
      label: "hdr-composite",
      layout: "auto",
      vertex: { module: compositeModule, entryPoint: "vs" },
      fragment: { module: compositeModule, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
    });
  }

  /** The HDR target to render scene colour into (valid after `resize`). */
  get sceneView(): GPUTextureView {
    if (!this.sceneViewCache) throw new Error("HdrPipeline.resize() must run before rendering");
    return this.sceneViewCache;
  }

  /**
   * Size the swapchain to CSS size × dpr and the scene target to that × scale
   * (the governor's render scale). Cheap to call every frame; only reallocates
   * on change.
   */
  resize(cssWidth: number, cssHeight: number, dpr: number, scale = 1): boolean {
    const bw = Math.max(1, Math.round(cssWidth * dpr));
    const bh = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    const w = Math.max(1, Math.round(bw * scale));
    const h = Math.max(1, Math.round(bh * scale));
    if (this.scene && this.width === w && this.height === h) return false;
    this.scene?.destroy();
    this.width = w;
    this.height = h;
    this.scene = this.device.createTexture({
      size: [w, h],
      format: SCENE_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      label: "hdr-scene",
    });
    this.sceneViewCache = this.scene.createView();
    this.exposureBG = this.device.createBindGroup({
      layout: this.histogramPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 1, resource: this.sceneViewCache },
        { binding: 2, resource: { buffer: this.bins } },
      ],
      label: "exposure-histogram",
    });
    // resolve uses bindings 0, 2, 3 (layout "auto" prunes unused ones per entry point)
    this.resolveBG = this.device.createBindGroup({
      layout: this.resolvePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.exposureParams } },
        { binding: 2, resource: { buffer: this.bins } },
        { binding: 3, resource: { buffer: this.state } },
      ],
      label: "exposure-resolve",
    });
    this.destroyBloomChain();
    this.compositeBloomView = null;
    this.compositeBG = null;
    return true;
  }

  private ensureCompositeBG(bloomView: GPUTextureView): GPUBindGroup {
    if (this.compositeBG && this.compositeBloomView === bloomView) return this.compositeBG;
    this.compositeBloomView = bloomView;
    this.compositeBG = this.device.createBindGroup({
      layout: this.compositePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.compositeParams } },
        { binding: 1, resource: this.sceneView },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: this.noise.createView() },
        { binding: 4, resource: { buffer: this.state } },
        { binding: 5, resource: bloomView },
      ],
      label: "hdr-composite",
    });
    return this.compositeBG;
  }

  private buildBloomPipes(): NonNullable<HdrPipeline["bloomPipes"]> {
    const device = this.device;
    const layout = device.createBindGroupLayout({
      label: "bloom-bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    const module = device.createShaderModule({ code: wgsl(bloomSrc), label: "bloom" });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const mk = (entryPoint: string): GPURenderPipeline =>
      device.createRenderPipeline({
        label: `bloom-${entryPoint}`,
        layout: pl,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint, targets: [{ format: SCENE_FORMAT }] },
        primitive: { topology: "triangle-list" },
      });
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      label: "bloom",
    });
    return { down: mk("down"), up: mk("up"), layout, sampler };
  }

  /** Mip chain for the current scene size; levels stop before a side drops under 4 px. */
  private ensureBloomChain(): NonNullable<HdrPipeline["bloomChain"]> {
    const want = Math.max(1, Math.round(this.bloom.levels));
    const c = this.bloomChain;
    if (c && c.w === this.width && c.h === this.height && c.requested === want) return c;
    this.destroyBloomChain();
    this.bloomPipes ??= this.buildBloomPipes();
    const pipes = this.bloomPipes;
    const device = this.device;
    const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    const down: GPUTexture[] = [];
    let w = this.width;
    let h = this.height;
    for (let i = 0; i < want; i += 1) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      if (i > 0 && Math.min(w, h) < 4) break;
      down.push(device.createTexture({ size: [w, h], format: SCENE_FORMAT, usage, label: `bloom-down-${i}` }));
    }
    const levels = down.length;
    const up: GPUTexture[] = [];
    for (let i = 0; i < levels - 1; i += 1) {
      up.push(device.createTexture({ size: [down[i]!.width, down[i]!.height], format: SCENE_FORMAT, usage, label: `bloom-up-${i}` }));
    }
    const passes: { target: GPUTextureView; bind: GPUBindGroup; params: GPUBuffer }[] = [];
    const pass = (target: GPUTexture, src: GPUTextureView, srcW: number, srcH: number, karis: boolean, base: GPUTextureView): void => {
      const params = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "bloom-params" });
      const ab = new ArrayBuffer(16);
      new Float32Array(ab, 0, 2).set([1 / srcW, 1 / srcH]);
      new Uint32Array(ab, 8, 1)[0] = karis ? 1 : 0;
      device.queue.writeBuffer(params, 0, ab);
      passes.push({
        target: target.createView(),
        params,
        bind: device.createBindGroup({
          layout: pipes.layout,
          label: "bloom-bg",
          entries: [
            { binding: 0, resource: { buffer: params } },
            { binding: 1, resource: src },
            { binding: 2, resource: pipes.sampler },
            { binding: 3, resource: base },
          ],
        }),
      });
    };
    const black = this.blackView;
    // downsample: scene → down[0] → … → down[L−1]
    let src = this.sceneView;
    let sw = this.width;
    let sh = this.height;
    for (let i = 0; i < levels; i += 1) {
      pass(down[i]!, src, sw, sh, i === 0, black);
      src = down[i]!.createView();
      sw = down[i]!.width;
      sh = down[i]!.height;
    }
    // upsample: up[i] = down[i] + tent(coarser)
    for (let i = levels - 2; i >= 0; i -= 1) {
      const coarser = i === levels - 2 ? down[levels - 1]! : up[i + 1]!;
      pass(up[i]!, coarser.createView(), coarser.width, coarser.height, false, down[i]!.createView());
    }
    const top = levels > 1 ? up[0]!.createView() : down[0]!.createView();
    this.bloomChain = { w: this.width, h: this.height, requested: want, levels, down, up, passes, top };
    return this.bloomChain;
  }

  private destroyBloomChain(): void {
    const c = this.bloomChain;
    if (!c) return;
    for (const t of c.down) t.destroy();
    for (const t of c.up) t.destroy();
    for (const p of c.passes) p.params.destroy();
    this.bloomChain = null;
  }

  /** Forget the eased exposure (e.g. on a scene change) so the next frame snaps. */
  resetExposure(): void {
    this.device.queue.writeBuffer(this.state, 0, new Float32Array([1, 0, 1, 0]));
  }

  /**
   * Record exposure metering + the composite into `enc`, drawing to the
   * canvas's current texture. Call after the scene has been rendered into
   * `sceneView` in the same encoder.
   */
  encode(enc: GPUCommandEncoder, dtSeconds: number, profiler?: GpuProfiler): void {
    if (!this.exposureBG || !this.resolveBG || !this.sceneViewCache) return;
    const bloomOn = this.bloom.intensity > 0;
    const chain = bloomOn ? this.ensureBloomChain() : null;
    if (chain) this.encodeBloom(enc, chain, profiler);
    const compositeBG = this.ensureCompositeBG(chain ? chain.top : this.blackView);
    const e = this.exposure;
    const ep = new ArrayBuffer(32);
    const f = new Float32Array(ep);
    const u = new Uint32Array(ep);
    f[0] = Math.min(Math.max(dtSeconds, 0), 0.25);
    f[1] = e.tau;
    f[2] = e.percentile;
    f[3] = e.key;
    u[4] = e.mode === "pinned" ? 1 : 0;
    f[5] = e.value;
    f[6] = e.min;
    f[7] = e.max;
    this.device.queue.writeBuffer(this.exposureParams, 0, ep);
    const cp = new ArrayBuffer(32);
    const cu = new Uint32Array(cp);
    const cf = new Float32Array(cp);
    cu[0] = this.toneMap === "neutral" ? 0 : this.toneMap === "agx" ? 1 : 2;
    cf[1] = this.dither;
    cu[2] = this.frame++;
    cu[3] = this.format.endsWith("-srgb") ? 0 : 1;
    cf[4] = chain ? Math.min(Math.max(this.bloom.intensity, 0), 1) : 0;
    cf[5] = chain ? 1 / chain.levels : 0;
    this.device.queue.writeBuffer(this.compositeParams, 0, cp);

    const pass = enc.beginComputePass({ label: "exposure", timestampWrites: profiler?.pass("exposure") });
    pass.setPipeline(this.histogramPipeline);
    pass.setBindGroup(0, this.exposureBG);
    pass.dispatchWorkgroups(Math.ceil(this.width / 32), Math.ceil(this.height / 32));
    pass.setPipeline(this.resolvePipeline);
    pass.setBindGroup(0, this.resolveBG);
    pass.dispatchWorkgroups(1);
    pass.end();

    const rp = enc.beginRenderPass({
      label: "composite",
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
      timestampWrites: profiler?.pass("composite"),
    });
    rp.setPipeline(this.compositePipeline);
    rp.setBindGroup(0, compositeBG);
    rp.draw(3);
    rp.end();
  }

  /** The bloom chain: one render pass per level, timed as one "bloom" span. */
  private encodeBloom(enc: GPUCommandEncoder, chain: NonNullable<HdrPipeline["bloomChain"]>, profiler?: GpuProfiler): void {
    const pipes = this.bloomPipes!;
    const span = profiler?.pass("bloom");
    const n = chain.passes.length;
    chain.passes.forEach((p, i) => {
      const down = i < chain.levels;
      // the span opens on the first pass and closes on the last
      const first = i === 0;
      const last = i === n - 1;
      const timestampWrites: GPURenderPassTimestampWrites | undefined =
        span && (first || last)
          ? {
              querySet: span.querySet,
              ...(first ? { beginningOfPassWriteIndex: span.beginningOfPassWriteIndex } : {}),
              ...(last ? { endOfPassWriteIndex: span.endOfPassWriteIndex } : {}),
            }
          : undefined;
      const rp = enc.beginRenderPass({
        label: down ? "bloom-down" : "bloom-up",
        colorAttachments: [{ view: p.target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
        timestampWrites,
      });
      rp.setPipeline(down ? pipes.down : pipes.up);
      rp.setBindGroup(0, p.bind);
      rp.draw(3);
      rp.end();
    });
  }

  /** Queue a non-blocking exposure readback into `enc` (for readouts). */
  sampleExposure(enc: GPUCommandEncoder): boolean {
    return this.readback.record(enc, this.state);
  }

  /** Collect a sample queued by `sampleExposure` (after submit). */
  async collectExposure(): Promise<ExposureReading> {
    const buf = await this.readback.collect();
    if (buf) {
      const f = new Float32Array(buf);
      this.lastReading = { exposure: f[0]!, measured: f[1]!, target: f[2]! };
    }
    return this.lastReading;
  }

  get lastExposure(): ExposureReading {
    return this.lastReading;
  }

  destroy(): void {
    this.destroyBloomChain();
    this.blackTex.destroy();
    this.scene?.destroy();
    this.noise.destroy();
    this.bins.destroy();
    this.state.destroy();
    this.exposureParams.destroy();
    this.compositeParams.destroy();
    this.readback.destroy();
    this.context.unconfigure();
  }
}
