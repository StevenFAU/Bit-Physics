// The live solver: the committed kernel (the same WGSL bytes the gate runs,
// proof/gate.ts KERNEL_WGSL) on the live dish's own buffers, restructured for
// a frame loop only where it cannot change a bit:
//   * every step gets its own 256-byte slot in a ring of Params uniforms
//     (dynamic offsets), so a frame's steps go into ONE compute pass and ONE
//     submit instead of the gate path's two submits per step;
//   * bind groups are cached by ping-pong parity.
// Each step is still update → mask with the same Params bytes as the gate
// (grid, step, seed, fire rate, weight offsets), so on the canonical start it
// gives the gate path's state byte for byte — measured in Prove ("The live
// dish is the gated kernel") and in v2-acceptance.mjs.
//
// Edits (Cut, Seed) are a separate brush pass encoded between two steps.

import type { Checkpoint } from "../proof/gate.js";
import { CN, KERNEL_WGSL } from "../proof/gate.js";
import brushSrc from "./brush.wgsl?raw";
import statsSrc from "./stats.wgsl?raw";

/** Uniform slot stride: the default minUniformBufferOffsetAlignment. */
const SLOT = 256;
/** Params slots in the ring (steps per submit must stay below this). */
const RING = 512;
/** Most steps one encodeSteps call records. */
export const MAX_STEPS_PER_ENCODE = 128;
const BRUSH_SLOT = 512;
const BRUSH_RING = 32;
export const MAX_SEGS = 24;

export type StampMode = "cut" | "seed";

/** One edit: a cut stroke (polyline, radius in cells) or seed points. */
export interface Stamp {
  mode: StampMode;
  radius: number;
  /** Flat [x0, y0, x1, y1, …] in cells; for seeds, the points themselves. */
  pts: number[];
}

export interface LiveConfig {
  grid: number;
  seed: number;
  fireRate: number;
}

export interface LiveCheckpoint {
  state: GPUBuffer;
  tick: number;
  seed: number;
  fireRate: number;
}

export interface LiveStats {
  alive: number;
  mass: number;
  /** Alpha-weighted centre, cells. */
  cx: number;
  cy: number;
}

/** Pipelines shared by every live solver on the device (the dish, scratch runs). */
export class LiveKernels {
  private constructor(
    readonly stepLayout: GPUBindGroupLayout,
    readonly update: GPUComputePipeline,
    readonly mask: GPUComputePipeline,
    readonly brushLayout: GPUBindGroupLayout,
    readonly brush: GPUComputePipeline,
    readonly statsLayout: GPUBindGroupLayout,
    readonly stats: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<LiveKernels> {
    const C = GPUShaderStage.COMPUTE;
    // The gate's layout, except binding 0 takes a dynamic offset (one Params slot per step).
    const stepLayout = device.createBindGroupLayout({
      label: "nca-live-step",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 32 } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: C, buffer: { type: "storage" } },
        { binding: 4, visibility: C, buffer: { type: "read-only-storage" } },
      ],
    });
    const module = device.createShaderModule({ code: KERNEL_WGSL, label: "nca-live" });
    const stepPL = device.createPipelineLayout({ bindGroupLayouts: [stepLayout] });
    const brushLayout = device.createBindGroupLayout({
      label: "nca-brush",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: 400 } },
        { binding: 1, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const statsLayout = device.createBindGroupLayout({
      label: "nca-stats",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform" } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const brushModule = device.createShaderModule({ code: brushSrc, label: "nca-brush" });
    const statsModule = device.createShaderModule({ code: statsSrc, label: "nca-stats" });
    const [update, mask, brush, stats] = await Promise.all([
      device.createComputePipelineAsync({ label: "nca-live-update", layout: stepPL, compute: { module, entryPoint: "update" } }),
      device.createComputePipelineAsync({ label: "nca-live-mask", layout: stepPL, compute: { module, entryPoint: "mask" } }),
      device.createComputePipelineAsync({
        label: "nca-brush",
        layout: device.createPipelineLayout({ bindGroupLayouts: [brushLayout] }),
        compute: { module: brushModule, entryPoint: "main" },
      }),
      device.createComputePipelineAsync({
        label: "nca-stats",
        layout: device.createPipelineLayout({ bindGroupLayouts: [statsLayout] }),
        compute: { module: statsModule, entryPoint: "main" },
      }),
    ]);
    return new LiveKernels(stepLayout, update, mask, brushLayout, brush, statsLayout, stats);
  }
}

export class LiveNca {
  readonly grid: number;
  readonly cells: number;
  readonly stateBytes: number;
  seed: number;
  fireRate: number;
  /** Steps run since the start (the kernel's `step`, which seeds the fire mask). */
  tick = 0;
  /** Bumped whenever the state changes (steps, edits, restores). */
  version = 0;

  private readonly device: GPUDevice;
  private readonly kernels: LiveKernels;
  private readonly ck: Checkpoint;
  private readonly bufs: [GPUBuffer, GPUBuffer];
  private readonly mid: GPUBuffer;
  private readonly weights: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly brushBuf: GPUBuffer;
  private readonly statsParams: GPUBuffer;
  /** Four floats: alive, mass, Σαx, Σαy. */
  readonly statsOut: GPUBuffer;
  private readonly upd: [GPUBindGroup, GPUBindGroup];
  private readonly msk: [GPUBindGroup, GPUBindGroup];
  private readonly brushBG: [GPUBindGroup, GPUBindGroup];
  private readonly statsBG: [GPUBindGroup, GPUBindGroup];
  private parity = 0;
  private slot = 0;
  private brushSlot = 0;
  private readonly wg: number;

  constructor(device: GPUDevice, kernels: LiveKernels, ck: Checkpoint, cfg: LiveConfig) {
    this.device = device;
    this.kernels = kernels;
    this.ck = ck;
    this.grid = cfg.grid;
    this.seed = cfg.seed;
    this.fireRate = cfg.fireRate;
    this.cells = cfg.grid * cfg.grid;
    this.stateBytes = this.cells * CN * 4;
    this.wg = Math.ceil(cfg.grid / 8);
    const U = GPUBufferUsage;
    const st = (label: string): GPUBuffer =>
      device.createBuffer({ size: this.stateBytes, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST, label });
    this.bufs = [st("nca-live-a"), st("nca-live-b")];
    this.mid = st("nca-live-mid");
    this.weights = device.createBuffer({ size: ck.weights.byteLength, usage: U.STORAGE | U.COPY_DST, label: "nca-live-weights" });
    device.queue.writeBuffer(this.weights, 0, ck.weights);
    this.params = device.createBuffer({ size: SLOT * RING, usage: U.UNIFORM | U.COPY_DST, label: "nca-live-params" });
    this.brushBuf = device.createBuffer({ size: BRUSH_SLOT * BRUSH_RING, usage: U.UNIFORM | U.COPY_DST, label: "nca-brush" });
    this.statsParams = device.createBuffer({ size: 16, usage: U.UNIFORM | U.COPY_DST, label: "nca-stats-params" });
    device.queue.writeBuffer(this.statsParams, 0, new Uint32Array([cfg.grid, 0, 0, 0]));
    this.statsOut = device.createBuffer({ size: 16, usage: U.STORAGE | U.COPY_SRC, label: "nca-stats" });

    const stepBG = (a: GPUBuffer, b: GPUBuffer, out: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: kernels.stepLayout,
        entries: [
          { binding: 0, resource: { buffer: this.params, size: 32 } },
          { binding: 1, resource: { buffer: a } },
          { binding: 2, resource: { buffer: b } },
          { binding: 3, resource: { buffer: out } },
          { binding: 4, resource: { buffer: this.weights } },
        ],
      });
    const [a, b] = this.bufs;
    // parity 0: cur = a, nxt = b; parity 1: cur = b, nxt = a (the gate's bind(param, cur, cur, mid) / bind(param, cur, mid, nxt))
    this.upd = [stepBG(a, a, this.mid), stepBG(b, b, this.mid)];
    this.msk = [stepBG(a, this.mid, b), stepBG(b, this.mid, a)];
    const brushBG = (s: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: kernels.brushLayout,
        entries: [
          { binding: 0, resource: { buffer: this.brushBuf, size: 400 } },
          { binding: 1, resource: { buffer: s } },
        ],
      });
    this.brushBG = [brushBG(a), brushBG(b)];
    const statsBG = (s: GPUBuffer): GPUBindGroup =>
      device.createBindGroup({
        layout: kernels.statsLayout,
        entries: [
          { binding: 0, resource: { buffer: this.statsParams } },
          { binding: 1, resource: { buffer: s } },
          { binding: 2, resource: { buffer: this.statsOut } },
        ],
      });
    this.statsBG = [statsBG(a), statsBG(b)];
  }

  /** The buffer holding the current state (16 channels per cell, cell-major). */
  get state(): GPUBuffer {
    return this.bufs[this.parity]!;
  }

  /** Replace the state (and zero the scratch buffers); the step counter restarts at `tick`. */
  load(state: Float32Array<ArrayBuffer>, tick = 0): void {
    const q = this.device.queue;
    this.parity = 0;
    q.writeBuffer(this.bufs[0], 0, state);
    const zeros = new Float32Array(this.cells * CN);
    q.writeBuffer(this.bufs[1], 0, zeros);
    q.writeBuffer(this.mid, 0, zeros);
    this.tick = tick;
    this.version += 1;
  }

  /** The gate's 32-byte Params block for `step`, at a fresh ring slot; returns its byte offset. */
  private writeParams(step: number): number {
    const off = this.slot * SLOT;
    this.slot = (this.slot + 1) % RING;
    const ab = new ArrayBuffer(32);
    const dv = new DataView(ab);
    dv.setUint32(0, this.grid, true);
    dv.setUint32(4, step, true);
    dv.setUint32(8, this.seed, true);
    dv.setFloat32(12, this.fireRate, true);
    dv.setUint32(16, this.ck.b1Off, true);
    dv.setUint32(20, this.ck.w1Off, true);
    dv.setUint32(24, this.ck.w2Off, true);
    dv.setUint32(28, 0, true);
    this.device.queue.writeBuffer(this.params, off, ab);
    return off;
  }

  /** Record `n` steps (update then mask each) into one compute pass. */
  encodeSteps(enc: GPUCommandEncoder, n: number, timestampWrites?: GPUComputePassTimestampWrites): number {
    const k = Math.max(0, Math.min(n, MAX_STEPS_PER_ENCODE));
    if (k === 0) return 0;
    const pass = enc.beginComputePass({ label: "nca-steps", timestampWrites });
    for (let s = 0; s < k; s += 1) {
      const off = this.writeParams(this.tick);
      pass.setPipeline(this.kernels.update);
      pass.setBindGroup(0, this.upd[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      pass.setPipeline(this.kernels.mask);
      pass.setBindGroup(0, this.msk[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      this.parity ^= 1;
      this.tick += 1;
    }
    pass.end();
    this.version += 1;
    return k;
  }

  /** Record an edit at the current step boundary. Long strokes are split into several passes. */
  encodeStamp(enc: GPUCommandEncoder, s: Stamp): void {
    const segs: number[][] = [];
    if (s.mode === "seed") {
      for (let i = 0; i + 1 < s.pts.length; i += 2) segs.push([s.pts[i]!, s.pts[i + 1]!, s.pts[i]!, s.pts[i + 1]!]);
    } else if (s.pts.length === 2) {
      segs.push([s.pts[0]!, s.pts[1]!, s.pts[0]!, s.pts[1]!]);
    } else {
      for (let i = 0; i + 3 < s.pts.length; i += 2) segs.push([s.pts[i]!, s.pts[i + 1]!, s.pts[i + 2]!, s.pts[i + 3]!]);
    }
    for (let i = 0; i < segs.length; i += MAX_SEGS) {
      const chunk = segs.slice(i, i + MAX_SEGS);
      const off = this.brushSlot * BRUSH_SLOT;
      this.brushSlot = (this.brushSlot + 1) % BRUSH_RING;
      const ab = new ArrayBuffer(400);
      const dv = new DataView(ab);
      dv.setUint32(0, this.grid, true);
      dv.setUint32(4, chunk.length, true);
      dv.setUint32(8, s.mode === "seed" ? 1 : 0, true);
      dv.setFloat32(12, s.radius, true);
      const f = new Float32Array(ab, 16, MAX_SEGS * 4);
      chunk.forEach((g, j) => f.set(g, j * 4));
      this.device.queue.writeBuffer(this.brushBuf, off, ab);
      const pass = enc.beginComputePass({ label: "nca-brush" });
      pass.setPipeline(this.kernels.brush);
      pass.setBindGroup(0, this.brushBG[this.parity]!, [off]);
      pass.dispatchWorkgroups(this.wg, this.wg);
      pass.end();
    }
    this.version += 1;
  }

  /** Record the stats reduction of the current state into `statsOut`. */
  encodeStats(enc: GPUCommandEncoder): void {
    const pass = enc.beginComputePass({ label: "nca-stats" });
    pass.setPipeline(this.kernels.stats);
    pass.setBindGroup(0, this.statsBG[this.parity]!);
    pass.dispatchWorkgroups(1);
    pass.end();
  }

  static parseStats(ab: ArrayBuffer): LiveStats {
    const f = new Float32Array(ab, 0, 4);
    const mass = f[1]!;
    return { alive: f[0]!, mass, cx: mass > 0 ? f[2]! / mass : NaN, cy: mass > 0 ? f[3]! / mass : NaN };
  }

  /** Copy the current state to the CPU (tests, the PCA tint, the probe). */
  async readState(): Promise<Float32Array<ArrayBuffer>> {
    const rb = this.device.createBuffer({ size: this.stateBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "nca-live-read" });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.state, 0, rb, 0, this.stateBytes);
    this.device.queue.submit([enc.finish()]);
    try {
      await rb.mapAsync(GPUMapMode.READ);
      return new Float32Array(rb.getMappedRange().slice(0));
    } finally {
      rb.destroy();
    }
  }

  // ------------------------------------------------------------ history --

  checkpoint(): LiveCheckpoint {
    const state = this.device.createBuffer({
      size: this.stateBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
      label: "nca-checkpoint",
    });
    const enc = this.device.createCommandEncoder({ label: "nca-checkpoint" });
    enc.copyBufferToBuffer(this.state, 0, state, 0, this.stateBytes);
    this.device.queue.submit([enc.finish()]);
    return { state, tick: this.tick, seed: this.seed, fireRate: this.fireRate };
  }

  restore(c: LiveCheckpoint): void {
    const enc = this.device.createCommandEncoder({ label: "nca-restore" });
    enc.copyBufferToBuffer(c.state, 0, this.state, 0, this.stateBytes);
    this.device.queue.submit([enc.finish()]);
    this.tick = c.tick;
    this.seed = c.seed;
    this.fireRate = c.fireRate;
    this.version += 1;
  }

  release(c: LiveCheckpoint): void {
    c.state.destroy();
  }

  destroy(): void {
    for (const b of [...this.bufs, this.mid, this.weights, this.params, this.brushBuf, this.statsParams, this.statsOut]) b.destroy();
  }
}
