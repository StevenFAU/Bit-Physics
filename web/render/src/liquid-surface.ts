// LiquidSurface (00-foundation.md § 3.4, F4): screen-space rendering of a
// particle liquid — Water in Hand (SPH), Wave Tank (PIC/FLIP) and Materials
// (MPM) draw their water with it.
//
// Per frame, after the sim has drawn the opaque scene (its Environment or own
// backdrop, the table, a container's far side) into the HdrPipeline's scene
// target with a depth target:
//
//   grab       the scene behind the liquid is copied aside (full res)
//   splat      each particle is a camera-facing sphere impostor; the nearest
//              surface's eye depth lands in an r32float target (liquid res)
//   filter     a narrow-range filter (after Truong & Yuksel 2018) smooths the
//              spheres into a surface without merging separate layers or
//              pulling silhouettes into the background: separable x and y
//              passes (`filter.iterations` times), then a 5×5 clean-up
//   thickness  each particle adds its chord length (additive, r16float),
//              scaled so a packed body sums to its real thickness
//   normals    world normals from the filtered depth, taking the smaller of
//              the two one-sided differences per axis (Green, GDC 2010)
//   composite  the scene behind, displaced along the screen-projected normal
//              and absorbed by Beer–Lambert over the thickness; Schlick
//              Fresnel with the reflected EnvironmentProbe; a sharp, normalised
//              Blinn highlight of one key light; an optional foam layer. The
//              composite writes its depth, so whatever the sim draws after it
//              (a glass's near wall) depth-tests against the water.
//
// Particle positions are read from any storage buffer of f32 with a stride
// and offset (SPH's vec4 positions, an MPM particle struct), in model
// coordinates: View3D's model transform places them, as it does for the F3
// renderers. The liquid-resolution targets (`scale` of the scene target,
// 0.5 by default) carry everything up to the normals; the composite runs at
// full resolution with bilinear normals, so silhouettes stay smooth.
//
// Foam (M3 of Water in Hand, Wave Tank's whitewater): set `foam` to any
// filterable texture covering the view (a diffuse-particle splat target); the
// composite blends `look.foamColor` in by its red channel × `look.foam`.
//
// References: van der Laan, Green & Sainz 2009 (screen-space fluid rendering);
// Truong & Yuksel 2018 (the narrow-range filter); Green, GDC 2010 (normals);
// matsuoka-601/WebGPU-Ocean and Splash (MIT) — the WebGPU references, whose
// pass structure (half-resolution depth and thickness, a full-resolution
// composite) this follows; no code is copied from them.

import type { GpuProfiler } from "@bp/gpu";
import { wgsl } from "@bp/gpu";
import "./register.js";
import type { EnvironmentProbe } from "./environment-probe.js";
import type { HdrPipeline } from "./hdr.js";
import { SCENE_FORMAT } from "./hdr.js";
import type { Vec3 } from "./orbit-camera.js";
import type { View3D } from "./view3d.js";
import { DEPTH_FORMAT } from "./view3d.js";
import liquidSrc from "./wgsl/liquid-surface.wgsl?raw";

type Rgb = readonly [number, number, number];

export interface LiquidLook {
  /** Beer–Lambert absorption per world unit of thickness, linear RGB. */
  absorption: Rgb;
  /** Radiance the body scatters back towards the eye (deep-water colour). */
  scatter: Rgb;
  /** Schlick reflectance at normal incidence (water 0.02). */
  f0: number;
  /** Gain on the reflected environment. */
  environment: number;
  /** Lateral shift of the refracted scene per unit thickness (≈ 1 − 1/η). */
  refraction: number;
  /** Thickness beyond which refraction stops growing (world units). */
  maxRefractThickness: number;
  /** World direction towards the key light. */
  lightDir: Vec3;
  /** Radiance of its highlight. */
  lightColor: Rgb;
  /** Blinn exponent: high = a small, sharp highlight. */
  shininess: number;
  foamColor: Rgb;
  /** Foam gain (0 = off). */
  foam: number;
}

/** Clear water: the absorption of pure water per metre (red goes first). */
export const WATER: LiquidLook = {
  absorption: [0.45, 0.065, 0.03],
  scatter: [0.004, 0.012, 0.016],
  f0: 0.02,
  environment: 1,
  refraction: 0.25,
  maxRefractThickness: 0.3,
  lightDir: [0.6, 0.55, 0.3],
  lightColor: [40, 36, 30],
  shininess: 900,
  foamColor: [0.9, 0.93, 0.95],
  foam: 0,
};

export interface LiquidFilter {
  /** Separable x + y passes before the 5×5 clean-up. */
  iterations: number;
  /** Kernel radius in particle radii (world-constant: fewer px when far). */
  radius: number;
  /** Largest kernel radius, px of the liquid target. */
  maxRadiusPx: number;
  /** The narrow band each sample is clamped to, in particle radii. */
  mu: number;
  /** A sample nearer than this (particle radii) is another surface. */
  delta: number;
}

export const DEFAULT_FILTER: LiquidFilter = { iterations: 2, radius: 3, maxRadiusPx: 48, mu: 1, delta: 10 };

export interface LiquidParticles {
  /** Storage buffer read as array<f32>. */
  buffer: GPUBuffer;
  count: number;
  /** f32s per particle (4 for vec4 positions). */
  stride?: number;
  /** Index of x within a particle's f32s. */
  offset?: number;
}

export interface LiquidFrame {
  particles: LiquidParticles;
  /** Particle radius, model units (the sphere each impostor draws). */
  radius: number;
  /**
   * Volume each particle stands for, model units³ (spacing³ for a lattice).
   * Normalises thickness: without it, the sum of chords over-counts packed
   * spheres.
   */
  particleVolume?: number;
  /** The scene pass's depth target (DEPTH_FORMAT, scene size): tested and written. */
  depth: GPUTextureView;
}

// -------------------------------------------------- CPU mirrors (tests) --

/** WebGPU NDC depth of an eye depth under `perspective()` (fs ndc_depth). */
export function eyeDepthToNdc(d: number, near: number, far: number): number {
  return Math.min(1, Math.max(0, (far * (d - near)) / ((far - near) * d)));
}

/** Inverse of eyeDepthToNdc. */
export function ndcToEyeDepth(z: number, near: number, far: number): number {
  return (far * near) / (far - z * (far - near));
}

/**
 * Thickness per chord: spheres of `radius` packed one per `particleVolume`
 * overlap, so their summed chords exceed the body's thickness by the ratio
 * of sphere volume to particle volume.
 */
export function chordScale(particleVolume: number | undefined, radius: number): number {
  if (!particleVolume || radius <= 0) return 1;
  return particleVolume / ((4 / 3) * Math.PI * radius ** 3);
}

/** Schlick's Fresnel approximation. */
export function schlick(f0: number, cosTheta: number): number {
  const c = Math.min(1, Math.max(0, cosTheta));
  return f0 + (1 - f0) * (1 - c) ** 5;
}

/** Beer–Lambert transmittance through `t` world units. */
export function transmittance(absorption: Rgb, t: number): [number, number, number] {
  return [Math.exp(-absorption[0] * t), Math.exp(-absorption[1] * t), Math.exp(-absorption[2] * t)];
}

/** The filter's kernel radius in px at eye depth d (fs_filter). */
export function filterRadiusPx(
  radiusModel: number,
  modelScale: number,
  projYY: number,
  targetHeightPx: number,
  d: number,
  maxPx: number,
): number {
  return Math.min(maxPx, Math.max(1, (radiusModel * modelScale * projYY * 0.5 * targetHeightPx) / d));
}

/** One sample through the narrow range: [value, weight] (fs narrow). */
export function narrowSample(ds: number, dc: number, mu: number, delta: number): [number, number] {
  if (ds <= 0) return [dc + mu, 1];
  if (ds < dc - delta) return [0, 0];
  return [Math.min(dc + mu, Math.max(dc - mu, ds)), 1];
}

/** One separable pass over a row of eye depths (0 = no liquid), fs_filter's 1D branch. */
export function narrowRangeRow(row: readonly number[], radiusPx: number, mu: number, delta: number): number[] {
  const out = new Array<number>(row.length).fill(0);
  const stride = Math.max(1, Math.ceil(radiusPx / 24));
  const taps = Math.ceil(radiusPx / stride);
  const sigma = radiusPx / 2.5;
  const inv2s2 = 1 / (2 * sigma * sigma);
  for (let i = 0; i < row.length; i += 1) {
    const dc = row[i]!;
    if (dc <= 0) continue;
    let sum = 0;
    let wsum = 0;
    for (let k = -taps; k <= taps; k += 1) {
      const off = Math.trunc(k * stride);
      const q = Math.min(row.length - 1, Math.max(0, i + off));
      const [v, w0] = narrowSample(row[q]!, dc, mu, delta);
      const w = w0 * Math.exp(-off * off * inv2s2);
      sum += v * w;
      wsum += w;
    }
    out[i] = sum / Math.max(wsum, 1e-6);
  }
  return out;
}

/** The 144-byte LiquidParams uniform. */
export function packLiquid(
  look: LiquidLook,
  filter: LiquidFilter,
  frame: { radius: number; particleVolume?: number; count: number; stride: number; offset: number; probe: boolean },
  size: { w: number; h: number },
): ArrayBuffer {
  const buf = new ArrayBuffer(144);
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f.set([frame.radius, chordScale(frame.particleVolume, frame.radius), look.refraction, look.maxRefractThickness], 0);
  u.set([frame.count, frame.stride, frame.offset, frame.probe ? 1 : 0], 4);
  f.set([size.w, size.h, 1 / Math.max(size.w, 1), 1 / Math.max(size.h, 1)], 8);
  f.set([filter.maxRadiusPx, filter.radius * frame.radius, filter.mu * frame.radius, filter.delta * frame.radius], 12);
  f.set([...look.absorption, look.environment], 16);
  f.set([...look.scatter, look.f0], 20);
  const l = Math.hypot(...look.lightDir) || 1;
  f.set([look.lightDir[0] / l, look.lightDir[1] / l, look.lightDir[2] / l, look.shininess], 24);
  f.set([...look.lightColor, 0], 28);
  f.set([...look.foamColor, look.foam], 32);
  return buf;
}

// ------------------------------------------------------------- GPU --

const EYE_FORMAT: GPUTextureFormat = "r32float";
const THICK_FORMAT: GPUTextureFormat = "r16float";
const NORMAL_FORMAT: GPUTextureFormat = "rgba16float";

interface Pipes {
  grab: GPURenderPipeline;
  depth: GPURenderPipeline;
  thickness: GPURenderPipeline;
  filter: GPURenderPipeline;
  normals: GPURenderPipeline;
  composite: GPURenderPipeline;
}

interface Targets {
  sceneW: number;
  sceneH: number;
  w: number;
  h: number;
  background: GPUTexture;
  eyeA: GPUTexture;
  eyeB: GPUTexture;
  splatDepth: GPUTexture;
  thick: GPUTexture;
  normal: GPUTexture;
  views: Record<"background" | "eyeA" | "eyeB" | "splatDepth" | "thick" | "normal", GPUTextureView>;
}

export class LiquidSurface {
  look: LiquidLook = { ...WATER };
  filter: LiquidFilter = { ...DEFAULT_FILTER };
  /** Liquid-target resolution as a fraction of the scene target (0.25–1). */
  scale: number;
  /** Optional foam texture sampled over the view (red channel); null = none. */
  foam: GPUTextureView | null = null;

  private readonly params: GPUBuffer;
  private readonly dirs: GPUBuffer[];
  private readonly sampler: GPUSampler;
  private readonly blackCube: GPUTexture;
  private readonly blackFoam: GPUTexture;
  private readonly blackCubeView: GPUTextureView;
  private readonly blackFoamView: GPUTextureView;
  private probe: EnvironmentProbe | null = null;
  private targets: Targets | null = null;
  private groups: Record<string, GPUBindGroup> | null = null;
  private groupKey = "";
  private particleBuf: GPUBuffer | null = null;
  private readonly ids = new WeakMap<object, number>();
  private nextId = 1;

  private constructor(
    private readonly device: GPUDevice,
    private readonly view: View3D,
    private readonly pipes: Pipes,
    scale: number,
  ) {
    this.scale = scale;
    this.params = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "liquid-params" });
    // filter directions: x, y, and (0, 0) for the 2D clean-up
    this.dirs = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ].map((d, i) => {
      const b = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: `liquid-dir-${i}` });
      device.queue.writeBuffer(b, 0, new Float32Array(d));
      return b;
    });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.blackCube = device.createTexture({
      size: [1, 1, 6],
      format: SCENE_FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING,
      label: "liquid-no-probe",
    });
    this.blackFoam = device.createTexture({ size: [1, 1], format: THICK_FORMAT, usage: GPUTextureUsage.TEXTURE_BINDING, label: "liquid-no-foam" });
    this.blackCubeView = this.blackCube.createView({ dimension: "cube" });
    this.blackFoamView = this.blackFoam.createView();
  }

  /**
   * `depthFormat` is the scene's depth target (the composite tests and writes
   * it); `scale` the liquid targets' fraction of the scene target.
   */
  static async create(
    device: GPUDevice,
    view: View3D,
    o: { scale?: number; format?: GPUTextureFormat; depthFormat?: GPUTextureFormat } = {},
  ): Promise<LiquidSurface> {
    const module = device.createShaderModule({ code: wgsl(liquidSrc), label: "liquid-surface" });
    const format = o.format ?? SCENE_FORMAT;
    const full = (fs: string, target: GPUTextureFormat, label: string, extra: Partial<GPURenderPipelineDescriptor> = {}): Promise<GPURenderPipeline> =>
      device.createRenderPipelineAsync({
        label,
        layout: "auto",
        vertex: { module, entryPoint: "vs_full" },
        fragment: { module, entryPoint: fs, targets: [{ format: target }] },
        ...extra,
      });
    const splat = (fs: string, target: GPUColorTargetState, label: string, depth?: GPUDepthStencilState): Promise<GPURenderPipeline> =>
      device.createRenderPipelineAsync({
        label,
        layout: "auto",
        vertex: { module, entryPoint: "vs_splat" },
        fragment: { module, entryPoint: fs, targets: [target] },
        primitive: { topology: "triangle-list" },
        depthStencil: depth,
      });
    const add: GPUBlendComponent = { operation: "add", srcFactor: "one", dstFactor: "one" };
    const [grab, depth, thickness, filter, normals, composite] = await Promise.all([
      full("fs_grab", format, "liquid-grab"),
      splat("fs_depth", { format: EYE_FORMAT }, "liquid-depth", { format: DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: "less" }),
      splat("fs_thickness", { format: THICK_FORMAT, blend: { color: add, alpha: add } }, "liquid-thickness"),
      full("fs_filter", EYE_FORMAT, "liquid-filter"),
      full("fs_normals", NORMAL_FORMAT, "liquid-normals"),
      full("fs_composite", format, "liquid-composite", {
        depthStencil: { format: o.depthFormat ?? DEPTH_FORMAT, depthWriteEnabled: true, depthCompare: "less-equal" },
      }),
    ]);
    return new LiquidSurface(device, view, { grab, depth, thickness, filter, normals, composite }, o.scale ?? 0.5);
  }

  /** Reflect this probe (null: reflect the in-scatter colour). */
  setProbe(probe: EnvironmentProbe | null): void {
    this.probe = probe;
  }

  /** Liquid-target size, px (valid after the first encode). */
  get size(): { w: number; h: number } {
    return { w: this.targets?.w ?? 0, h: this.targets?.h ?? 0 };
  }

  /** The filtered eye depth (r32float, liquid res; 0 = no liquid) — e.g. for a foam pass. */
  get surfaceDepth(): GPUTextureView | null {
    return this.targets?.views.eyeB ?? null;
  }

  private id(o: object): number {
    let v = this.ids.get(o);
    if (v === undefined) {
      v = this.nextId++;
      this.ids.set(o, v);
    }
    return v;
  }

  private ensureTargets(sceneW: number, sceneH: number): Targets {
    const s = Math.min(1, Math.max(0.25, this.scale));
    const w = Math.max(1, Math.round(sceneW * s));
    const h = Math.max(1, Math.round(sceneH * s));
    const t = this.targets;
    if (t && t.sceneW === sceneW && t.sceneH === sceneH && t.w === w && t.h === h) return t;
    if (t) for (const tex of [t.background, t.eyeA, t.eyeB, t.splatDepth, t.thick, t.normal]) tex.destroy();
    const RT = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    const mk = (size: [number, number], format: GPUTextureFormat, label: string, usage = RT): GPUTexture =>
      this.device.createTexture({ size, format, usage, label });
    const background = mk([sceneW, sceneH], SCENE_FORMAT, "liquid-background");
    const eyeA = mk([w, h], EYE_FORMAT, "liquid-eye-a");
    const eyeB = mk([w, h], EYE_FORMAT, "liquid-eye-b");
    const splatDepth = mk([w, h], DEPTH_FORMAT, "liquid-splat-depth", GPUTextureUsage.RENDER_ATTACHMENT);
    const thick = mk([w, h], THICK_FORMAT, "liquid-thickness");
    const normal = mk([w, h], NORMAL_FORMAT, "liquid-normals");
    this.targets = {
      sceneW,
      sceneH,
      w,
      h,
      background,
      eyeA,
      eyeB,
      splatDepth,
      thick,
      normal,
      views: {
        background: background.createView(),
        eyeA: eyeA.createView(),
        eyeB: eyeB.createView(),
        splatDepth: splatDepth.createView(),
        thick: thick.createView(),
        normal: normal.createView(),
      },
    };
    return this.targets;
  }

  private bindGroups(t: Targets, hdr: HdrPipeline, particles: GPUBuffer): Record<string, GPUBindGroup> {
    const foam = this.foam ?? this.blackFoamView;
    const probeView = this.probe?.cubeView ?? null;
    const key = [this.id(t), this.id(hdr.sceneView), this.id(particles), this.foam ? this.id(this.foam) : 0, probeView ? this.id(probeView) : 0].join(":");
    if (this.groups && this.groupKey === key) return this.groups;
    const d = this.device;
    const P = this.pipes;
    const V = { buffer: this.view.buffer };
    const L = { buffer: this.params };
    const bg = (pipe: GPURenderPipeline, label: string, entries: Record<number, GPUBindingResource>): GPUBindGroup =>
      d.createBindGroup({
        label,
        layout: pipe.getBindGroupLayout(0),
        entries: Object.entries(entries).map(([b, resource]) => ({ binding: Number(b), resource })),
      });
    const cube = probeView ?? this.blackCubeView;
    this.groups = {
      grab: bg(P.grab, "liquid-grab", { 2: hdr.sceneView }),
      depth: bg(P.depth, "liquid-depth", { 0: V, 1: L, 3: { buffer: particles } }),
      thickness: bg(P.thickness, "liquid-thickness", { 0: V, 1: L, 3: { buffer: particles } }),
      filterAX: bg(P.filter, "liquid-filter-ax", { 0: V, 1: L, 4: t.views.eyeA, 5: { buffer: this.dirs[0]! } }),
      filterBY: bg(P.filter, "liquid-filter-by", { 0: V, 1: L, 4: t.views.eyeB, 5: { buffer: this.dirs[1]! } }),
      filterA2: bg(P.filter, "liquid-filter-a2", { 0: V, 1: L, 4: t.views.eyeA, 5: { buffer: this.dirs[2]! } }),
      normals: bg(P.normals, "liquid-normals", { 0: V, 1: L, 4: t.views.eyeB }),
      composite: bg(P.composite, "liquid-composite", {
        0: V,
        1: L,
        4: t.views.eyeB,
        7: t.views.normal,
        8: t.views.thick,
        9: t.views.background,
        10: cube,
        11: foam,
        12: this.sampler,
      }),
    };
    this.groupKey = key;
    return this.groups;
  }

  /**
   * Draw the liquid into `hdr`'s scene target (after the opaque scene, which
   * must already hold `frame.depth`). One encoder: six render passes plus two
   * per filter iteration.
   */
  encode(enc: GPUCommandEncoder, hdr: HdrPipeline, frame: LiquidFrame, profiler?: GpuProfiler | null): void {
    if (hdr.width < 1 || hdr.height < 1) return;
    const t = this.ensureTargets(hdr.width, hdr.height);
    const p = frame.particles;
    const stride = p.stride ?? 4;
    const offset = p.offset ?? 0;
    this.particleBuf = p.buffer;
    const g = this.bindGroups(t, hdr, p.buffer);
    this.device.queue.writeBuffer(
      this.params,
      0,
      packLiquid(this.look, this.filter, { radius: frame.radius, particleVolume: frame.particleVolume, count: p.count, stride, offset, probe: this.probe !== null }, { w: t.w, h: t.h }),
    );
    const ts = (name: string): GPURenderPassTimestampWrites | undefined =>
      (profiler?.pass(name) as GPURenderPassTimestampWrites | undefined) ?? undefined;
    const P = this.pipes;
    const fullPass = (target: GPUTextureView, pipe: GPURenderPipeline, group: GPUBindGroup, name: string): void => {
      const pass = enc.beginRenderPass({
        label: name,
        colorAttachments: [{ view: target, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
        timestampWrites: ts(name),
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, group);
      pass.draw(3);
      pass.end();
    };

    // the scene behind
    fullPass(t.views.background, P.grab, g.grab!, "liquid grab");
    // nearest sphere surface
    {
      const pass = enc.beginRenderPass({
        label: "liquid depth",
        colorAttachments: [{ view: t.views.eyeA, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
        depthStencilAttachment: { view: t.views.splatDepth, depthLoadOp: "clear", depthStoreOp: "discard", depthClearValue: 1 },
        timestampWrites: ts("liquid depth"),
      });
      pass.setPipeline(P.depth);
      pass.setBindGroup(0, g.depth!);
      if (p.count > 0) pass.draw(6, p.count);
      pass.end();
    }
    // narrow-range filter: A → B → A per iteration, then the 2D clean-up A → B
    const iters = Math.max(0, Math.min(4, Math.round(this.filter.iterations)));
    for (let i = 0; i < iters; i += 1) {
      fullPass(t.views.eyeB, P.filter, g.filterAX!, `liquid filter x${i + 1}`);
      fullPass(t.views.eyeA, P.filter, g.filterBY!, `liquid filter y${i + 1}`);
    }
    fullPass(t.views.eyeB, P.filter, g.filterA2!, "liquid filter 2d");
    // thickness
    {
      const pass = enc.beginRenderPass({
        label: "liquid thickness",
        colorAttachments: [{ view: t.views.thick, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
        timestampWrites: ts("liquid thickness"),
      });
      pass.setPipeline(P.thickness);
      pass.setBindGroup(0, g.thickness!);
      if (p.count > 0) pass.draw(6, p.count);
      pass.end();
    }
    fullPass(t.views.normal, P.normals, g.normals!, "liquid normals");
    // shade into the scene target, depth-tested against (and written into) the scene depth
    {
      const pass = enc.beginRenderPass({
        label: "liquid composite",
        colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
        depthStencilAttachment: { view: frame.depth, depthLoadOp: "load", depthStoreOp: "store" },
        timestampWrites: ts("liquid composite"),
      });
      pass.setPipeline(P.composite);
      pass.setBindGroup(0, g.composite!);
      pass.draw(3);
      pass.end();
    }
  }

  /** The particle buffer last drawn (for debugging). */
  get particles(): GPUBuffer | null {
    return this.particleBuf;
  }

  destroy(): void {
    const t = this.targets;
    if (t) for (const tex of [t.background, t.eyeA, t.eyeB, t.splatDepth, t.thick, t.normal]) tex.destroy();
    this.targets = null;
    this.params.destroy();
    for (const b of this.dirs) b.destroy();
    this.blackCube.destroy();
    this.blackFoam.destroy();
  }
}
