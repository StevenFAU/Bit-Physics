// Swarm — the live flock on the GPU: the frozen v4 kernel (./kernel.ts) on
// ping-pong boid buffers, the shared CountingSort as its broadphase (or the
// brute-force oracle), the exact integer order-parameter reduction, trajectory
// and φ-series hashes (v4 hashRun / hashOrderRun), and GPU checkpoints for
// save / restore / compare.
//
// One step = (sort) cellKeys → CountingSort → simSort, or (brute) main; each
// step reads its own Params slot, written exactly as v4 writeParams writes it
// (./params.ts) with that step's frame seed, so k steps can share one compute
// pass. Nothing here depends on the order of agents inside a sort bucket.

import { CountingSort, readBuffer } from "@bp/gpu";
import type { BrainParams } from "./brains.js";
import { BRAIN_BYTES, WGSL_BRAINS, WGSL_TORUS_REDUCE, reach, writeBrainParams } from "./brains.js";
import { NO_WATCH, RETINA_HEADER, SPECIES_BYTES, VISION_BYTES, WGSL_SPECIES, WGSL_VISION, visionTable, writeM3Params } from "./brains-m3.js";
import type { InitMode } from "./init.js";
import { BOID_BYTES, makeInitData } from "./init.js";
import type { M1Init } from "./init-m1.js";
import { isM1Init, makeInitM1 } from "./init-m1.js";
import type { M3Init } from "./init-m3.js";
import { isM3Init, makeInitM3 } from "./init-m3.js";
import { WGSL_COMPUTE, WGSL_GATHER, WGSL_REDUCE, WGSL_SORT_V2 } from "./kernel.js";
import type { FearTerm, Grid, RuleParams } from "./params.js";
import { PARAM_BYTES, PARAM_FLOATS, gridFor, writeParams } from "./params.js";

export type Broadphase = "sort" | "brute";

/** Steps one frame may encode (each needs its own Params slot). */
export const MAX_STEPS_PER_PASS = 16;
/** Params slot stride: 336 bytes rounded up to the uniform offset alignment. */
const SLOT = 512;
/** Brute force is O(n²): never above this (v4 D-5 allowed ≤ 16k). */
export const BRUTE_MAX = 16384;

const C = (): number => GPUShaderStage.COMPUTE;
const STORAGE = (): number => GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

/** Pipelines shared by every Flock on a device (compiled once). */
export class FlockKernels {
  private constructor(
    readonly simLayout: GPUBindGroupLayout,
    readonly bruteLayout: GPUBindGroupLayout,
    readonly keysLayout: GPUBindGroupLayout,
    readonly reduceLayout: GPUBindGroupLayout,
    readonly gatherLayout: GPUBindGroupLayout,
    readonly brute: GPUComputePipeline,
    readonly cellKeys: GPUComputePipeline,
    readonly simSort: GPUComputePipeline,
    readonly reduceOrder: GPUComputePipeline,
    readonly finalizeCom: GPUComputePipeline,
    readonly gather: GPUComputePipeline,
    readonly brainSimLayout: GPUBindGroupLayout,
    readonly brainBruteLayout: GPUBindGroupLayout,
    readonly brainKeysLayout: GPUBindGroupLayout,
    readonly torusLayout: GPUBindGroupLayout,
    readonly brainKeys: GPUComputePipeline,
    readonly vicsekSort: GPUComputePipeline,
    readonly vicsekBrute: GPUComputePipeline,
    readonly couzinSort: GPUComputePipeline,
    readonly couzinBrute: GPUComputePipeline,
    readonly circleSums: GPUComputePipeline,
    readonly circleCentre: GPUComputePipeline,
    readonly aboutCentre: GPUComputePipeline,
    readonly speciesLayout: GPUBindGroupLayout,
    readonly visionLayout: GPUBindGroupLayout,
    readonly speciesSort: GPUComputePipeline,
    readonly speciesBrute: GPUComputePipeline,
    readonly visionSort: GPUComputePipeline,
    readonly visionBrute: GPUComputePipeline,
    /** The vision model's bin-boundary sin/cos table (f64-computed), shared by every flock. */
    readonly visionTable: GPUBuffer,
  ) {}

  static async create(device: GPUDevice): Promise<FlockKernels> {
    const buf = (binding: number, type: GPUBufferBindingType, dynamic = false, min = binding === 0 ? PARAM_BYTES : 0): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: C(),
      buffer: { type, hasDynamicOffset: dynamic, minBindingSize: min },
    });
    // the kernel's bindings: 0 P, 1 inB, 2 outB, 3 obs, 4 vortOut, 5 specIn, 6 diagFlags (+ sort: 7 cellStart, 8 order, 9 keys)
    const core = [
      buf(0, "uniform", true),
      buf(1, "read-only-storage"),
      buf(2, "storage"),
      buf(3, "uniform"),
      buf(4, "storage"),
      buf(5, "read-only-storage"),
      buf(6, "storage"),
    ];
    const bruteLayout = device.createBindGroupLayout({ label: "swarm-brute", entries: core });
    const simLayout = device.createBindGroupLayout({
      label: "swarm-sim",
      entries: [...core, buf(7, "read-only-storage"), buf(8, "read-only-storage")],
    });
    const keysLayout = device.createBindGroupLayout({
      label: "swarm-keys",
      entries: [buf(0, "uniform", true), buf(1, "read-only-storage"), buf(9, "storage")],
    });
    const reduceLayout = device.createBindGroupLayout({
      label: "swarm-reduce",
      entries: [buf(0, "uniform"), buf(1, "read-only-storage"), buf(2, "storage"), buf(3, "storage")],
    });
    const gatherLayout = device.createBindGroupLayout({
      label: "swarm-gather",
      entries: [
        buf(0, "read-only-storage"),
        buf(1, "storage"),
        buf(2, "read-only-storage"),
        buf(3, "read-only-storage"),
        buf(4, "storage"),
        buf(5, "read-only-storage"),
        buf(6, "read-only-storage"),
      ],
    });
    // the M1 brains (./brains.ts): 0 B, 1 inB, 2 outB, 3 ids, 4 diag, 5 cellStart, 6 order (+ keys: 7 keys)
    const brainCore = [buf(0, "uniform", true, BRAIN_BYTES), buf(1, "read-only-storage"), buf(2, "storage"), buf(3, "read-only-storage"), buf(4, "storage")];
    const brainBruteLayout = device.createBindGroupLayout({ label: "swarm-brain-brute", entries: brainCore });
    const brainSimLayout = device.createBindGroupLayout({
      label: "swarm-brain-sim",
      entries: [...brainCore, buf(5, "read-only-storage"), buf(6, "read-only-storage")],
    });
    const brainKeysLayout = device.createBindGroupLayout({
      label: "swarm-brain-keys",
      entries: [buf(0, "uniform", true, BRAIN_BYTES), buf(1, "read-only-storage"), buf(7, "storage")],
    });
    // the M3 brains (./brains-m3.ts): the M1 bindings 0–6 with a longer uniform; vision adds 8 (table) and 9 (retina)
    const m3Core = (bytes: number): GPUBindGroupLayoutEntry[] => [
      buf(0, "uniform", true, bytes),
      buf(1, "read-only-storage"),
      buf(2, "storage"),
      buf(3, "read-only-storage"),
      buf(4, "storage"),
      buf(5, "read-only-storage"),
      buf(6, "read-only-storage"),
    ];
    const speciesLayout = device.createBindGroupLayout({ label: "swarm-species", entries: m3Core(SPECIES_BYTES) });
    const visionLayout = device.createBindGroupLayout({
      label: "swarm-vision",
      entries: [...m3Core(VISION_BYTES), buf(8, "uniform", false, 2048), buf(9, "storage")],
    });
    const torusLayout = device.createBindGroupLayout({
      label: "swarm-torus-reduce",
      entries: [buf(0, "uniform", false, 16), buf(1, "read-only-storage"), buf(2, "storage"), buf(3, "storage"), buf(4, "storage")],
    });
    const check = async (m: GPUShaderModule, label: string): Promise<void> => {
      const info = await m.getCompilationInfo();
      const errs = info.messages.filter((x) => x.type === "error");
      if (errs.length) throw new Error(`${label} shader: ${errs.map((e) => `${e.lineNum}:${e.message}`).join(" | ")}`);
    };
    const bruteMod = device.createShaderModule({ code: WGSL_COMPUTE, label: "swarm-brute" });
    const sortMod = device.createShaderModule({ code: WGSL_SORT_V2, label: "swarm-sort" });
    const redMod = device.createShaderModule({ code: WGSL_REDUCE, label: "swarm-reduce" });
    const gatherMod = device.createShaderModule({ code: WGSL_GATHER, label: "swarm-gather" });
    const brainMod = device.createShaderModule({ code: WGSL_BRAINS, label: "swarm-brains" });
    const torusMod = device.createShaderModule({ code: WGSL_TORUS_REDUCE, label: "swarm-torus-reduce" });
    const speciesMod = device.createShaderModule({ code: WGSL_SPECIES, label: "swarm-species" });
    const visionMod = device.createShaderModule({ code: WGSL_VISION, label: "swarm-vision" });
    await Promise.all([
      check(bruteMod, "brute"),
      check(sortMod, "sort"),
      check(redMod, "reduce"),
      check(gatherMod, "gather"),
      check(brainMod, "brains"),
      check(torusMod, "torus reduce"),
      check(speciesMod, "species"),
      check(visionMod, "vision"),
    ]);
    const pl = (l: GPUBindGroupLayout): GPUPipelineLayout => device.createPipelineLayout({ bindGroupLayouts: [l] });
    const mk = (label: string, module: GPUShaderModule, entryPoint: string, l: GPUBindGroupLayout): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({ label, layout: pl(l), compute: { module, entryPoint } });
    const [brute, cellKeys, simSort, reduceOrder, finalizeCom, gather] = await Promise.all([
      mk("swarm-brute", bruteMod, "main", bruteLayout),
      mk("swarm-keys", sortMod, "cellKeys", keysLayout),
      mk("swarm-sim", sortMod, "simSort", simLayout),
      mk("swarm-reduce", redMod, "reduceOrder", reduceLayout),
      mk("swarm-finalize", redMod, "finalizeCom", reduceLayout),
      mk("swarm-gather", gatherMod, "gather", gatherLayout),
    ]);
    const [brainKeys, vicsekSort, vicsekBrute, couzinSort, couzinBrute, circleSums, circleCentre, aboutCentre] = await Promise.all([
      mk("swarm-brain-keys", brainMod, "brainKeys", brainKeysLayout),
      mk("swarm-vicsek", brainMod, "vicsekSort", brainSimLayout),
      mk("swarm-vicsek-brute", brainMod, "vicsekBrute", brainBruteLayout),
      mk("swarm-couzin", brainMod, "couzinSort", brainSimLayout),
      mk("swarm-couzin-brute", brainMod, "couzinBrute", brainBruteLayout),
      mk("swarm-circle-sums", torusMod, "circleSums", torusLayout),
      mk("swarm-circle-centre", torusMod, "circleCentre", torusLayout),
      mk("swarm-about-centre", torusMod, "aboutCentre", torusLayout),
    ]);
    const [speciesSort, speciesBrute, visionSort, visionBrute] = await Promise.all([
      mk("swarm-species", speciesMod, "speciesSort", speciesLayout),
      mk("swarm-species-brute", speciesMod, "speciesBrute", speciesLayout),
      mk("swarm-vision", visionMod, "visionSort", visionLayout),
      mk("swarm-vision-brute", visionMod, "visionBrute", visionLayout),
    ]);
    const table = visionTable();
    const tableBuf = device.createBuffer({ size: table.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-vision-table" });
    device.queue.writeBuffer(tableBuf, 0, table);
    return new FlockKernels(
      simLayout,
      bruteLayout,
      keysLayout,
      reduceLayout,
      gatherLayout,
      brute,
      cellKeys,
      simSort,
      reduceOrder,
      finalizeCom,
      gather,
      brainSimLayout,
      brainBruteLayout,
      brainKeysLayout,
      torusLayout,
      brainKeys,
      vicsekSort,
      vicsekBrute,
      couzinSort,
      couzinBrute,
      circleSums,
      circleCentre,
      aboutCentre,
      speciesLayout,
      visionLayout,
      speciesSort,
      speciesBrute,
      visionSort,
      visionBrute,
      tableBuf,
    );
  }
}

/**
 * An M2 extension riding the flock's steps (Current's water, Food Chain's
 * ecology). Absent, every path is exactly as M1 left it.
 */
export interface FlockExt {
  /** Steps about to be encoded (write per-step uniforms). */
  prepare?(steps: number, tick: number, pure: boolean): void;
  /** Encode the whole step reading boidBufs[c], writing boidBufs[1 − c]; true if it did. */
  step?(pass: GPUComputePassEncoder, s: number, c: number): boolean;
  /** After a step: boidBufs[cur] holds the new state. */
  after?(pass: GPUComputePassEncoder, s: number, cur: number): void;
  reseed?(seed: number): void;
  /** Shape the boids the flock seeds (e.g. empty slots) before they load. */
  shapeInit?(data: Float32Array): void;
  checkpoint?(): unknown;
  restore?(c: unknown): void;
  release?(c: unknown): void;
  destroy(): void;
}

export interface FlockConfig {
  n: number;
  halfW: number;
  halfH: number;
  seed: number;
  rule: RuleParams;
  /** An M1 brain (./brains.ts) in place of the v4 Reynolds rule; absent = Reynolds (the gated kernel). */
  brain?: BrainParams | null;
  /**
   * How the live order parameters are reduced: "v4" (the frozen v4
   * reduction, centre of mass from raw positions) or "torus" (the circular
   * mean, for a single school that may cross the wrapped edge).
   */
  orderReduce?: "v4" | "torus";
  init?: InitMode | M1Init | M3Init;
  broadphase?: Broadphase;
  /**
   * Smallest cohesion radius this flock will be tuned to: the counting sort is
   * sized for the grid at that radius (a coarser grid leaves buckets empty).
   */
  minRCoh?: number;
  /**
   * Move the fish into cell order in memory every this many steps (0 = never;
   * the proofs' flocks never do). Speed only: see WGSL_GATHER.
   */
  sortEvery?: number;
  /** An M2 extension, built once the flock's buffers exist. */
  ext?: (flock: Flock) => FlockExt;
  /** Vision brain: keep every fish's visual field of the last step (the in-page field check). */
  retinaDump?: boolean;
}

export interface Checkpoint {
  boids: GPUBuffer;
  ids: GPUBuffer | null;
  tick: number;
  rule: RuleParams;
  brain: BrainParams | null;
  seed: number;
  /** The extension's own saved state. */
  ext?: unknown;
}

/** Exact integer order-parameter totals for one step (v4 D-9). */
export interface OrderTotals {
  /** Σ unit velocity, units of 2⁻²⁰. */
  vhx: number;
  vhy: number;
  /** Σ (r̂ × v̂) about the current centre of mass, units of 2⁻²⁰. */
  cr: number;
  /** Σ |r − COM|, units of 2⁻¹⁴. */
  rd: number;
  /** Σ ½|v|², units of 2⁻²⁸. */
  ke: number;
  cnt: number;
}

export interface OrderParams {
  /** Polarization φ = |Σ v̂| / N. */
  phi: number;
  /** Milling m = |Σ r̂ × v̂| / N (Tunstrøm O_r about the current centre of mass). */
  mill: number;
  /** Mean distance from the centre of mass (world units). */
  dispersion: number;
  /** Mean kinetic energy per fish, ½|v|². */
  ke: number;
}

const RFV = 1048576;
const RFP = 16384;
const RFK = 268435456;

export function orderParams(t: OrderTotals): OrderParams {
  const n = Math.max(t.cnt, 1);
  return {
    phi: Math.hypot(t.vhx, t.vhy) / RFV / n,
    mill: Math.abs(t.cr) / RFV / n,
    dispersion: t.rd / RFP / n,
    ke: t.ke / RFK / n,
  };
}

/** Sum the per-workgroup i32 partials (10 words each) in exact JS integers. */
export function sumPartials(a: Int32Array, groups: number): OrderTotals {
  let vhx = 0;
  let vhy = 0;
  let cr = 0;
  let rd = 0;
  let ke = 0;
  let cnt = 0;
  for (let w = 0; w < groups; w += 1) {
    const o = w * 10;
    vhx += a[o]!;
    vhy += a[o + 1]!;
    cr += a[o + 4]!;
    rd += a[o + 5]!;
    ke += a[o + 8]!;
    cnt += a[o + 9]! >>> 0;
  }
  return { vhx, vhy, cr, rd, ke, cnt };
}

async function sha256(data: BufferSource): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class Flock {
  readonly n: number;
  readonly halfW: number;
  readonly halfH: number;
  seed: number;
  rule: RuleParams;
  /** The M1 brain, or null for the v4 Reynolds rule. */
  brain: BrainParams | null;
  readonly orderReduce: "v4" | "torus";
  broadphase: Broadphase;
  initMode: InitMode | M1Init | M3Init;
  /** Steps run since the flock was seeded (drives the noise hash, as v4 simStep). */
  tick = 0;
  /** The shark (null = no pointer force, v4 "pure" params). */
  fear: FearTerm | null = null;
  grid: Grid;

  private readonly device: GPUDevice;
  private readonly k: FlockKernels;
  readonly boidBufs: [GPUBuffer, GPUBuffer];
  readonly vort: GPUBuffer;
  private readonly spec: GPUBuffer;
  private readonly diag: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly obs: GPUBuffer;
  private readonly keys: GPUBuffer;
  private readonly sort: CountingSort;
  private readonly partials: GPUBuffer;
  private readonly rg: GPUBuffer;
  readonly groups: number;
  private readonly P = new Float32Array(PARAM_FLOATS);
  private readonly slots = new Float32Array((MAX_STEPS_PER_PASS * SLOT) / 4);
  private readonly simBG: GPUBindGroup[] = [];
  private readonly bruteBG: GPUBindGroup[] = [];
  private readonly keysBG: GPUBindGroup[] = [];
  private readonly reduceBG: GPUBindGroup[] = [];
  /** Which boid buffer holds the current state. */
  private cur = 0;
  /**
   * Which id buffer holds the current fish ids. Ids move only when the ocean is
   * re-sorted (the gather), not on solver steps, so this flips independently of
   * `cur`; bind groups exist for every (cur, idCur) pair.
   */
  private idCur = 0;
  /** Memory reorders: every `sortEvery` steps (0 = never). */
  readonly sortEvery: number;
  reorders = 0;
  /** Fish ids, permuted with the boids by each reorder (null when there are none). */
  readonly idBufs: [GPUBuffer, GPUBuffer] | null;
  private readonly gatherBG: GPUBindGroup[] = [];
  private readonly brainSimBG: GPUBindGroup[] = [];
  private readonly brainBruteBG: GPUBindGroup[] = [];
  private readonly brainKeysBG: GPUBindGroup[] = [];
  private readonly torusBG: GPUBindGroup[] = [];
  private readonly torusParams: GPUBuffer | null = null;
  private readonly torusCentre: GPUBuffer | null = null;
  private readonly torusCirc: GPUBuffer | null = null;
  /** The M2 extension (null for every M0/M1 scene). */
  ext: FlockExt | null = null;
  /** M3 brains' bind groups, one per (boid buffer, id buffer) pair. */
  private readonly m3BG: GPUBindGroup[] = [];
  /** Vision: the watched fish's visual field (and, with retinaDump, every fish's). */
  readonly retina: GPUBuffer | null = null;
  readonly retinaDump: boolean;
  /** Vision: the fish id whose field the kernel records (NO_WATCH = none). */
  watchId = NO_WATCH;

  constructor(device: GPUDevice, kernels: FlockKernels, cfg: FlockConfig) {
    this.device = device;
    this.k = kernels;
    this.n = cfg.n;
    this.halfW = cfg.halfW;
    this.halfH = cfg.halfH;
    this.seed = cfg.seed;
    this.rule = { ...cfg.rule };
    this.broadphase = cfg.broadphase ?? "sort";
    this.initMode = cfg.init ?? "random";
    this.brain = cfg.brain ? structuredClone(cfg.brain) : null;
    this.orderReduce = cfg.orderReduce ?? "v4";
    this.retinaDump = !!cfg.retinaDump;
    const r0 = this.brain ? reach(this.brain) : this.rule.rCoh;
    this.grid = gridFor(this.halfW, this.halfH, r0);
    const maxGrid = gridFor(this.halfW, this.halfH, Math.min(cfg.minRCoh ?? r0, r0));
    const n = cfg.n;
    // exact sizes: the kernel reads arrayLength(&inB)
    this.boidBufs = [0, 1].map((i) => device.createBuffer({ size: n * BOID_BYTES, usage: STORAGE(), label: `swarm-boids-${i}` })) as [
      GPUBuffer,
      GPUBuffer,
    ];
    this.vort = device.createBuffer({ size: Math.max(4, n * 4), usage: STORAGE(), label: "swarm-vort" });
    this.spec = device.createBuffer({ size: Math.max(4, n * 4), usage: STORAGE(), label: "swarm-species" });
    this.diag = device.createBuffer({ size: 16, usage: STORAGE(), label: "swarm-diag" });
    this.keys = device.createBuffer({ size: Math.max(16, n * 4), usage: STORAGE(), label: "swarm-keys" });
    this.params = device.createBuffer({
      size: MAX_STEPS_PER_PASS * SLOT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "swarm-params",
    });
    this.obs = device.createBuffer({ size: 512, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-obstacles" });
    this.sort = new CountingSort(device, { maxItems: n, keyCount: maxGrid.cols * maxGrid.rows, label: "swarm-sort" });
    this.groups = Math.max(1, Math.ceil(n / 256));
    this.partials = device.createBuffer({ size: this.groups * 40, usage: STORAGE(), label: "swarm-partials" });
    this.rg = device.createBuffer({ size: 16, usage: STORAGE(), label: "swarm-com" });
    this.sortEvery = Math.max(0, Math.floor(cfg.sortEvery ?? 0));
    this.idBufs =
      this.sortEvery > 0 || this.brain
        ? ([0, 1].map((i) => device.createBuffer({ size: Math.max(16, n * 4), usage: STORAGE(), label: `swarm-ids-${i}` })) as [GPUBuffer, GPUBuffer])
        : null;
    // species ids: one species (v4 makeSpeciesData returns zeros for NS = 1); no obstacles
    device.queue.writeBuffer(this.spec, 0, new Uint32Array(Math.max(1, n)));
    device.queue.writeBuffer(this.obs, 0, new Float32Array(128));

    const P0 = { buffer: this.params, offset: 0, size: PARAM_BYTES };
    const B0 = { buffer: this.params, offset: 0, size: BRAIN_BYTES };
    if (this.orderReduce === "torus") {
      this.torusParams = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-torus-params" });
      this.torusCentre = device.createBuffer({ size: 16, usage: STORAGE(), label: "swarm-torus-centre" });
      this.torusCirc = device.createBuffer({ size: this.groups * 16, usage: STORAGE(), label: "swarm-torus-circle" });
      device.queue.writeBuffer(this.torusParams, 0, new Float32Array([this.halfW, this.halfH, 0, 0]));
    }
    for (let c = 0; c < 2; c += 1) {
      const inB = this.boidBufs[c]!;
      const outB = this.boidBufs[1 - c]!;
      const core: GPUBindGroupEntry[] = [
        { binding: 0, resource: P0 },
        { binding: 1, resource: { buffer: inB } },
        { binding: 2, resource: { buffer: outB } },
        { binding: 3, resource: { buffer: this.obs } },
        { binding: 4, resource: { buffer: this.vort } },
        { binding: 5, resource: { buffer: this.spec } },
        { binding: 6, resource: { buffer: this.diag } },
      ];
      this.bruteBG.push(device.createBindGroup({ layout: kernels.bruteLayout, label: `swarm-brute-${c}`, entries: core }));
      this.simBG.push(
        device.createBindGroup({
          layout: kernels.simLayout,
          label: `swarm-sim-${c}`,
          entries: [...core, { binding: 7, resource: { buffer: this.sort.cellStart } }, { binding: 8, resource: { buffer: this.sort.order } }],
        }),
      );
      this.keysBG.push(
        device.createBindGroup({
          layout: kernels.keysLayout,
          label: `swarm-keys-${c}`,
          entries: [
            { binding: 0, resource: P0 },
            { binding: 1, resource: { buffer: inB } },
            { binding: 9, resource: { buffer: this.keys } },
          ],
        }),
      );
      this.reduceBG.push(
        device.createBindGroup({
          layout: kernels.reduceLayout,
          label: `swarm-reduce-${c}`,
          entries: [
            { binding: 0, resource: P0 },
            { binding: 1, resource: { buffer: inB } },
            { binding: 2, resource: { buffer: this.partials } },
            { binding: 3, resource: { buffer: this.rg } },
          ],
        }),
      );
      const m3 = this.brain?.kind === "species" || this.brain?.kind === "vision";
      if (this.brain && this.idBufs && m3) {
        const vision = this.brain.kind === "vision";
        if (vision && !this.retina) {
          (this as { retina: GPUBuffer | null }).retina = device.createBuffer({
            size: (RETINA_HEADER + (this.retinaDump ? n * 8 : 0)) * 4,
            usage: STORAGE(),
            label: "swarm-retina",
          });
        }
        for (let k = 0; k < 2; k += 1) {
          const entries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: this.params, offset: 0, size: vision ? VISION_BYTES : SPECIES_BYTES } },
            { binding: 1, resource: { buffer: inB } },
            { binding: 2, resource: { buffer: outB } },
            { binding: 3, resource: { buffer: this.idBufs[k]! } },
            { binding: 4, resource: { buffer: this.diag } },
            { binding: 5, resource: { buffer: this.sort.cellStart } },
            { binding: 6, resource: { buffer: this.sort.order } },
            ...(vision ? [{ binding: 8, resource: { buffer: kernels.visionTable } }, { binding: 9, resource: { buffer: this.retina! } }] : []),
          ];
          this.m3BG.push(device.createBindGroup({ layout: vision ? kernels.visionLayout : kernels.speciesLayout, label: `swarm-m3-${c}${k}`, entries }));
        }
      }
      if (this.brain && this.idBufs) {
        for (let k = 0; k < 2 && !m3; k += 1) {
          const bcore: GPUBindGroupEntry[] = [
            { binding: 0, resource: B0 },
            { binding: 1, resource: { buffer: inB } },
            { binding: 2, resource: { buffer: outB } },
            { binding: 3, resource: { buffer: this.idBufs[k]! } },
            { binding: 4, resource: { buffer: this.diag } },
          ];
          this.brainBruteBG.push(device.createBindGroup({ layout: kernels.brainBruteLayout, label: `swarm-brain-brute-${c}${k}`, entries: bcore }));
          this.brainSimBG.push(
            device.createBindGroup({
              layout: kernels.brainSimLayout,
              label: `swarm-brain-sim-${c}${k}`,
              entries: [...bcore, { binding: 5, resource: { buffer: this.sort.cellStart } }, { binding: 6, resource: { buffer: this.sort.order } }],
            }),
          );
        }
        this.brainKeysBG.push(
          device.createBindGroup({
            layout: kernels.brainKeysLayout,
            label: `swarm-brain-keys-${c}`,
            entries: [
              { binding: 0, resource: B0 },
              { binding: 1, resource: { buffer: inB } },
              { binding: 7, resource: { buffer: this.keys } },
            ],
          }),
        );
      }
      if (this.torusParams && this.torusCentre && this.torusCirc) {
        this.torusBG.push(
          device.createBindGroup({
            layout: kernels.torusLayout,
            label: `swarm-torus-${c}`,
            entries: [
              { binding: 0, resource: { buffer: this.torusParams } },
              { binding: 1, resource: { buffer: inB } },
              { binding: 2, resource: { buffer: this.partials } },
              { binding: 3, resource: { buffer: this.torusCentre } },
              { binding: 4, resource: { buffer: this.torusCirc } },
            ],
          }),
        );
      }
      if (this.idBufs) {
        for (let k = 0; k < 2; k += 1) {
          this.gatherBG.push(
            device.createBindGroup({
              layout: kernels.gatherLayout,
              label: `swarm-gather-${c}${k}`,
              entries: [
                { binding: 0, resource: { buffer: inB } },
                { binding: 1, resource: { buffer: outB } },
                { binding: 2, resource: { buffer: this.sort.order } },
                { binding: 3, resource: { buffer: this.idBufs[k]! } },
                { binding: 4, resource: { buffer: this.idBufs[1 - k]! } },
                { binding: 5, resource: { buffer: this.keys } },
                { binding: 6, resource: { buffer: this.sort.cellStart } },
              ],
            }),
          );
        }
      }
    }
    this.reseed(cfg.seed);
    if (cfg.ext) {
      this.ext = cfg.ext(this);
      if (this.ext.shapeInit) this.reseed(cfg.seed);
      else this.ext.reseed?.(cfg.seed);
    }
  }

  /** The current boid buffer (stride 24 bytes: pos.xy, vel.xy, align, dens). */
  get boids(): GPUBuffer {
    return this.boidBufs[this.cur]!;
  }

  /** The current fish ids (slot → fish), or null when the flock never reorders. */
  get ids(): GPUBuffer | null {
    return this.idBufs ? this.idBufs[this.idCur]! : null;
  }

  get bytes(): number {
    return this.n * BOID_BYTES;
  }

  get keyCount(): number {
    return this.sort.keyCount;
  }

  /** Fresh flock from (seed, init mode) — v4 reseed: tick 0, saturation flag cleared. */
  reseed(seed: number, mode: InitMode | M1Init | M3Init = this.initMode): void {
    this.seed = seed;
    this.initMode = mode;
    const speed = this.brain ? this.brain.p.speed : this.rule.maxSpeed;
    const data = isM3Init(mode)
      ? makeInitM3(this.n, seed, this.halfW, this.halfH, this.brain!, mode)
      : isM1Init(mode)
        ? makeInitM1(this.n, seed, this.halfW, this.halfH, speed, mode)
        : makeInitData(this.n, seed, this.halfW, this.halfH, speed, mode);
    this.ext?.shapeInit?.(data);
    this.load(data);
    this.ext?.reseed?.(seed);
  }

  /** Load boids (6 f32 each) and restart the step count. */
  load(data: Float32Array<ArrayBuffer>): void {
    if (data.length !== this.n * 6) throw new Error(`boids: ${data.length / 6} given, flock holds ${this.n}`);
    this.device.queue.writeBuffer(this.boidBufs[0], 0, data);
    this.device.queue.writeBuffer(this.diag, 0, new Uint32Array(4));
    this.device.queue.writeBuffer(this.rg, 0, new Float32Array(4));
    if (this.idBufs) this.device.queue.writeBuffer(this.idBufs[0], 0, Uint32Array.from({ length: this.n }, (_, i) => i));
    this.cur = 0;
    this.idCur = 0;
    this.tick = 0;
    this.reorders = 0;
  }

  setRule(r: RuleParams): void {
    this.rule = { ...r };
    if (this.brain) return;
    const g = gridFor(this.halfW, this.halfH, r.rCoh);
    // a radius below the one the sort was sized for would need more buckets than it has
    this.grid = g.cols * g.rows <= this.sort.keyCount ? g : gridFor(this.halfW, this.halfH, r.rCoh, this.sort.keyCount);
  }

  /** Change the M1 brain's parameters (and the grid, if the reach changed). */
  setBrain(b: BrainParams): void {
    if (!this.brain || b.kind !== this.brain.kind) throw new Error(`this flock runs ${this.brain?.kind ?? "reynolds"}, not ${b.kind}`);
    this.brain = structuredClone(b);
    const g = gridFor(this.halfW, this.halfH, reach(b));
    this.grid = g.cols * g.rows <= this.sort.keyCount ? g : gridFor(this.halfW, this.halfH, reach(b), this.sort.keyCount);
  }

  /** Write the Params slots for the next `steps` steps (step t uses frame seed (seed ^ t)). */
  private writeSlots(steps: number, pure: boolean): void {
    this.ext?.prepare?.(steps, this.tick, pure);
    const b3 = this.brain?.kind === "species" || this.brain?.kind === "vision" ? this.brain : null;
    if (b3) {
      const ab = this.slots.buffer;
      for (let s = 0; s < steps; s += 1) {
        writeM3Params(ab, s * SLOT, {
          brain: b3,
          halfW: this.halfW,
          halfH: this.halfH,
          cols: this.grid.cols,
          rows: this.grid.rows,
          cellX: this.grid.cellX,
          cellY: this.grid.cellY,
          seed: this.seed,
          step: this.tick + s,
          n: this.n,
          fear: null,
          watch: this.watchId,
          dumpAll: this.retinaDump,
        });
      }
      const bytes = b3.kind === "vision" ? VISION_BYTES : SPECIES_BYTES;
      this.device.queue.writeBuffer(this.params, 0, this.slots, 0, ((steps - 1) * SLOT) / 4 + bytes / 4);
      return;
    }
    if (this.brain) {
      const ab = this.slots.buffer;
      const f = this.fear;
      for (let s = 0; s < steps; s += 1) {
        writeBrainParams(ab, s * SLOT, {
          brain: this.brain,
          halfW: this.halfW,
          halfH: this.halfH,
          cols: this.grid.cols,
          rows: this.grid.rows,
          cellX: this.grid.cellX,
          cellY: this.grid.cellY,
          seed: this.seed,
          step: this.tick + s,
          n: this.n,
          fear: pure || !f ? null : f,
        });
      }
      this.device.queue.writeBuffer(this.params, 0, this.slots, 0, ((steps - 1) * SLOT) / 4 + BRAIN_BYTES / 4);
      return;
    }
    for (let s = 0; s < steps; s += 1) {
      writeParams(this.P, {
        rule: this.rule,
        halfW: this.halfW,
        halfH: this.halfH,
        seed: this.seed,
        step: this.tick + s,
        n: this.n,
        grid: this.grid,
        fear: pure ? null : this.fear,
      });
      this.slots.set(this.P, (s * SLOT) / 4);
    }
    this.device.queue.writeBuffer(this.params, 0, this.slots, 0, ((steps - 1) * SLOT) / 4 + PARAM_FLOATS);
  }

  /** Record one step into an open pass using Params slot `s`. */
  private encodeOne(pass: GPUComputePassEncoder, s: number): void {
    const off = [s * SLOT];
    const c = this.cur;
    if (this.ext?.step?.(pass, s, c)) {
      this.cur = 1 - c;
      this.ext.after?.(pass, s, this.cur);
      return;
    }
    if (this.brain && (this.brain.kind === "species" || this.brain.kind === "vision")) {
      const vision = this.brain.kind === "vision";
      const bg = this.m3BG[c * 2 + this.idCur]!;
      if (this.broadphase === "brute") {
        if (this.n > BRUTE_MAX) throw new Error(`brute force is limited to ${BRUTE_MAX} agents`);
        pass.setPipeline(vision ? this.k.visionBrute : this.k.speciesBrute);
        pass.setBindGroup(0, bg, off);
        pass.dispatchWorkgroups(Math.ceil(this.n / 64));
      } else {
        this.encodeKeys(pass, s);
        pass.setPipeline(vision ? this.k.visionSort : this.k.speciesSort);
        pass.setBindGroup(0, bg, off);
        pass.dispatchWorkgroups(Math.ceil(this.n / 256));
      }
      this.cur = 1 - c;
      this.ext?.after?.(pass, s, this.cur);
      return;
    }
    if (this.brain) {
      const vic = this.brain.kind === "vicsek";
      if (this.broadphase === "brute") {
        if (this.n > BRUTE_MAX) throw new Error(`brute force is limited to ${BRUTE_MAX} agents`);
        pass.setPipeline(vic ? this.k.vicsekBrute : this.k.couzinBrute);
        pass.setBindGroup(0, this.brainBruteBG[c * 2 + this.idCur]!, off);
        pass.dispatchWorkgroups(Math.ceil(this.n / 64));
      } else {
        this.encodeKeys(pass, s);
        pass.setPipeline(vic ? this.k.vicsekSort : this.k.couzinSort);
        pass.setBindGroup(0, this.brainSimBG[c * 2 + this.idCur]!, off);
        pass.dispatchWorkgroups(Math.ceil(this.n / 256));
      }
      this.cur = 1 - c;
      this.ext?.after?.(pass, s, this.cur);
      return;
    }
    if (this.broadphase === "brute") {
      if (this.n > BRUTE_MAX) throw new Error(`brute force is limited to ${BRUTE_MAX} agents`);
      pass.setPipeline(this.k.brute);
      pass.setBindGroup(0, this.bruteBG[c]!, off);
      pass.dispatchWorkgroups(Math.ceil(this.n / 64));
    } else {
      pass.setPipeline(this.k.cellKeys);
      pass.setBindGroup(0, this.keysBG[c]!, off);
      pass.dispatchWorkgroups(Math.ceil(this.n / 256));
      this.sort.encode(pass, this.keys);
      pass.setPipeline(this.k.simSort);
      pass.setBindGroup(0, this.simBG[c]!, off);
      pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    }
    this.cur = 1 - c;
    this.ext?.after?.(pass, s, this.cur);
  }

  /** Cell keys for the current state, then the counting sort (Params slot `s` holds the grid). */
  private encodeKeys(pass: GPUComputePassEncoder, s: number): void {
    const c = this.cur;
    if (this.brain) {
      pass.setPipeline(this.k.brainKeys);
      pass.setBindGroup(0, this.brainKeysBG[c]!, [s * SLOT]);
    } else {
      pass.setPipeline(this.k.cellKeys);
      pass.setBindGroup(0, this.keysBG[c]!, [s * SLOT]);
    }
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    this.sort.encode(pass, this.keys);
  }

  /** Move the current fish into cell order in memory (keys → sort → gather), using Params slot `s`. */
  private encodeReorder(pass: GPUComputePassEncoder, s: number): void {
    const c = this.cur;
    this.encodeKeys(pass, s);
    pass.setPipeline(this.k.gather);
    pass.setBindGroup(0, this.gatherBG[c * 2 + this.idCur]!);
    pass.dispatchWorkgroups(Math.ceil(this.n / 256));
    this.cur = 1 - c;
    this.idCur = 1 - this.idCur;
    this.reorders += 1;
  }

  /**
   * Record `steps` solver steps into `enc` (one compute pass; at most
   * MAX_STEPS_PER_PASS). `pure` drops the shark, as v4 writeParams(true).
   */
  encodeSteps(enc: GPUCommandEncoder, steps: number, opts: { pure?: boolean; timestampWrites?: GPUComputePassTimestampWrites } = {}): void {
    if (steps <= 0) return;
    if (steps > MAX_STEPS_PER_PASS) throw new Error(`at most ${MAX_STEPS_PER_PASS} steps per pass`);
    this.writeSlots(steps, opts.pure ?? false);
    const pass = enc.beginComputePass({ label: "swarm-sim", timestampWrites: opts.timestampWrites });
    for (let s = 0; s < steps; s += 1) {
      this.encodeOne(pass, s);
      if (this.sortEvery > 0 && this.broadphase === "sort" && (this.tick + s + 1) % this.sortEvery === 0) this.encodeReorder(pass, s);
    }
    pass.end();
    this.tick += steps;
  }

  /** Record the exact order-parameter reduction of the current state (v4 encodeCurrentComReduction). */
  encodeReduce(enc: GPUCommandEncoder, timestampWrites?: GPUComputePassTimestampWrites): void {
    if (this.orderReduce === "torus") {
      const tp = enc.beginComputePass({ label: "swarm-torus-reduce", timestampWrites });
      tp.setBindGroup(0, this.torusBG[this.cur]!);
      tp.setPipeline(this.k.circleSums);
      tp.dispatchWorkgroups(this.groups);
      tp.setPipeline(this.k.circleCentre);
      tp.dispatchWorkgroups(1);
      tp.setPipeline(this.k.aboutCentre);
      tp.dispatchWorkgroups(this.groups);
      tp.end();
      return;
    }
    const pass = enc.beginComputePass({ label: "swarm-reduce", timestampWrites });
    const bg = this.reduceBG[this.cur]!;
    pass.setBindGroup(0, bg);
    pass.setPipeline(this.k.reduceOrder);
    pass.dispatchWorkgroups(this.groups);
    pass.setPipeline(this.k.finalizeCom);
    pass.dispatchWorkgroups(1);
    pass.setPipeline(this.k.reduceOrder);
    pass.dispatchWorkgroups(this.groups);
    pass.end();
  }

  /** The partials buffer (groups × 10 i32) the last reduction wrote. */
  get partialsBuffer(): GPUBuffer {
    return this.partials;
  }

  async readBoids(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.boids, this.bytes));
  }

  /** Order parameters of the current state, read back now (exact integer sums). */
  async readOrder(): Promise<OrderParams> {
    const enc = this.device.createCommandEncoder({ label: "swarm-order" });
    this.encodeReduce(enc);
    this.device.queue.submit([enc.finish()]);
    const a = new Int32Array(await readBuffer(this.device, this.partials, this.groups * 40));
    return orderParams(sumPartials(a, this.groups));
  }

  /** v4 D-6: was any fixed-point neighbour sum near i32 saturation since the last reseed? */
  async readSaturated(): Promise<boolean> {
    const u = new Uint32Array(await readBuffer(this.device, this.diag, 4));
    return (u[0]! & 1) !== 0;
  }

  /**
   * v4 hashRun: advance `steps` steps with pure params (no shark), reading the
   * full pos + vel of every agent back after each step, and SHA-256 the whole
   * trajectory. Same dispatch sequence as the live frames. Caller reseeds first.
   */
  async hashRun(steps: number): Promise<{ hash: string; nan: number; steps: number; n: number; broadphase: Broadphase }> {
    const traj = new Uint8Array(steps * this.n * 16);
    let off = 0;
    let nan = 0;
    for (let s = 0; s < steps; s += 1) {
      const enc = this.device.createCommandEncoder({ label: "swarm-hash" });
      this.encodeSteps(enc, 1, { pure: true });
      const stg = this.device.createBuffer({ size: this.bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      enc.copyBufferToBuffer(this.boids, 0, stg, 0, this.bytes);
      this.device.queue.submit([enc.finish()]);
      await stg.mapAsync(GPUMapMode.READ);
      const fa = new Float32Array(stg.getMappedRange().slice(0));
      stg.unmap();
      stg.destroy();
      const dv = new Float32Array(this.n * 4);
      for (let i = 0; i < this.n; i += 1) {
        const x = fa[i * 6]!;
        const y = fa[i * 6 + 1]!;
        const vx = fa[i * 6 + 2]!;
        const vy = fa[i * 6 + 3]!;
        if (!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(vx) && Number.isFinite(vy))) nan += 1;
        dv[i * 4] = x;
        dv[i * 4 + 1] = y;
        dv[i * 4 + 2] = vx;
        dv[i * 4 + 3] = vy;
      }
      traj.set(new Uint8Array(dv.buffer), off);
      off += this.n * 16;
    }
    return { hash: await sha256(traj), nan, steps, n: this.n, broadphase: this.broadphase };
  }

  /**
   * v4 hashOrderRun: the scalable evidence at a million agents — advance with
   * pure params and SHA-256 the exact integer totals (Σ v̂ₓ, Σ v̂ᵧ, Σ r̂ × v̂)
   * of every step. Caller reseeds first.
   */
  async hashOrderRun(steps: number): Promise<{ hash: string; steps: number; n: number; broadphase: Broadphase; phi: number[] }> {
    const series = new BigInt64Array(steps * 3);
    const phi: number[] = [];
    for (let s = 0; s < steps; s += 1) {
      const enc = this.device.createCommandEncoder({ label: "swarm-order-hash" });
      this.encodeSteps(enc, 1, { pure: true });
      this.encodeReduce(enc);
      const stg = this.device.createBuffer({ size: this.groups * 40, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      enc.copyBufferToBuffer(this.partials, 0, stg, 0, this.groups * 40);
      this.device.queue.submit([enc.finish()]);
      await stg.mapAsync(GPUMapMode.READ);
      const a = new Int32Array(stg.getMappedRange().slice(0));
      stg.unmap();
      stg.destroy();
      const t = sumPartials(a, this.groups);
      series[s * 3] = BigInt(t.vhx);
      series[s * 3 + 1] = BigInt(t.vhy);
      series[s * 3 + 2] = BigInt(t.cr);
      phi.push(orderParams(t).phi);
    }
    return { hash: await sha256(series.buffer), steps, n: this.n, broadphase: this.broadphase, phi };
  }

  /** Test hook: the cell keys and the counting sort's result for the current state. */
  async sortSnapshot(): Promise<{ keys: Uint32Array; cellStart: Uint32Array; order: Uint32Array; keyCount: number; cells: number }> {
    this.writeSlots(1, true);
    const enc = this.device.createCommandEncoder({ label: "swarm-sort-snapshot" });
    const pass = enc.beginComputePass();
    this.encodeKeys(pass, 0);
    pass.end();
    this.device.queue.submit([enc.finish()]);
    const [keys, cellStart, order] = await Promise.all([
      readBuffer(this.device, this.keys, this.n * 4),
      readBuffer(this.device, this.sort.cellStart, (this.sort.keyCount + 1) * 4),
      readBuffer(this.device, this.sort.order, this.n * 4),
    ]);
    return {
      keys: new Uint32Array(keys),
      cellStart: new Uint32Array(cellStart),
      order: new Uint32Array(order),
      keyCount: this.sort.keyCount,
      cells: this.grid.cols * this.grid.rows,
    };
  }

  checkpoint(): Checkpoint {
    const boids = this.device.createBuffer({ size: this.bytes, usage: STORAGE(), label: "swarm-checkpoint" });
    const ids = this.idBufs ? this.device.createBuffer({ size: Math.max(16, this.n * 4), usage: STORAGE(), label: "swarm-checkpoint-ids" }) : null;
    const enc = this.device.createCommandEncoder({ label: "swarm-checkpoint" });
    enc.copyBufferToBuffer(this.boids, 0, boids, 0, this.bytes);
    if (ids && this.ids) enc.copyBufferToBuffer(this.ids, 0, ids, 0, this.n * 4);
    this.device.queue.submit([enc.finish()]);
    return { boids, ids, tick: this.tick, rule: { ...this.rule }, brain: this.brain ? structuredClone(this.brain) : null, seed: this.seed, ext: this.ext?.checkpoint?.() };
  }

  restore(c: Checkpoint): void {
    const enc = this.device.createCommandEncoder({ label: "swarm-restore" });
    enc.copyBufferToBuffer(c.boids, 0, this.boidBufs[0], 0, this.bytes);
    if (c.ids && this.idBufs) enc.copyBufferToBuffer(c.ids, 0, this.idBufs[0], 0, this.n * 4);
    this.device.queue.submit([enc.finish()]);
    this.cur = 0;
    this.idCur = 0;
    this.tick = c.tick;
    this.seed = c.seed;
    this.setRule(c.rule);
    if (c.brain && this.brain) this.setBrain(c.brain);
    if (c.ext !== undefined) this.ext?.restore?.(c.ext);
  }

  release(c: Checkpoint): void {
    c.boids.destroy();
    c.ids?.destroy();
    if (c.ext !== undefined) this.ext?.release?.(c.ext);
  }

  /** The current fish ids (slot → fish); identity when the flock never reorders. */
  async readIds(): Promise<Uint32Array> {
    if (!this.ids) return Uint32Array.from({ length: this.n }, (_, i) => i);
    return new Uint32Array(await readBuffer(this.device, this.ids, this.n * 4));
  }

  destroy(): void {
    for (const b of [...this.boidBufs, ...(this.idBufs ?? []), this.vort, this.spec, this.diag, this.keys, this.params, this.obs, this.partials, this.rg]) b.destroy();
    this.torusParams?.destroy();
    this.retina?.destroy();
    this.torusCentre?.destroy();
    this.torusCirc?.destroy();
    this.sort.destroy();
    this.ext?.destroy();
  }
}
