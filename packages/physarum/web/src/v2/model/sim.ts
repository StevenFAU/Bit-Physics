// Slime Mould — the live simulation: buffers, one step = two dispatches
// (agents, fused deposit/diffuse), a counting-sort reorder every few steps,
// GPU seeding, and checkpoints (GPU copies) for save / restore / compare.

import { CountingSort, readBuffer, wgsl } from "@bp/gpu";
import commonSrc from "./live-common.wgsl?raw";
import agentsSrc from "./live-agents.wgsl?raw";
import diffuseSrc from "./live-diffuse.wgsl?raw";
import sortSrc from "./live-sort.wgsl?raw";
import gatherSrc from "./live-gather.wgsl?raw";
import seedSrc from "./live-seed.wgsl?raw";
import type { JonesParams } from "../proof/gate.js";
import { TILE_SHIFT } from "./grid.js";

const LOCAL = { "physarum/live-common": commonSrc };
const U = (): typeof GPUBufferUsage => GPUBufferUsage;

export interface SeedSpec {
  /** 0 whole dish, 1 disc, 2 ring. */
  mode: 0 | 1 | 2;
  seed: number;
  /** Disc / ring centre and radius, in cells. */
  centre?: [number, number];
  radius?: number;
  /** Heading jitter about outward, radians. */
  spread?: number;
}

export interface LiveConfig {
  w: number;
  h: number;
  n: number;
  params: JonesParams;
  /**
   * Long-run mode: wrap positions into the domain after each move and
   * renormalise headings after a turn. Off = the gated kernel's arithmetic.
   */
  longRun: boolean;
  /** Reorder agents by tile every this many steps (0 = never). */
  sortEvery: number;
}

export interface Checkpoint {
  agents: GPUBuffer;
  trail: GPUBuffer;
  tick: number;
  params: JonesParams;
  predictedMass: number;
}

/** WGSL round(): to nearest, ties to even. */
const roundEven = (x: number): number => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};

/** Pipelines shared by every LiveSim on a device (compiled once). */
export class LiveKernels {
  private constructor(
    readonly paramsLayout: GPUBindGroupLayout,
    readonly agentsLayout: GPUBindGroupLayout,
    readonly diffuseLayout: GPUBindGroupLayout,
    readonly keysLayout: GPUBindGroupLayout,
    readonly gatherLayout: GPUBindGroupLayout,
    readonly seedLayout: GPUBindGroupLayout,
    readonly agents: GPUComputePipeline,
    readonly diffuse: GPUComputePipeline,
    readonly keys: GPUComputePipeline,
    readonly gather: GPUComputePipeline,
    readonly seed: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<LiveKernels> {
    const C = GPUShaderStage.COMPUTE;
    const buf = (type: GPUBufferBindingType): GPUBindGroupLayoutEntry["buffer"] => ({ type });
    const layout = (label: string, types: GPUBufferBindingType[]): GPUBindGroupLayout =>
      device.createBindGroupLayout({ label, entries: types.map((t, i) => ({ binding: i, visibility: C, buffer: buf(t) })) });
    const paramsLayout = layout("phys-params", ["uniform"]);
    const agentsLayout = layout("phys-agents", ["read-only-storage", "storage", "storage"]);
    const diffuseLayout = layout("phys-diffuse", ["read-only-storage", "read-only-storage", "storage", "storage"]);
    const keysLayout = layout("phys-keys", ["read-only-storage", "storage"]);
    const gatherLayout = layout("phys-gather", ["read-only-storage", "read-only-storage", "storage"]);
    const seedLayout = layout("phys-seed", ["uniform", "storage"]);
    const mk = (label: string, src: string, entryPoint: string, l: GPUBindGroupLayout): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({
        label,
        layout: device.createPipelineLayout({ bindGroupLayouts: [paramsLayout, l] }),
        compute: { module: device.createShaderModule({ code: wgsl(src, LOCAL), label }), entryPoint },
      });
    const [agents, diffuse, keys, gather, seed] = await Promise.all([
      mk("phys-agents", agentsSrc, "agents_step", agentsLayout),
      mk("phys-diffuse", diffuseSrc, "diffuse", diffuseLayout),
      mk("phys-keys", sortSrc, "sort_keys", keysLayout),
      mk("phys-gather", gatherSrc, "gather", gatherLayout),
      mk("phys-seed", seedSrc, "seed_agents", seedLayout),
    ]);
    return new LiveKernels(paramsLayout, agentsLayout, diffuseLayout, keysLayout, gatherLayout, seedLayout, agents, diffuse, keys, gather, seed);
  }
}

export class LiveSim {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  readonly cells: number;
  params: JonesParams;
  readonly longRun: boolean;
  sortEvery: number;
  /** Steps run since the scene started. */
  tick = 0;
  /** Reorders run (for the readout). */
  sorts = 0;
  /**
   * The total trail the closed form predicts after the steps run so far,
   * through every parameter change: each step adds d·N (the deposit as the
   * kernel rounds it, ×65536 to an integer) and keeps (1 − α) of the sum, so
   * M ← (M + d·N)(1 − α), settling at d·N·(1 − α)/α. Kept in f64.
   */
  predictedMass = 0;
  private depositPerStep = 0;
  private keep = 1;

  private readonly device: GPUDevice;
  private readonly k: LiveKernels;
  private readonly uniform: GPUBuffer;
  private readonly seedUniform: GPUBuffer;
  readonly agentBufs: [GPUBuffer, GPUBuffer];
  readonly trailBufs: [GPUBuffer, GPUBuffer];
  private readonly depBufs: [GPUBuffer, GPUBuffer];
  private readonly keys: GPUBuffer;
  private readonly sort: CountingSort;
  private readonly paramsBG: GPUBindGroup;
  private readonly agentsBG: GPUBindGroup[][] = [];
  private readonly diffuseBG: GPUBindGroup[] = [];
  private readonly keysBG: GPUBindGroup[] = [];
  private readonly gatherBG: GPUBindGroup[] = [];
  private readonly seedBG: GPUBindGroup;
  /** Which trail buffer is current (the deposit parity equals it, see `encodeSteps`). */
  private t = 0;
  /** Which agent buffer is current. */
  private a = 0;
  private readonly tilesX: number;

  constructor(device: GPUDevice, kernels: LiveKernels, cfg: LiveConfig) {
    this.device = device;
    this.k = kernels;
    this.w = cfg.w;
    this.h = cfg.h;
    this.n = cfg.n;
    this.cells = cfg.w * cfg.h;
    this.params = { ...cfg.params };
    this.longRun = cfg.longRun;
    this.sortEvery = cfg.sortEvery;
    const S = U().STORAGE | U().COPY_DST | U().COPY_SRC;
    const agentBytes = cfg.n * 16;
    const cellBytes = this.cells * 4;
    this.agentBufs = [0, 1].map((i) => device.createBuffer({ size: agentBytes, usage: S, label: `phys-agents-${i}` })) as [GPUBuffer, GPUBuffer];
    this.trailBufs = [0, 1].map((i) => device.createBuffer({ size: cellBytes, usage: S, label: `phys-trail-${i}` })) as [GPUBuffer, GPUBuffer];
    this.depBufs = [0, 1].map((i) => device.createBuffer({ size: cellBytes, usage: S, label: `phys-dep-${i}` })) as [GPUBuffer, GPUBuffer];
    this.keys = device.createBuffer({ size: Math.max(16, cfg.n * 4), usage: S, label: "phys-keys" });
    this.tilesX = Math.ceil(cfg.w / (1 << TILE_SHIFT));
    const tilesY = Math.ceil(cfg.h / (1 << TILE_SHIFT));
    this.sort = new CountingSort(device, { maxItems: cfg.n, keyCount: this.tilesX * tilesY, label: "phys-sort" });
    this.uniform = device.createBuffer({ size: 48, usage: U().UNIFORM | U().COPY_DST, label: "phys-params" });
    this.seedUniform = device.createBuffer({ size: 32, usage: U().UNIFORM | U().COPY_DST, label: "phys-seed" });
    this.writeParams();

    const bg = (layout: GPUBindGroupLayout, label: string, ...bufs: GPUBuffer[]): GPUBindGroup =>
      device.createBindGroup({ layout, label, entries: bufs.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
    this.paramsBG = bg(kernels.paramsLayout, "phys-params", this.uniform);
    for (let t = 0; t < 2; t += 1) {
      // trail parity t ⇒ deposit into dep[t]; the fused pass reads dep[t], clears dep[1 − t]
      this.agentsBG.push([0, 1].map((a) => bg(kernels.agentsLayout, `phys-agents-${t}${a}`, this.trailBufs[t]!, this.agentBufs[a]!, this.depBufs[t]!)));
      this.diffuseBG.push(bg(kernels.diffuseLayout, `phys-diffuse-${t}`, this.trailBufs[t]!, this.depBufs[t]!, this.trailBufs[1 - t]!, this.depBufs[1 - t]!));
    }
    for (let a = 0; a < 2; a += 1) {
      this.keysBG.push(bg(kernels.keysLayout, `phys-keys-${a}`, this.agentBufs[a]!, this.keys));
      this.gatherBG.push(bg(kernels.gatherLayout, `phys-gather-${a}`, this.agentBufs[a]!, this.sort.order, this.agentBufs[1 - a]!));
    }
    this.seedBG = bg(kernels.seedLayout, "phys-seed", this.seedUniform, this.agentBufs[0]);
  }

  /** Current trail (row-major, w × h f32). */
  get trail(): GPUBuffer {
    return this.trailBufs[this.t]!;
  }

  /** Deposits of the last step (u32 ×65536 per agent; stale until the next step clears it). */
  get lastDeposit(): GPUBuffer {
    return this.depBufs[1 - this.t]!;
  }

  /** Current agents (vec4: pos.xy, head.xy). */
  get agents(): GPUBuffer {
    return this.agentBufs[this.a]!;
  }

  get trailBytes(): number {
    return this.cells * 4;
  }

  /** Mean trail per cell at equilibrium for the current parameters. */
  get meanTrail(): number {
    return (this.params.deposit * (this.n / this.cells) * (1 - this.params.decay_alpha)) / this.params.decay_alpha;
  }

  /** Total mass at equilibrium, d·N·(1−α)/α. */
  get equilibriumMass(): number {
    return (this.params.deposit * this.n * (1 - this.params.decay_alpha)) / this.params.decay_alpha;
  }

  setParams(p: JonesParams): void {
    this.params = { ...p };
    this.writeParams();
  }

  /** The per-step terms of the mass recurrence, as the kernel computes them (f32 params, fixed-point deposit). */
  private massTerms(): void {
    const d = Math.fround(this.params.deposit);
    this.depositPerStep = (roundEven(Math.fround(d * 65536)) / 65536) * this.n;
    this.keep = Math.fround(1 - Math.fround(this.params.decay_alpha));
  }

  private writeParams(): void {
    const ab = new ArrayBuffer(48);
    const dv = new DataView(ab);
    const p = this.params;
    dv.setUint32(0, this.n, true);
    dv.setUint32(4, this.w, true);
    dv.setUint32(8, this.h, true);
    dv.setUint32(12, this.longRun ? 3 : 0, true);
    // the gated writer's arithmetic: radians from degrees in f64, then f32
    dv.setFloat32(16, (p.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, p.L_sense, true);
    dv.setFloat32(24, p.L_move, true);
    dv.setFloat32(28, p.deposit, true);
    dv.setFloat32(32, p.decay_alpha, true);
    dv.setUint32(36, this.tilesX, true);
    dv.setUint32(40, TILE_SHIFT, true);
    this.device.queue.writeBuffer(this.uniform, 0, ab);
    this.massTerms();
  }

  private clearField(enc: GPUCommandEncoder): void {
    for (const b of [...this.trailBufs, ...this.depBufs]) enc.clearBuffer(b);
    this.t = 0;
    this.predictedMass = 0;
  }

  /** Seed the colony on the GPU from (seed, index); clears the trail. */
  seed(s: SeedSpec): void {
    const ab = new ArrayBuffer(32);
    const u = new Uint32Array(ab);
    const f = new Float32Array(ab);
    u[0] = s.seed >>> 0;
    u[1] = s.mode;
    f[4] = s.centre?.[0] ?? this.w / 2;
    f[5] = s.centre?.[1] ?? this.h / 2;
    f[6] = s.radius ?? Math.min(this.w, this.h) * 0.1;
    f[7] = s.spread ?? 0.6;
    this.device.queue.writeBuffer(this.seedUniform, 0, ab);
    const enc = this.device.createCommandEncoder({ label: "phys-seed" });
    this.clearField(enc);
    const pass = enc.beginComputePass({ label: "phys-seed" });
    pass.setPipeline(this.k.seed);
    pass.setBindGroup(0, this.paramsBG);
    pass.setBindGroup(1, this.seedBG);
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    pass.end();
    this.device.queue.submit([enc.finish()]);
    this.a = 0;
    this.tick = 0;
  }

  /** Load agents (vec4 per agent) and clear the trail — the gated scene's committed IC. */
  load(agents: Float32Array<ArrayBuffer>): void {
    if (agents.length !== this.n * 4) throw new Error(`agents: ${agents.length / 4} given, sim holds ${this.n}`);
    const enc = this.device.createCommandEncoder({ label: "phys-load" });
    this.clearField(enc);
    this.device.queue.submit([enc.finish()]);
    this.device.queue.writeBuffer(this.agentBufs[0], 0, agents);
    this.a = 0;
    this.tick = 0;
  }

  /**
   * Record `steps` solver steps (and any due reorders) into `enc`. One
   * compute pass for the steps; a reorder gets its own pass so it is timed
   * apart.
   */
  encodeSteps(enc: GPUCommandEncoder, steps: number, timing?: (pass: "sim" | "sort") => GPUComputePassTimestampWrites | undefined): void {
    if (steps <= 0) return;
    const wgA = Math.ceil(this.n / 256);
    const wgX = Math.ceil(this.w / 16);
    const wgY = Math.ceil(this.h / 16);
    let pass = enc.beginComputePass({ label: "phys-sim", timestampWrites: timing?.("sim") });
    pass.setBindGroup(0, this.paramsBG);
    let sortedThisFrame = false;
    for (let s = 0; s < steps; s += 1) {
      pass.setPipeline(this.k.agents);
      pass.setBindGroup(1, this.agentsBG[this.t]![this.a]!);
      pass.dispatchWorkgroups(wgA);
      pass.setPipeline(this.k.diffuse);
      pass.setBindGroup(1, this.diffuseBG[this.t]!);
      pass.dispatchWorkgroups(wgX, wgY);
      this.t = 1 - this.t;
      this.tick += 1;
      this.predictedMass = (this.predictedMass + this.depositPerStep) * this.keep;
      if (this.sortEvery > 0 && this.tick % this.sortEvery === 0 && !sortedThisFrame) {
        // one reorder per frame at most; it lands between steps (the trail is untouched by it)
        pass.end();
        this.encodeSort(enc, timing?.("sort"));
        sortedThisFrame = true;
        pass = enc.beginComputePass({ label: "phys-sim-cont" });
        pass.setBindGroup(0, this.paramsBG);
      }
    }
    pass.end();
  }

  /** Reorder agents into tile order now (keys → counting sort → gather). */
  encodeSort(enc: GPUCommandEncoder, timestampWrites?: GPUComputePassTimestampWrites): void {
    const wgA = Math.ceil(this.n / 256);
    const pass = enc.beginComputePass({ label: "phys-sort", timestampWrites });
    pass.setBindGroup(0, this.paramsBG);
    pass.setPipeline(this.k.keys);
    pass.setBindGroup(1, this.keysBG[this.a]!);
    pass.dispatchWorkgroups(wgA);
    this.sort.encode(pass, this.keys);
    pass.setBindGroup(0, this.paramsBG);
    pass.setPipeline(this.k.gather);
    pass.setBindGroup(1, this.gatherBG[this.a]!);
    pass.dispatchWorkgroups(wgA);
    pass.end();
    this.a = 1 - this.a;
    this.sorts += 1;
  }

  checkpoint(): Checkpoint {
    const S = U().STORAGE | U().COPY_DST | U().COPY_SRC;
    const agents = this.device.createBuffer({ size: this.n * 16, usage: S, label: "phys-cp-agents" });
    const trail = this.device.createBuffer({ size: this.cells * 4, usage: S, label: "phys-cp-trail" });
    const enc = this.device.createCommandEncoder({ label: "phys-checkpoint" });
    enc.copyBufferToBuffer(this.agents, 0, agents, 0, this.n * 16);
    enc.copyBufferToBuffer(this.trail, 0, trail, 0, this.cells * 4);
    this.device.queue.submit([enc.finish()]);
    return { agents, trail, tick: this.tick, params: { ...this.params }, predictedMass: this.predictedMass };
  }

  restore(c: Checkpoint): void {
    const enc = this.device.createCommandEncoder({ label: "phys-restore" });
    this.clearField(enc);
    enc.copyBufferToBuffer(c.agents, 0, this.agentBufs[0], 0, this.n * 16);
    enc.copyBufferToBuffer(c.trail, 0, this.trailBufs[0], 0, this.cells * 4);
    this.device.queue.submit([enc.finish()]);
    this.a = 0;
    this.t = 0;
    this.tick = c.tick;
    this.setParams(c.params);
    this.predictedMass = c.predictedMass;
  }

  release(c: Checkpoint): void {
    c.agents.destroy();
    c.trail.destroy();
  }

  /** Read the trail back (f32, row-major). */
  async readTrail(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.trail, this.trailBytes));
  }

  /** Read the agents back (vec4 per agent). */
  async readAgents(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.agents, this.n * 16));
  }

  /** Test hook: sort keys and the counting sort's result for the current agents. */
  async sortSnapshot(): Promise<{ keys: Uint32Array; cellStart: Uint32Array; order: Uint32Array; keyCount: number }> {
    const enc = this.device.createCommandEncoder({ label: "phys-sort-snapshot" });
    const pass = enc.beginComputePass();
    pass.setBindGroup(0, this.paramsBG);
    pass.setPipeline(this.k.keys);
    pass.setBindGroup(1, this.keysBG[this.a]!);
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    this.sort.encode(pass, this.keys);
    pass.end();
    this.device.queue.submit([enc.finish()]);
    const [keys, cellStart, order] = await Promise.all([
      readBuffer(this.device, this.keys, this.n * 4),
      readBuffer(this.device, this.sort.cellStart, (this.sort.keyCount + 1) * 4),
      readBuffer(this.device, this.sort.order, this.n * 4),
    ]);
    return { keys: new Uint32Array(keys), cellStart: new Uint32Array(cellStart), order: new Uint32Array(order), keyCount: this.sort.keyCount };
  }

  destroy(): void {
    for (const b of [...this.agentBufs, ...this.trailBufs, ...this.depBufs, this.keys, this.uniform, this.seedUniform]) b.destroy();
    this.sort.destroy();
  }
}
