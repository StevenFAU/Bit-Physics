// Points and the long-exposure Accumulator (00-foundation.md § 3.4, F3).
//
// Points draws one additive splat per particle from a storage buffer of
// vec4<f32> (xyz position, w = a scalar attribute in [0, 1] for colour). The
// splat's footprint integrates to the particle's energy, so the picture's
// total light is the same at any zoom, resolution or render scale; size
// attenuation only changes how far that light spreads. With a buffer of
// previous positions each splat stretches into a capsule along its screen
// motion (velocity stretch). Positions may be stored relative to a floating
// origin (`origin`), added in the vertex shader: a sim that keeps small
// offsets from a reference (an ensemble around one trajectory) keeps their
// precision.
//
// Accumulator collects light off the scene target and adds it in: per-frame
// (crisp, many overlapping splats kept apart from the scene's own values) or
// as a long exposure, the exponential moving average of 05-strange-
// attractors.md ("each particle splats into a float accumulation buffer each
// frame; the long-exposure image is an exponential moving average").

import { wgsl } from "@bp/gpu";
import "./register.js";
import { colormapBytes } from "./colormaps.js";
import type { Rgb } from "./colormaps.js";
import { SCENE_FORMAT } from "./hdr.js";
import type { Vec3 } from "./orbit-camera.js";
import type { View3D } from "./view3d.js";
import accumulateSrc from "./wgsl/accumulate.wgsl?raw";
import pointsSrc from "./wgsl/points.wgsl?raw";

export interface PointSet {
  /** vec4<f32> per point: xyz, w = colour attribute in [0, 1]. */
  positions: GPUBuffer;
  /** Same layout, one frame earlier (velocity stretch). */
  previous?: GPUBuffer;
  count: number;
}

export interface PointStyle {
  /** Added to every position (model units). */
  origin?: Vec3;
  /** Added to every previous position. */
  prevOrigin?: Vec3;
  /** 0 = round splats; 1 = stretched over the full frame's motion. */
  stretch?: number;
  /** Light per point, in px·(linear radiance): the splat integrates to it. */
  energy: number;
  /** Uniform colour (linear RGB), used when no `lut`. */
  color?: readonly [number, number, number];
  /** Colour by the attribute in position.w through a 256×1 LUT. */
  lut?: GPUTextureView;
  /** Multiplier on LUT colours. */
  lutGain?: number;
  /** World radius in model units (size attenuation). */
  radius: number;
  /** Footprint radius limits, px. */
  minPx: number;
  maxPx: number;
}

/**
 * The integral of the splat kernel (1 − ρ²)² over a capsule of radius r px
 * and straight length len px — what the vertex shader divides energy by.
 */
export function splatFootprint(r: number, len: number): number {
  return (Math.PI * r * r) / 3 + len * r * (16 / 15);
}

/** A 256×1 rgba8unorm-srgb LUT from sRGB stops, OKLab-interpolated. */
export function paletteTexture(device: GPUDevice, stops: readonly Rgb[], label = "palette"): GPUTexture {
  const tex = device.createTexture({
    size: [256, 1],
    format: "rgba8unorm-srgb",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label,
  });
  device.queue.writeTexture({ texture: tex }, colormapBytes({ stops }), { bytesPerRow: 256 * 4 }, [256, 1]);
  return tex;
}

const ADDITIVE: GPUBlendState = {
  color: { operation: "add", srcFactor: "one", dstFactor: "one" },
  alpha: { operation: "add", srcFactor: "one", dstFactor: "one" },
};

export interface PointsOptions {
  /** Colour target format (default the HDR scene format). */
  format?: GPUTextureFormat;
  /** Test against (never write) this depth format; omit for no depth. */
  depthFormat?: GPUTextureFormat;
  label?: string;
}

export class Points {
  readonly pipeline: GPURenderPipeline;
  readonly layout: GPUBindGroupLayout;
  readonly sampler: GPUSampler;
  private readonly dummyLut: GPUTextureView;
  private dummyPrev: GPUBuffer | null = null;

  private constructor(
    readonly device: GPUDevice,
    readonly view: View3D,
    pipeline: GPURenderPipeline,
    layout: GPUBindGroupLayout,
  ) {
    this.pipeline = pipeline;
    this.layout = layout;
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge" });
    this.dummyLut = paletteTexture(device, [[1, 1, 1], [1, 1, 1]], "points-white").createView();
  }

  static async create(device: GPUDevice, view: View3D, o: PointsOptions = {}): Promise<Points> {
    const layout = device.createBindGroupLayout({
      label: `${o.label ?? "points"}-bgl`,
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: GPUShaderStage.VERTEX, texture: { sampleType: "float" } },
        { binding: 5, visibility: GPUShaderStage.VERTEX, sampler: { type: "filtering" } },
      ],
    });
    const module = device.createShaderModule({ code: wgsl(pointsSrc), label: o.label ?? "points" });
    const pipeline = await device.createRenderPipelineAsync({
      label: o.label ?? "points",
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: o.format ?? SCENE_FORMAT, blend: ADDITIVE }] },
      primitive: { topology: "triangle-list" },
      depthStencil: o.depthFormat ? { format: o.depthFormat, depthWriteEnabled: false, depthCompare: "less-equal" } : undefined,
    });
    return new Points(device, view, pipeline, layout);
  }

  /** A draw slot: its own parameters and bind group (one per point set per frame). */
  createDraw(label = "points-draw"): PointDraw {
    return new PointDraw(this, label);
  }

  /** @internal */
  fallbackPrev(): GPUBuffer {
    if (!this.dummyPrev) {
      this.dummyPrev = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE, label: "points-no-prev" });
    }
    return this.dummyPrev;
  }

  /** @internal */
  fallbackLut(): GPUTextureView {
    return this.dummyLut;
  }
}

export class PointDraw {
  private readonly params: GPUBuffer;
  private bind: GPUBindGroup | null = null;
  private key: readonly unknown[] = [];
  private count = 0;
  private readonly data = new Float32Array(16);

  constructor(
    private readonly points: Points,
    private readonly label: string,
  ) {
    this.params = points.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label });
  }

  /** Point at a set and style for the next draw (writes the parameters). */
  set(set: PointSet, s: PointStyle): void {
    const prev = set.previous ?? this.points.fallbackPrev();
    const lut = s.lut ?? this.points.fallbackLut();
    const key = [set.positions, prev, lut];
    if (!this.bind || key.some((k, i) => k !== this.key[i])) {
      this.key = key;
      this.bind = this.points.device.createBindGroup({
        label: this.label,
        layout: this.points.layout,
        entries: [
          { binding: 0, resource: { buffer: this.points.view.buffer } },
          { binding: 1, resource: { buffer: this.params } },
          { binding: 2, resource: { buffer: set.positions } },
          { binding: 3, resource: { buffer: prev } },
          { binding: 4, resource: lut },
          { binding: 5, resource: this.points.sampler },
        ],
      });
    }
    this.count = set.count;
    const o = s.origin ?? [0, 0, 0];
    const po = s.prevOrigin ?? o;
    const c = s.color ?? [1, 1, 1];
    const d = this.data;
    d.set([o[0], o[1], o[2], s.energy], 0);
    d.set([po[0], po[1], po[2], set.previous ? (s.stretch ?? 1) : 0], 4);
    d.set([c[0], c[1], c[2], s.lut ? 1 : 0], 8);
    d.set([s.radius, s.minPx, s.maxPx, s.lutGain ?? 1], 12);
    this.points.device.queue.writeBuffer(this.params, 0, d);
  }

  draw(pass: GPURenderPassEncoder): void {
    if (!this.bind || this.count <= 0) return;
    pass.setPipeline(this.points.pipeline);
    pass.setBindGroup(0, this.bind);
    pass.draw(6, this.count);
  }

  destroy(): void {
    this.params.destroy();
  }
}

/**
 * Light accumulated off the scene target, then added into it.
 *
 * Splats go into a frame target cleared every frame (`begin` … `end`), so
 * thousands of small additive increments land on small values and keep
 * their precision in rgba16float. In "ema" mode `end` folds the frame into
 * a long exposure with one fused write per pixel, exposure' = exposure ·
 * decay + frame · (1 − decay) (steady state: the frame average over τ =
 * −Δt / ln decay); in "frame" mode the frame itself is the result. Either
 * way `composite` adds it into a scene pass.
 */
export class Accumulator {
  private frameTex: GPUTexture | null = null;
  private frameView: GPUTextureView | null = null;
  private expo: GPUTexture[] = [];
  private expoViews: GPUTextureView[] = [];
  private cur = 0;
  private readonly params: GPUBuffer;
  private emaBG: GPUBindGroup[] = [];
  private compositeBG: GPUBindGroup[] = [];
  private cleared = true;
  width = 0;
  height = 0;

  private constructor(
    private readonly device: GPUDevice,
    private readonly layout: GPUBindGroupLayout,
    private readonly emaPipe: GPURenderPipeline,
    private readonly compositePipe: GPURenderPipeline,
    readonly mode: "ema" | "frame",
  ) {
    // [0, 16) the EMA's uniform, [256, 272) the composite's (offset-aligned)
    this.params = device.createBuffer({ size: 256 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "accumulate" });
  }

  /**
   * `depthFormat`: the depth attachment of the scene pass `composite` runs in
   * (the composite neither tests nor writes it).
   */
  static async create(
    device: GPUDevice,
    o: { mode?: "ema" | "frame"; sceneFormat?: GPUTextureFormat; depthFormat?: GPUTextureFormat } = {},
  ): Promise<Accumulator> {
    const layout = device.createBindGroupLayout({
      label: "accumulate-bgl",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
      ],
    });
    const module = device.createShaderModule({ code: wgsl(accumulateSrc), label: "accumulate" });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const [ema, composite] = await Promise.all([
      device.createRenderPipelineAsync({
        label: "accumulate-ema",
        layout: pl,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs_ema", targets: [{ format: SCENE_FORMAT }] },
      }),
      device.createRenderPipelineAsync({
        label: "accumulate-composite",
        layout: pl,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs_composite", targets: [{ format: o.sceneFormat ?? SCENE_FORMAT, blend: ADDITIVE }] },
        depthStencil: o.depthFormat ? { format: o.depthFormat, depthWriteEnabled: false, depthCompare: "always" } : undefined,
      }),
    ]);
    return new Accumulator(device, layout, ema, composite, o.mode ?? "ema");
  }

  /** Match the scene target's size (reallocates and clears on change). */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height && this.frameTex) return;
    this.frameTex?.destroy();
    for (const t of this.expo) t.destroy();
    this.width = width;
    this.height = height;
    const mk = (label: string): GPUTexture =>
      this.device.createTexture({
        size: [width, height],
        format: SCENE_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label,
      });
    this.frameTex = mk("accumulate-frame");
    this.frameView = this.frameTex.createView();
    this.expo = this.mode === "ema" ? [mk("accumulate-0"), mk("accumulate-1")] : [];
    this.expoViews = this.expo.map((t) => t.createView());
    const bg = (offset: number, exposure: GPUTextureView): GPUBindGroup =>
      this.device.createBindGroup({
        layout: this.layout,
        entries: [
          { binding: 0, resource: { buffer: this.params, offset, size: 16 } },
          { binding: 1, resource: this.frameView! },
          { binding: 2, resource: exposure },
        ],
      });
    if (this.mode === "ema") {
      // emaBG[i] reads exposure i (and writes the other); compositeBG[i] reads exposure i
      this.emaBG = [bg(0, this.expoViews[0]!), bg(0, this.expoViews[1]!)];
      this.compositeBG = [bg(256, this.expoViews[0]!), bg(256, this.expoViews[1]!)];
    } else {
      this.emaBG = [];
      this.compositeBG = [bg(256, this.frameView)];
    }
    this.cleared = true;
  }

  /** Forget the exposure so far (the next frame starts it afresh). */
  clear(): void {
    this.cleared = true;
  }

  /**
   * This frame's new light: a pass on the cleared frame target. With `depth`
   * (the scene's depth, same size) splats are depth-tested against it,
   * read-only. Draw Points into it, then call `end`.
   */
  begin(enc: GPUCommandEncoder, o: { depth?: GPUTextureView; timestampWrites?: GPURenderPassTimestampWrites } = {}): GPURenderPassEncoder {
    return enc.beginRenderPass({
      label: "accumulate-frame",
      colorAttachments: [{ view: this.frameView!, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      depthStencilAttachment: o.depth ? { view: o.depth, depthReadOnly: true } : undefined,
      timestampWrites: o.timestampWrites,
    });
  }

  /** Close the frame pass; in "ema" mode fold it into the exposure (decay per frame). */
  end(enc: GPUCommandEncoder, pass: GPURenderPassEncoder, decay = 0): void {
    pass.end();
    if (this.mode !== "ema") return;
    const d = this.cleared ? 0 : Math.min(Math.max(decay, 0), 0.9999);
    this.cleared = false;
    this.device.queue.writeBuffer(this.params, 0, new Float32Array([d, 1 - d, 0, 0]));
    const prev = this.cur;
    const next = 1 - prev;
    const rp = enc.beginRenderPass({
      label: "accumulate-ema",
      colorAttachments: [{ view: this.expoViews[next]!, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
    });
    rp.setPipeline(this.emaPipe);
    rp.setBindGroup(0, this.emaBG[prev]!);
    rp.draw(3);
    rp.end();
    this.cur = next;
  }

  /** Add the result into a scene pass (same size as this image), times `gain`. */
  composite(pass: GPURenderPassEncoder, gain = 1): void {
    if (!this.frameTex) return;
    this.device.queue.writeBuffer(this.params, 256, new Float32Array([0, 0, gain, 0]));
    pass.setPipeline(this.compositePipe);
    pass.setBindGroup(0, this.compositeBG[this.mode === "ema" ? this.cur : 0]!);
    pass.draw(3);
  }

  destroy(): void {
    this.frameTex?.destroy();
    for (const t of this.expo) t.destroy();
    this.frameTex = null;
    this.expo = [];
    this.params.destroy();
  }
}
