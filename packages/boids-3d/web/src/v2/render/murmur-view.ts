// Murmuration's renderer (07-boids-3d.md, "The look"), on the shared 3D layer
// (F3): View3D carries the camera and places the flock's model coordinates
// in the world; the HDR pipeline meters, tone maps (AgX) and dithers.
//
//   dusk       dusk.wgsl: the sky, cirrus, tree lines, land and a lake strip
//              (a full-screen pass into the HDR scene target)
//   flock      tau.wgsl: every bird adds its projected coverage to a
//              fixed-point optical-depth buffer (compute, u32 atomics)
//   composite  composite.wgsl: the scene × exp(−τ)
//   reeds      reeds.wgsl: the reed bed in silhouette, over everything
//
// No bloom; no depth buffer (the reeds are always nearer than the birds, and
// a bird behind a distant tree darkens a tree that is already black). F3's
// Environment draws a daylight sky and Points adds light into rgba16float,
// where thousands of faint splats stop adding; optical depth is u32 fixed
// point, so it is exact and order-free — the reason this is sim-local
// (a candidate to fold into @bp/render when a second sim needs it).
//
// World units are model units (about 2 m: v1's birds cruise at 4–9 units/s,
// starlings at 10–18 m/s). The roost's centre sits ROOST_Y above the ground.

import { wgsl } from "@bp/gpu";
import type { GpuProfiler } from "@bp/gpu";
import type { HdrPipeline, Vec3 } from "@bp/render";
import { SCENE_FORMAT, View3D, similarity } from "@bp/render";
import compositeSrc from "./composite.wgsl?raw";
import duskSrc from "./dusk.wgsl?raw";
import reedsSrc from "./reeds.wgsl?raw";
import tauSrc from "./tau.wgsl?raw";
import type { GroundCamera } from "./ground-camera.js";
import { NearBirds } from "./near-birds.js";
import type { FalconDraw } from "./near-birds.js";

/** World height of the roost's centre (the model's origin). */
export const ROOST_Y = 40;
/** Where you stand, on the ground, south of the roost. */
export const HOME_EYE: Vec3 = [0, 1.0, 95];
/** Fixed-point scale of the optical-depth buffer. */
export const TAU_SCALE = 2 ** 20;

export interface DuskLook {
  /** Sun elevation, degrees (below the horizon: negative). */
  sunElevation: number;
  /** Sun azimuth from the view towards the roost, degrees (+ = to the right). */
  sunAzimuth: number;
  cirrus: number;
}

export const DEFAULT_DUSK: DuskLook = { sunElevation: -3.5, sunAzimuth: 14, cirrus: 0.5 };

export interface BirdLook {
  /** Drawn size against a starling's (wingspan 0.4 m = 0.2 units). */
  scale: number;
  /** Pixel-filter σ, px: the smallest footprint. */
  filterPx: number;
  /** Largest footprint σ, px (nearer birds are M1's meshes). */
  maxSigmaPx: number;
  /** Planform area against the Gaussian's 2π√det: a starling's slender wings. */
  planform: number;
  /** 0 = shipped (normalised over the pixels written), 1 = analytic normalisation (the flicker control). */
  mode: 0 | 1;
}

export const DEFAULT_BIRDS: BirdLook = { scale: 1.6, filterPx: 0.75, maxSigmaPx: 10, planform: 0.9, mode: 0 };

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mix3 = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [mix(a[0]!, b[0]!, t), mix(a[1]!, b[1]!, t), mix(a[2]!, b[2]!, t)];

/** The sky's palette for a sun `depth` (0 just set … 1 deep dusk). */
export function duskPalette(look: DuskLook): { sun: Vec3; zenith: Vec3; upper: Vec3; horSun: Vec3; horAnti: Vec3; glow: Vec3; glowStrength: number; land: Vec3 } {
  const e = (look.sunElevation * Math.PI) / 180;
  const az = (look.sunAzimuth * Math.PI) / 180;
  const sun: Vec3 = [Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e)];
  const s = Math.min(Math.max((-look.sunElevation - 1) / 9, 0), 1);
  return {
    sun,
    zenith: mix3([0.03, 0.042, 0.135], [0.008, 0.01, 0.034], s),
    upper: mix3([0.2, 0.11, 0.29], [0.04, 0.026, 0.08], s),
    horSun: mix3([2.0, 0.72, 0.19], [0.62, 0.15, 0.045], s),
    horAnti: mix3([0.3, 0.18, 0.32], [0.055, 0.035, 0.075], s),
    glow: mix3([2.6, 0.88, 0.2], [0.9, 0.2, 0.05], s),
    glowStrength: mix(1, 0.6, s),
    land: mix3([0.007, 0.0062, 0.008], [0.003, 0.0028, 0.0038], s),
  };
}

export class MurmurView {
  readonly view3d: View3D;
  dusk: DuskLook = { ...DEFAULT_DUSK };
  birds: BirdLook = { ...DEFAULT_BIRDS };
  /** Optical-depth gain at composite time (1 = as splatted). */
  inkGain = 1;
  reedCount = 3200;
  wind = 1;
  private readonly duskParams: GPUBuffer;
  private readonly splatParams: GPUBuffer;
  private readonly compParams: GPUBuffer;
  private readonly reedParams: GPUBuffer;
  private readonly duskBind: GPUBindGroup;
  private readonly reedBind: GPUBindGroup;
  private tau: GPUBuffer | null = null;
  private tauW = 0;
  private tauH = 0;
  private splatBinds = new Map<GPUBuffer, GPUBindGroup>();
  private compBind: GPUBindGroup | null = null;
  readonly near: NearBirds;

  private constructor(
    private readonly device: GPUDevice,
    view3d: View3D,
    near: NearBirds,
    private readonly duskPipe: GPURenderPipeline,
    private readonly splatPipe: GPUComputePipeline,
    private readonly compPipe: GPURenderPipeline,
    private readonly reedPipe: GPURenderPipeline,
  ) {
    this.view3d = view3d;
    this.near = near;
    view3d.setModel(similarity(1, [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, ROOST_Y, 0]), 1);
    const u = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    this.duskParams = device.createBuffer({ size: 128, usage: u, label: "murmur-dusk" });
    this.splatParams = device.createBuffer({ size: 48, usage: u, label: "murmur-splat" });
    this.compParams = device.createBuffer({ size: 32, usage: u, label: "murmur-composite" });
    this.reedParams = device.createBuffer({ size: 64, usage: u, label: "murmur-reeds" });
    this.duskBind = device.createBindGroup({
      label: "murmur-dusk",
      layout: duskPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view3d.buffer } },
        { binding: 1, resource: { buffer: this.duskParams } },
      ],
    });
    this.reedBind = device.createBindGroup({
      label: "murmur-reeds",
      layout: reedPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: view3d.buffer } },
        { binding: 1, resource: { buffer: this.reedParams } },
      ],
    });
  }

  static async create(device: GPUDevice, capacity: number): Promise<MurmurView> {
    const view3d = new View3D(device);
    const duskModule = device.createShaderModule({ code: wgsl(duskSrc), label: "murmur-dusk" });
    const tauModule = device.createShaderModule({ code: wgsl(tauSrc), label: "murmur-tau" });
    const compModule = device.createShaderModule({ code: wgsl(compositeSrc), label: "murmur-composite" });
    const reedModule = device.createShaderModule({ code: wgsl(reedsSrc), label: "murmur-reeds" });
    const [duskPipe, splatPipe, compPipe, reedPipe] = await Promise.all([
      device.createRenderPipelineAsync({
        label: "murmur-dusk",
        layout: "auto",
        vertex: { module: duskModule, entryPoint: "vs" },
        fragment: { module: duskModule, entryPoint: "fs", targets: [{ format: SCENE_FORMAT }] },
      }),
      device.createComputePipelineAsync({ label: "murmur-splat", layout: "auto", compute: { module: tauModule, entryPoint: "splat" } }),
      device.createRenderPipelineAsync({
        label: "murmur-composite",
        layout: "auto",
        vertex: { module: compModule, entryPoint: "vs" },
        fragment: {
          module: compModule,
          entryPoint: "fs",
          // dst × src: the sky through the flock
          targets: [{ format: SCENE_FORMAT, blend: { color: { operation: "add", srcFactor: "zero", dstFactor: "src" }, alpha: { operation: "add", srcFactor: "zero", dstFactor: "one" } } }],
        },
      }),
      device.createRenderPipelineAsync({
        label: "murmur-reeds",
        layout: "auto",
        vertex: { module: reedModule, entryPoint: "vs" },
        fragment: {
          module: reedModule,
          entryPoint: "fs",
          // premultiplied over
          targets: [{ format: SCENE_FORMAT, blend: { color: { operation: "add", srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { operation: "add", srcFactor: "zero", dstFactor: "one" } } }],
        },
        primitive: { topology: "triangle-strip" },
      }),
    ]);
    const near = await NearBirds.create(device, view3d, capacity, compModule);
    return new MurmurView(device, view3d, near, duskPipe, splatPipe, compPipe, reedPipe);
  }

  /** The optical-depth buffer (valid after the first encode). */
  get tauBuffer(): GPUBuffer | null {
    return this.tau;
  }

  get tauSize(): [number, number] {
    return [this.tauW, this.tauH];
  }

  private ensureTau(w: number, h: number): void {
    if (this.tau && this.tauW === w && this.tauH === h) return;
    this.tau?.destroy();
    this.tauW = w;
    this.tauH = h;
    this.tau = this.device.createBuffer({ size: Math.max(4, w * h * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label: "murmur-tau" });
    this.splatBinds.clear();
    this.compBind = this.device.createBindGroup({
      label: "murmur-composite",
      layout: this.compPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.compParams } },
        { binding: 1, resource: { buffer: this.tau } },
      ],
    });
  }

  private splatBind(agents: GPUBuffer): GPUBindGroup {
    let b = this.splatBinds.get(agents);
    if (!b) {
      b = this.device.createBindGroup({
        label: "murmur-splat",
        layout: this.splatPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view3d.buffer } },
          { binding: 1, resource: { buffer: this.splatParams } },
          { binding: 2, resource: { buffer: agents } },
          { binding: 3, resource: { buffer: this.tau! } },
          { binding: 4, resource: { buffer: this.near.weights } },
        ],
      });
      this.splatBinds.set(agents, b);
    }
    return b;
  }

  private writeParams(birds: number, timeSec: number): void {
    const P = duskPalette(this.dusk);
    const d = new Float32Array(32);
    d.set([...P.sun, P.glowStrength], 0);
    d.set([...P.zenith, 0], 4);
    d.set([...P.upper, 0], 8);
    d.set([...P.horSun, 0], 12);
    d.set([...P.horAnti, 0], 16);
    d.set([...P.glow, this.dusk.cirrus], 20);
    d.set([timeSec, 2600, -180, -520], 24);
    d.set([...P.land, 1300], 28);
    this.device.queue.writeBuffer(this.duskParams, 0, d);

    const b = this.birds;
    const s = new ArrayBuffer(48);
    const sf = new Float32Array(s);
    const su = new Uint32Array(s);
    sf.set([0.2 * b.scale, 0.11 * b.scale, 0.035 * b.scale, b.planform], 0);
    sf.set([b.filterPx, b.maxSigmaPx, TAU_SCALE, b.mode], 4);
    su.set([birds, this.tauW, this.tauH, 0], 8);
    this.device.queue.writeBuffer(this.splatParams, 0, s);

    const c = new Float32Array(8);
    c.set([0.028, 0.03, 0.042, 1 / TAU_SCALE], 0);
    c.set([this.tauW, this.inkGain, 0, 0], 4);
    this.device.queue.writeBuffer(this.compParams, 0, c);

    const r = new Float32Array(16);
    r.set([HOME_EYE[0], 0, HOME_EYE[2], timeSec], 0);
    r.set([4.5, 70, this.reedCount, this.wind], 4);
    r.set([...P.land.map((x) => x * 0.6), 0], 8);
    r.set([P.horSun[0] * 0.07, P.horSun[1] * 0.07, P.horSun[2] * 0.07, 0], 12);
    this.device.queue.writeBuffer(this.reedParams, 0, r);
  }

  encode(
    enc: GPUCommandEncoder,
    hdr: HdrPipeline,
    f: { camera: GroundCamera; agents: GPUBuffer; birds: number; timeSec: number; falcon?: FalconDraw | null },
    profiler?: GpuProfiler | null,
  ): void {
    const w = hdr.width;
    const h = hdr.height;
    this.view3d.update(f.camera, w, h, f.timeSec);
    this.ensureTau(w, h);
    this.writeParams(f.birds, f.timeSec);
    this.near.writeParams(f.birds, 0.2 * this.birds.scale, f.timeSec, f.falcon ?? null);

    // 1. the dusk
    const a = enc.beginRenderPass({
      label: "murmur-dusk",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      timestampWrites: profiler?.pass("sky") ?? undefined,
    });
    a.setPipeline(this.duskPipe);
    a.setBindGroup(0, this.duskBind);
    a.draw(3);
    a.end();

    // 2. which birds are near enough to draw as birds, then the rest's optical depth
    this.near.encodeCull(enc, f.agents, f.birds, profiler?.pass("near-cull") ?? undefined);
    enc.clearBuffer(this.tau!);
    if (f.birds > 0) {
      const c = enc.beginComputePass({ label: "murmur-splat", timestampWrites: profiler?.pass("flock") ?? undefined });
      c.setPipeline(this.splatPipe);
      c.setBindGroup(0, this.splatBind(f.agents));
      c.dispatchWorkgroups(Math.ceil(f.birds / 64));
      c.end();
    }

    // 3. the near birds and the falcon, multisampled, lit by the sky behind them
    this.near.encodeDraw(enc, f.agents, hdr.sceneView, w, h, !!f.falcon, profiler?.pass("near") ?? undefined);

    // 4. the sky through the flock, the near birds over it, then the reeds over everything
    const b = enc.beginRenderPass({
      label: "murmur-composite",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
      timestampWrites: profiler?.pass("composite") ?? undefined,
    });
    b.setPipeline(this.compPipe);
    b.setBindGroup(0, this.compBind!);
    b.draw(3);
    this.near.composite(b);
    if (this.reedCount > 0) {
      b.setPipeline(this.reedPipe);
      b.setBindGroup(0, this.reedBind);
      b.draw(16, this.reedCount * 4);
    }
    b.end();
  }

  /**
   * The birds' total coverage on screen, px: Σ over pixels of
   * 1 − e^(−τ)·(1 − α), the medium's and the near meshes' together (tests:
   * the hand-off flicker check). Reads back the τ buffer and the near layer.
   */
  async readCoverage(): Promise<{ total: number; medium: number; meshes: number }> {
    const tau = this.tau;
    const tex = this.near.texture;
    if (!tau || !tex) return { total: 0, medium: 0, meshes: 0 };
    const w = this.tauW;
    const h = this.tauH;
    const row = Math.ceil((w * 8) / 256) * 256;
    const a = this.device.createBuffer({ size: w * h * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const b = this.device.createBuffer({ size: row * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(tau, 0, a, 0, w * h * 4);
      enc.copyTextureToBuffer({ texture: tex }, { buffer: b, bytesPerRow: row }, [w, h]);
      this.device.queue.submit([enc.finish()]);
      await Promise.all([a.mapAsync(GPUMapMode.READ), b.mapAsync(GPUMapMode.READ)]);
      const t = new Uint32Array(a.getMappedRange());
      const hv = new Uint16Array(b.getMappedRange());
      const half = (x: number): number => {
        const e = (x >> 10) & 31;
        const m = x & 1023;
        return e === 0 ? m / 16777216 : e === 31 ? 1 : (1 + m / 1024) * 2 ** (e - 15);
      };
      let total = 0;
      let medium = 0;
      let meshes = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const T = Math.exp(-t[y * w + x]! / TAU_SCALE);
          const al = Math.min(half(hv[(y * row) / 2 + x * 4 + 3]!), 1);
          medium += 1 - T;
          meshes += al;
          total += 1 - T * (1 - al);
        }
      }
      return { total, medium, meshes };
    } finally {
      a.destroy();
      b.destroy();
    }
  }

  /**
   * Σ τ over the screen (in px of optical depth) and its largest value, read
   * back from the buffer the last frame wrote (tests and the flicker check).
   */
  async readTau(): Promise<{ total: number; max: number; covered: number; width: number; height: number }> {
    const tau = this.tau;
    if (!tau) return { total: 0, max: 0, covered: 0, width: 0, height: 0 };
    const bytes = this.tauW * this.tauH * 4;
    const staging = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "murmur-tau-read" });
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(tau, 0, staging, 0, bytes);
      this.device.queue.submit([enc.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      const v = new Uint32Array(staging.getMappedRange());
      let total = 0;
      let max = 0;
      let covered = 0;
      for (let i = 0; i < v.length; i += 1) {
        const x = v[i]!;
        total += x;
        if (x > max) max = x;
        if (x > 0) covered += 1;
      }
      staging.unmap();
      return { total: total / TAU_SCALE, max: max / TAU_SCALE, covered, width: this.tauW, height: this.tauH };
    } finally {
      staging.destroy();
    }
  }
}
