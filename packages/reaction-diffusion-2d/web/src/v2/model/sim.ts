// Turing Patterns — the live simulation.
//
// Two kernels share this runner:
//   "live"      model/live.wgsl — the gated update rule with F and k as fields
//               (The Map's sweep, the chemistry brush, a dive's reveal).
//   "reference" ../../gray_scott.wgsl — the gated kernel itself, byte for
//               byte, on the canonical 128² dish (the "Gated dish" scene).
//
// Time advances in ticks of STEPS_PER_TICK solver steps. Everything that can
// change the physics — uniforms, brush stamps, chemistry, a dive — changes
// only at a tick boundary and is a pure function of (scene config, event log,
// tick), so restoring a checkpoint and replaying the log reproduces the
// same bytes on the same device. With an even step count per tick the state
// is always back in buffer A at a boundary, which is what renders, gets
// checkpointed and gets stamped.

import gatedWgsl from "../../../../src/gray_scott.wgsl?raw";
import liveWgsl from "./live.wgsl?raw";
import surfaceWgsl from "./surface.wgsl?raw";
import surfaceBrushWgsl from "./surface-brush.wgsl?raw";
import brushWgsl from "./brush.wgsl?raw";
import overlayWgsl from "./overlay.wgsl?raw";
import type { Field } from "./ic.js";
import type { ModelId } from "./models.js";
import { MODELS } from "./models.js";
import type { SurfaceMesh } from "./surface-mesh.js";
import { substepsFor } from "./surface-mesh.js";
import { MAP_F, kOffset, kSpan, mapChem } from "../scenes/map.js";

export const STEPS_PER_TICK = 4;
const SLOT = 256; // uniform slot stride (minUniformBufferOffsetAlignment)
const MAX_TICKS_PER_SUBMIT = 64;
const MAX_STAMPS = 128;

/**
 * "live": the gated update rule with per-cell chemistry on a flat W × H grid;
 * "reference": gray_scott.wgsl itself; "surface": the live reaction terms on
 * a closed surface (model/surface.wgsl, "On a Shape").
 */
export type Kernel = "live" | "reference" | "surface";

export interface Sweep {
  /** The sweep is measured relative to this uv (a dive moves it to its point). */
  anchorU: number;
  anchorV: number;
}

export interface Reveal {
  x: number;
  y: number;
  /** Tick the dive started. */
  t0: number;
  /** Cells per tick. */
  speed: number;
  edge: number;
  /** Radius at which the sweep is fully gone. */
  done: number;
}

export interface Chemistry {
  /** Reaction terms (model/models.ts); the reference kernel is always Gray–Scott. */
  model: ModelId;
  /** The model's extra constant (live.wgsl `c.x`). */
  c: number;
  Du: number;
  Dv: number;
  dt: number;
  dx: number;
  F0: number;
  k0: number;
  sweep: Sweep | null;
  reveal: Reveal | null;
}

export interface Stamp {
  x: number;
  y: number;
  r: number;
  strength: number;
  /** 0 seed, 1 erase, 2 chemistry, 3 chemistry clear */
  mode: 0 | 1 | 2 | 3;
  F: number;
  k: number;
}

export interface SimOptions {
  w: number;
  h: number;
  periodic: boolean;
  kernel: Kernel;
  chem: Chemistry;
  seed: number;
  field: Field;
  /** The surface, for the "surface" kernel (w, h are then the cell count and 1). */
  surface?: SurfaceMesh;
}

export interface Checkpoint {
  tick: number;
  chem: Chemistry;
  painted: boolean;
  state: GPUBuffer;
  paint: GPUBuffer | null;
}

export function cloneChem(c: Chemistry): Chemistry {
  return { ...c, sweep: c.sweep ? { ...c.sweep } : null, reveal: c.reveal ? { ...c.reveal } : null };
}

/** The sweep's fade at tick t (pure — replay computes the same). */
export function sweepActive(c: Chemistry, tick: number): boolean {
  if (!c.sweep) return false;
  if (!c.reveal) return true;
  return (tick - c.reveal.t0) * c.reveal.speed <= c.reveal.done;
}

/** Local chemistry at cell (x, y) at tick t, mirroring live.wgsl (paint excluded). */
export function chemistryAt(c: Chemistry, w: number, h: number, x: number, y: number, tick: number): [number, number] {
  let F = c.F0;
  let k = c.k0;
  if (c.sweep && sweepActive(c, tick)) {
    const u = (Math.floor(x) + 0.5) / w;
    const v = (Math.floor(y) + 0.5) / h;
    const at = mapChem(u, v);
    const an = mapChem(c.sweep.anchorU, c.sweep.anchorV);
    let keep = 1;
    if (c.reveal) {
      const r = (tick - c.reveal.t0) * c.reveal.speed;
      const d = Math.hypot(Math.floor(x) - c.reveal.x, Math.floor(y) - c.reveal.y);
      const t = Math.min(Math.max((d - (r - c.reveal.edge)) / c.reveal.edge, 0), 1);
      keep = t * t * (3 - 2 * t);
    }
    F += (at[0] - an[0]) * keep;
    k += (at[1] - an[1]) * keep;
  }
  return [F, k];
}

export class LiveSim {
  readonly w: number;
  readonly h: number;
  readonly periodic: boolean;
  readonly kernel: Kernel;
  readonly cells: number;
  readonly stateBytes: number;
  /** Tick-boundary state (U, V interleaved). */
  readonly state: GPUBuffer;
  private readonly scratch: GPUBuffer;
  /** Painted chemistry, per cell vec2<u32>(pack2x16float(F,k), pack2x16unorm(w,0)). Live kernel only. */
  readonly paint: GPUBuffer | null;
  readonly overlay: GPUTexture | null;
  chem: Chemistry;
  tick = 0;
  /** Seed used for this scene (director stamps hash it). */
  readonly seed: number;

  private readonly device: GPUDevice;
  private readonly pipeline: GPUComputePipeline;
  private readonly uniforms: GPUBuffer;
  private readonly bindAB: GPUBindGroup;
  private readonly bindBA: GPUBindGroup;
  private readonly brushPipeline: GPUComputePipeline | null = null;
  private readonly brushUniform: GPUBuffer | null = null;
  private readonly stampBuf: GPUBuffer | null = null;
  private readonly brushBG: GPUBindGroup | null = null;
  private readonly overlayPipeline: GPUComputePipeline | null = null;
  private readonly overlayUniform: GPUBuffer | null = null;
  private readonly overlayBG: GPUBindGroup | null = null;
  private overlayDirty = true;
  /** Set once the chemistry brush has painted (the kernel then reads the paint field). */
  painted = false;

  /** The surface this sim runs on ("surface" kernel). */
  readonly surface: SurfaceMesh | null;
  /** Forward-Euler substeps per model step (surface stability; 1 on flat grids). */
  readonly substeps: number;
  private readonly surfaceBufs: GPUBuffer[] = [];

  static async create(device: GPUDevice, o: SimOptions): Promise<LiveSim> {
    if (o.kernel === "surface") return LiveSim.createSurface(device, o);
    const code = o.kernel === "live" ? liveWgsl : gatedWgsl;
    const module = device.createShaderModule({ code, label: o.kernel === "live" ? "rd-live" : "gray-scott (gated)" });
    const entries: GPUBindGroupLayoutEntry[] = [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ];
    if (o.kernel === "live") {
      entries.push({ binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } });
    }
    const layout = device.createBindGroupLayout({ entries, label: `rd-${o.kernel}-bgl` });
    const pipeline = await device.createComputePipelineAsync({
      label: `rd-${o.kernel}`,
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: o.kernel === "live" ? { module, entryPoint: "main", constants: { MODEL: MODELS[o.chem.model].index } } : { module, entryPoint: "main" },
    });
    let brush: GPUComputePipeline | null = null;
    let overlay: GPUComputePipeline | null = null;
    if (o.kernel === "live") {
      [brush, overlay] = await Promise.all([
        device.createComputePipelineAsync({
          label: "rd-brush",
          layout: "auto",
          compute: { module: device.createShaderModule({ code: brushWgsl, label: "rd-brush" }), entryPoint: "main" },
        }),
        device.createComputePipelineAsync({
          label: "rd-overlay",
          layout: "auto",
          compute: { module: device.createShaderModule({ code: overlayWgsl, label: "rd-overlay" }), entryPoint: "main" },
        }),
      ]);
    }
    return new LiveSim(device, o, pipeline, layout, brush, overlay);
  }

  private static async createSurface(device: GPUDevice, o: SimOptions): Promise<LiveSim> {
    const mesh = o.surface;
    if (!mesh) throw new Error("surface kernel without a surface");
    const entries: GPUBindGroupLayoutEntry[] = [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", hasDynamicOffset: true } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ];
    const layout = device.createBindGroupLayout({ entries, label: "rd-surface-bgl" });
    const [pipeline, brush] = await Promise.all([
      device.createComputePipelineAsync({
        label: "rd-surface",
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: {
          module: device.createShaderModule({ code: surfaceWgsl, label: "rd-surface" }),
          entryPoint: "main",
          constants: { MODEL: MODELS[o.chem.model].index },
        },
      }),
      device.createComputePipelineAsync({
        label: "rd-surface-brush",
        layout: "auto",
        compute: { module: device.createShaderModule({ code: surfaceBrushWgsl, label: "rd-surface-brush" }), entryPoint: "main" },
      }),
    ]);
    return new LiveSim(device, { ...o, w: mesh.cells, h: 1, periodic: true }, pipeline, layout, brush, null);
  }

  private constructor(
    device: GPUDevice,
    o: SimOptions,
    pipeline: GPUComputePipeline,
    layout: GPUBindGroupLayout,
    brush: GPUComputePipeline | null,
    overlay: GPUComputePipeline | null,
  ) {
    this.device = device;
    this.w = o.w;
    this.h = o.h;
    this.periodic = o.periodic;
    this.kernel = o.kernel;
    this.surface = o.kernel === "surface" ? (o.surface ?? null) : null;
    this.substeps = this.surface ? substepsFor(this.surface, Math.max(o.chem.Du, o.chem.Dv), o.chem.dt) : 1;
    this.chem = cloneChem(o.chem);
    this.seed = o.seed;
    this.cells = o.w * o.h;
    this.stateBytes = this.cells * 2 * 4;
    this.pipeline = pipeline;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.state = device.createBuffer({ size: this.stateBytes, usage, label: "rd-state-a" });
    this.scratch = device.createBuffer({ size: this.stateBytes, usage, label: "rd-state-b" });
    device.queue.writeBuffer(this.state, 0, o.field);
    this.uniforms = device.createBuffer({
      size: SLOT * MAX_TICKS_PER_SUBMIT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "rd-tick-uniforms",
    });
    const uniformSize = o.kernel === "live" ? 112 : o.kernel === "surface" ? 48 : 32;
    if (o.kernel === "live") {
      this.paint = device.createBuffer({ size: this.cells * 8, usage, label: "rd-paint" });
      this.overlay = device.createTexture({
        size: [o.w, o.h],
        format: "rgba8unorm",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        label: "rd-chem-overlay",
      });
    } else {
      this.paint = null;
      this.overlay = null;
    }
    let surfNbr: GPUBuffer | null = null;
    let surfWts: GPUBuffer | null = null;
    let surfPos: GPUBuffer | null = null;
    if (this.surface) {
      const m = this.surface;
      const mk = (data: Uint32Array<ArrayBuffer> | Float32Array<ArrayBuffer>, label: string): GPUBuffer => {
        const b = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label });
        device.queue.writeBuffer(b, 0, data);
        this.surfaceBufs.push(b);
        return b;
      };
      surfNbr = mk(m.nbr, "rd-surface-nbr");
      surfWts = mk(m.wts, "rd-surface-wts");
      surfPos = mk(m.pos, "rd-surface-pos");
    }
    const bind = (src: GPUBuffer, dst: GPUBuffer, label: string): GPUBindGroup => {
      const e: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: this.uniforms, size: uniformSize } },
        { binding: 1, resource: { buffer: src } },
        { binding: 2, resource: { buffer: dst } },
      ];
      if (this.paint) e.push({ binding: 3, resource: { buffer: this.paint } });
      if (surfNbr && surfWts) e.push({ binding: 3, resource: { buffer: surfNbr } }, { binding: 4, resource: { buffer: surfWts } });
      return device.createBindGroup({ layout, entries: e, label });
    };
    this.bindAB = bind(this.state, this.scratch, "rd-ab");
    this.bindBA = bind(this.scratch, this.state, "rd-ba");
    if (brush && surfPos) {
      this.brushPipeline = brush;
      this.brushUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-surface-brush" });
      this.stampBuf = device.createBuffer({ size: MAX_STAMPS * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: "rd-stamps" });
      this.brushBG = device.createBindGroup({
        layout: brush.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.brushUniform } },
          { binding: 1, resource: { buffer: this.stampBuf } },
          { binding: 2, resource: { buffer: this.state } },
          { binding: 3, resource: { buffer: surfPos } },
        ],
        label: "rd-surface-brush",
      });
    }
    if (brush && overlay && this.paint && this.overlay) {
      this.brushPipeline = brush;
      this.brushUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-brush" });
      this.stampBuf = device.createBuffer({
        size: MAX_STAMPS * 32,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: "rd-stamps",
      });
      this.brushBG = device.createBindGroup({
        layout: brush.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.brushUniform } },
          { binding: 1, resource: { buffer: this.stampBuf } },
          { binding: 2, resource: { buffer: this.state } },
          { binding: 3, resource: { buffer: this.paint } },
        ],
        label: "rd-brush",
      });
      this.overlayPipeline = overlay;
      this.overlayUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "rd-overlay" });
      this.overlayBG = device.createBindGroup({
        layout: overlay.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.overlayUniform } },
          { binding: 1, resource: { buffer: this.paint } },
          { binding: 2, resource: this.overlay.createView() },
        ],
        label: "rd-overlay",
      });
      device.queue.writeBuffer(this.paint, 0, new Uint32Array(this.cells * 2));
    }
  }

  /** Replace the whole field (scene start, or a gated-scene reload). */
  upload(field: Field): void {
    this.device.queue.writeBuffer(this.state, 0, field);
    if (this.paint) {
      this.device.queue.writeBuffer(this.paint, 0, new Uint32Array(this.cells * 2));
      this.overlayDirty = true;
      this.painted = false;
    }
  }

  private writeUniformSlot(view: DataView, slot: number, tick: number): void {
    const o = slot * SLOT;
    const c = this.chem;
    if (this.kernel === "surface") {
      view.setUint32(o, this.cells, true);
      view.setFloat32(o + 16, c.Du, true);
      view.setFloat32(o + 20, c.Dv, true);
      view.setFloat32(o + 24, c.dt / this.substeps, true);
      view.setFloat32(o + 28, c.F0, true);
      view.setFloat32(o + 32, c.k0, true);
      view.setFloat32(o + 36, c.c, true);
      return;
    }
    if (this.kernel === "reference") {
      // gray_scott.wgsl Params: n, step, Du, Dv, F, k, dx, dt
      view.setUint32(o, this.w, true);
      view.setUint32(o + 4, tick * STEPS_PER_TICK + 1, true);
      view.setFloat32(o + 8, c.Du, true);
      view.setFloat32(o + 12, c.Dv, true);
      view.setFloat32(o + 16, c.F0, true);
      view.setFloat32(o + 20, c.k0, true);
      view.setFloat32(o + 24, c.dx, true);
      view.setFloat32(o + 28, c.dt, true);
      return;
    }
    const sweepOn = sweepActive(c, tick);
    view.setUint32(o, this.w, true);
    view.setUint32(o + 4, this.h, true);
    view.setUint32(o + 8, this.periodic ? 1 : 0, true);
    view.setUint32(o + 12, sweepOn ? 1 : 0, true);
    view.setFloat32(o + 16, c.Du, true);
    view.setFloat32(o + 20, c.Dv, true);
    view.setFloat32(o + 24, c.dt, true);
    view.setFloat32(o + 28, c.dx, true);
    view.setFloat32(o + 32, c.F0, true);
    view.setFloat32(o + 36, c.k0, true);
    view.setFloat32(o + 40, MAP_F[1] - MAP_F[0], true);
    view.setFloat32(o + 44, kSpan(MAP_F[0]), true);
    view.setFloat32(o + 48, c.sweep?.anchorU ?? 0, true);
    view.setFloat32(o + 52, c.sweep?.anchorV ?? 0, true);
    const r = c.reveal && sweepOn ? Math.max((tick - c.reveal.t0) * c.reveal.speed, 1e-3) : 0;
    view.setFloat32(o + 56, r, true);
    view.setFloat32(o + 60, c.reveal?.edge ?? 1, true);
    view.setFloat32(o + 64, c.reveal?.x ?? 0, true);
    view.setFloat32(o + 68, c.reveal?.y ?? 0, true);
    view.setFloat32(o + 72, MAP_F[0], true);
    view.setFloat32(o + 76, kSpan(MAP_F[0] + 1) - kSpan(MAP_F[0]), true);
    view.setFloat32(o + 80, kOffset(MAP_F[0]), true);
    view.setFloat32(o + 84, kOffset(MAP_F[0] + 1) - kOffset(MAP_F[0]), true);
    view.setUint32(o + 88, this.painted ? 1 : 0, true);
    view.setFloat32(o + 96, c.c, true);
  }

  private readonly staging = new ArrayBuffer(SLOT * MAX_TICKS_PER_SUBMIT);
  private readonly stagingView = new DataView(this.staging);
  private slotsUsed = 0;

  /** Uniform slots left before `flushUniforms` + a submit are required. */
  get slotsFree(): number {
    return MAX_TICKS_PER_SUBMIT - this.slotsUsed;
  }

  /**
   * Record one tick (STEPS_PER_TICK steps) at `this.tick` into `pass` and
   * advance. Its uniforms go into the next free slot of the staging block;
   * call `flushUniforms()` before the submit that carries this pass.
   */
  encodeTick(pass: GPUComputePassEncoder): void {
    if (this.slotsUsed >= MAX_TICKS_PER_SUBMIT) throw new Error("encodeTick: uniform slots exhausted — flush and submit first");
    const slot = this.slotsUsed;
    this.writeUniformSlot(this.stagingView, slot, this.tick);
    pass.setPipeline(this.pipeline);
    const surface = this.kernel === "surface";
    const gx = surface ? Math.ceil(this.cells / 64) : Math.ceil(this.w / 8);
    const gy = surface ? 1 : Math.ceil(this.h / 8);
    // an even dispatch count per tick: the state is back in buffer A at every boundary
    for (let k = 0; k < STEPS_PER_TICK * this.substeps; k += 1) {
      pass.setBindGroup(0, k % 2 === 0 ? this.bindAB : this.bindBA, [slot * SLOT]);
      pass.dispatchWorkgroups(gx, gy, 1);
    }
    this.slotsUsed += 1;
    this.tick += 1;
  }

  /** Write the staged tick uniforms; must precede the submit of their pass. */
  flushUniforms(): void {
    if (this.slotsUsed === 0) return;
    this.device.queue.writeBuffer(this.uniforms, 0, this.staging, 0, this.slotsUsed * SLOT);
    this.slotsUsed = 0;
  }

  /** Apply brush stamps at the current tick boundary (live kernel only). */
  encodeStamps(pass: GPUComputePassEncoder, stamps: readonly Stamp[]): void {
    if (!this.brushPipeline || !this.brushBG || !this.brushUniform || !this.stampBuf || stamps.length === 0) return;
    const n = Math.min(stamps.length, MAX_STAMPS);
    const ab = new ArrayBuffer(n * 32);
    const f = new Float32Array(ab);
    const u = new Uint32Array(ab);
    for (let i = 0; i < n; i += 1) {
      const s = stamps[i]!;
      f[i * 8] = s.x;
      f[i * 8 + 1] = s.y;
      f[i * 8 + 2] = s.r;
      f[i * 8 + 3] = s.strength;
      u[i * 8 + 4] = s.mode;
      f[i * 8 + 5] = s.F;
      f[i * 8 + 6] = s.k;
    }
    this.device.queue.writeBuffer(this.stampBuf, 0, ab);
    const m = MODELS[this.chem.model];
    if (this.surface) {
      const su = new ArrayBuffer(32);
      new Uint32Array(su, 0, 2).set([this.cells, n]);
      new Float32Array(su, 8, 1).set([this.surface.scale]);
      new Float32Array(su, 16, 4).set([m.seed[0], m.seed[1], m.rest[0], m.rest[1]]);
      this.device.queue.writeBuffer(this.brushUniform, 0, su);
      pass.setPipeline(this.brushPipeline);
      pass.setBindGroup(0, this.brushBG);
      pass.dispatchWorkgroups(Math.ceil(this.cells / 64), 1, 1);
      return;
    }
    const bu = new ArrayBuffer(32);
    new Uint32Array(bu, 0, 4).set([this.w, this.h, this.periodic ? 1 : 0, n]);
    new Float32Array(bu, 16, 4).set([m.seed[0], m.seed[1], m.rest[0], m.rest[1]]);
    this.device.queue.writeBuffer(this.brushUniform, 0, bu);
    pass.setPipeline(this.brushPipeline);
    pass.setBindGroup(0, this.brushBG);
    pass.dispatchWorkgroups(Math.ceil(this.w / 8), Math.ceil(this.h / 8), 1);
    if (stamps.some((s) => s.mode >= 2)) {
      this.overlayDirty = true;
      this.painted = true;
    }
  }

  /** Refresh the chemistry overlay texture when the paint changed. */
  encodeOverlay(pass: GPUComputePassEncoder, window: { f: [number, number]; k: [number, number] }): void {
    if (!this.overlayDirty || !this.overlayPipeline || !this.overlayBG || !this.overlayUniform) return;
    const ab = new ArrayBuffer(32);
    const u = new Uint32Array(ab);
    const f = new Float32Array(ab);
    u[0] = this.w;
    u[1] = this.h;
    f[4] = window.f[0];
    f[5] = window.f[1];
    f[6] = window.k[0];
    f[7] = window.k[1];
    this.device.queue.writeBuffer(this.overlayUniform, 0, ab);
    pass.setPipeline(this.overlayPipeline);
    pass.setBindGroup(0, this.overlayBG);
    pass.dispatchWorkgroups(Math.ceil(this.w / 8), Math.ceil(this.h / 8), 1);
    this.overlayDirty = false;
  }

  get hasPaintedChemistry(): boolean {
    return this.paint !== null;
  }

  checkpoint(): Checkpoint {
    const usage = GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE;
    const state = this.device.createBuffer({ size: this.stateBytes, usage, label: "rd-checkpoint-state" });
    const paint = this.paint ? this.device.createBuffer({ size: this.cells * 8, usage, label: "rd-checkpoint-paint" }) : null;
    const enc = this.device.createCommandEncoder({ label: "checkpoint" });
    enc.copyBufferToBuffer(this.state, 0, state, 0, this.stateBytes);
    if (paint && this.paint) enc.copyBufferToBuffer(this.paint, 0, paint, 0, this.cells * 8);
    this.device.queue.submit([enc.finish()]);
    return { tick: this.tick, chem: cloneChem(this.chem), state, paint, painted: this.painted };
  }

  restore(cp: Checkpoint): void {
    const enc = this.device.createCommandEncoder({ label: "restore" });
    enc.copyBufferToBuffer(cp.state, 0, this.state, 0, this.stateBytes);
    if (cp.paint && this.paint) enc.copyBufferToBuffer(cp.paint, 0, this.paint, 0, this.cells * 8);
    this.device.queue.submit([enc.finish()]);
    this.tick = cp.tick;
    this.chem = cloneChem(cp.chem);
    this.painted = cp.painted;
    this.overlayDirty = true;
  }

  release(cp: Checkpoint): void {
    cp.state.destroy();
    cp.paint?.destroy();
  }

  destroy(): void {
    this.state.destroy();
    this.scratch.destroy();
    this.paint?.destroy();
    this.overlay?.destroy();
    this.uniforms.destroy();
    this.brushUniform?.destroy();
    this.stampBuf?.destroy();
    this.overlayUniform?.destroy();
    for (const b of this.surfaceBufs) b.destroy();
  }
}
