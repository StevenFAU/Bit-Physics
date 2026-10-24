// Slime Mould — the live simulation: buffers, one step = two dispatches
// (agents, fused deposit/diffuse), a counting-sort reorder every few steps,
// GPU seeding, and checkpoints (GPU copies) for save / restore / compare.
//
// Scenes add, behind flags the gated arithmetic leaves off (live-common.wgsl):
// an environment the agents sense (food scent, light, walls), food crumbs
// that deposit into the trail, and growing colonies whose dormant agents wake
// on contact. The mass balance stays exact through all of it: food deposits
// are whole fixed-point numbers, and a growing colony's awake count is
// logged on the GPU step by step and folded into the f64 prediction.

import { CountingSort, readBuffer, wgsl } from "@bp/gpu";
import commonSrc from "./live-common.wgsl?raw";
import agentsSrc from "./live-agents.wgsl?raw";
import diffuseSrc from "./live-diffuse.wgsl?raw";
import sortSrc from "./live-sort.wgsl?raw";
import gatherSrc from "./live-gather.wgsl?raw";
import seedSrc from "./live-seed.wgsl?raw";
import foodSrc from "./live-food.wgsl?raw";
import envSrc from "./live-env.wgsl?raw";
import logSrc from "./live-log.wgsl?raw";
import type { JonesParams } from "../proof/gate.js";
import { TILE_SHIFT } from "./grid.js";

const LOCAL = { "physarum/live-common": commonSrc };
const U = (): typeof GPUBufferUsage => GPUBufferUsage;

/** Steps of awake counts the GPU ring holds (live-log.wgsl RING); fold at least this often. */
export const AWAKE_RING = 16384;

export interface SeedSpec {
  /** 0 whole dish, 1 disc, 2 ring, 3 whole dish but dormant outside the disc (a growing colony). */
  mode: 0 | 1 | 2 | 3;
  seed: number;
  /** Disc / ring centre and radius, in cells. */
  centre?: [number, number];
  radius?: number;
  /** Heading jitter about outward, radians. */
  spread?: number;
  /** Mode 3: a dormant agent wakes when the trail under it reaches this many agents' deposits. */
  wake?: number;
}

/** Food's halo (cells beyond a crumb's edge) in which dormant agents never wake. */
export const FOOD_HALO = 8;

/** A food crumb or a light, in cells. */
export interface Spot {
  x: number;
  y: number;
  r: number;
}

/**
 * A scene's environment (cells). Strengths are in units of the trail's mean
 * at balance, d·ρ·(1−α)/α, so they mean the same at any deposit, fade or tier.
 */
export interface EnvSpec {
  food: Spot[];
  lights: Spot[];
  /** Wall cells, one bit per cell (row-major), or null. */
  walls: Uint32Array | null;
  /** Each crumb cell deposits this many agents' worth of trail per step. */
  foodDeposit: number;
  /** Scent at a crumb, × the mean trail. */
  scent: number;
  /** Scent length λ, cells. */
  scentRange: number;
  /** Depth of the light's repellent, × the mean trail. */
  light: number;
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

/** One step's terms of the mass recurrence, kept until the awake count for it is read back. */
interface StepTerms {
  perAgent: number;
  keep: number;
  food: number;
}

interface MassState {
  /** The prediction after `foldedTick` steps. */
  mass: number;
  foldedTick: number;
  pending: StepTerms[];
}

export interface Checkpoint {
  agents: GPUBuffer;
  trail: GPUBuffer;
  /** Growing colonies: the awake log (count, step, ring). */
  awake: GPUBuffer | null;
  tick: number;
  params: JonesParams;
  mass: MassState;
  growing: boolean;
  wakeMul: number;
  env: EnvSpec | null;
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
    readonly foodLayout: GPUBindGroupLayout,
    readonly envLayout: GPUBindGroupLayout,
    readonly logLayout: GPUBindGroupLayout,
    readonly agents: GPUComputePipeline,
    readonly diffuse: GPUComputePipeline,
    readonly keys: GPUComputePipeline,
    readonly gather: GPUComputePipeline,
    readonly seed: GPUComputePipeline,
    readonly food: GPUComputePipeline,
    readonly env: GPUComputePipeline,
    readonly log: GPUComputePipeline,
  ) {}

  static async create(device: GPUDevice): Promise<LiveKernels> {
    const C = GPUShaderStage.COMPUTE;
    const buf = (type: GPUBufferBindingType): GPUBindGroupLayoutEntry["buffer"] => ({ type });
    const layout = (label: string, types: GPUBufferBindingType[]): GPUBindGroupLayout =>
      device.createBindGroupLayout({ label, entries: types.map((t, i) => ({ binding: i, visibility: C, buffer: buf(t) })) });
    const ro = "read-only-storage";
    const paramsLayout = layout("phys-params", ["uniform"]);
    const agentsLayout = layout("phys-agents", [ro, "storage", "storage", ro, ro, "storage"]);
    const diffuseLayout = layout("phys-diffuse", [ro, ro, "storage", "storage"]);
    const keysLayout = layout("phys-keys", [ro, "storage"]);
    const gatherLayout = layout("phys-gather", [ro, ro, "storage"]);
    const seedLayout = layout("phys-seed", ["uniform", "storage", "storage"]);
    const foodLayout = layout("phys-food", [ro, "storage"]);
    const envLayout = layout("phys-env", ["uniform", ro, ro, "storage"]);
    const logLayout = layout("phys-log", ["storage"]);
    const mk = (label: string, src: string, entryPoint: string, l: GPUBindGroupLayout): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({
        label,
        layout: device.createPipelineLayout({ bindGroupLayouts: [paramsLayout, l] }),
        compute: { module: device.createShaderModule({ code: wgsl(src, LOCAL), label }), entryPoint },
      });
    const [agents, diffuse, keys, gather, seed, food, env, log] = await Promise.all([
      mk("phys-agents", agentsSrc, "agents_step", agentsLayout),
      mk("phys-diffuse", diffuseSrc, "diffuse", diffuseLayout),
      mk("phys-keys", sortSrc, "sort_keys", keysLayout),
      mk("phys-gather", gatherSrc, "gather", gatherLayout),
      mk("phys-seed", seedSrc, "seed_agents", seedLayout),
      mk("phys-food", foodSrc, "food_deposit", foodLayout),
      mk("phys-env", envSrc, "build_env", envLayout),
      mk("phys-log", logSrc, "log_awake", logLayout),
    ]);
    return new LiveKernels(
      paramsLayout,
      agentsLayout,
      diffuseLayout,
      keysLayout,
      gatherLayout,
      seedLayout,
      foodLayout,
      envLayout,
      logLayout,
      agents,
      diffuse,
      keys,
      gather,
      seed,
      food,
      env,
      log,
    );
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
  /** The scene's environment (null: the plain dish). */
  envSpec: EnvSpec | null = null;
  /** Food's deposit per step (exact: the integer amounts / 65536, summed in f64). */
  foodPerStep = 0;
  /** A growing colony (dormant agents wake when the trail reaches them). */
  growing = false;
  /** A dormant agent wakes at this many agents' deposits of trail. */
  private wakeMul = 1;
  /** Jones's stochastic turning (null: the gated deterministic rule) and the chance of a random turn per step. */
  private jitter = 0;
  private stochastic = false;

  /** Use Jones's stochastic turning with this chance of a random turn per step (null: deterministic, as gated). */
  setTurning(jitter: number | null): void {
    this.stochastic = jitter !== null;
    this.jitter = jitter ?? 0;
    this.setFlags();
  }

  /**
   * The closed form's total trail after the steps folded so far, through every
   * parameter change: each step adds d per awake agent (the deposit as the
   * kernel rounds it, ×65536 to an integer) plus the food's whole amounts,
   * and keeps (1 − α) of the sum, M ← (M + d·N_awake + F)(1 − α) in f64.
   * Without a growing colony every step folds at once; with one, a step
   * folds when its awake count is read back (`foldMass`).
   */
  private mass: MassState = { mass: 0, foldedTick: 0, pending: [] };
  private perAgent = 0;
  private keep = 1;
  private foldGen = 0;

  private readonly device: GPUDevice;
  private readonly k: LiveKernels;
  private readonly uniform: GPUBuffer;
  private readonly seedUniform: GPUBuffer;
  readonly agentBufs: [GPUBuffer, GPUBuffer];
  readonly trailBufs: [GPUBuffer, GPUBuffer];
  private readonly depBufs: [GPUBuffer, GPUBuffer];
  private readonly keys: GPUBuffer;
  private readonly sort: CountingSort;
  /** What the agents sense on top of the trail (scenes). */
  readonly env: GPUBuffer;
  /** Two bit planes, one bit per cell: walls, then food. */
  private readonly cellBits: GPUBuffer;
  private readonly bitsWords: number;
  private readonly envUniform: GPUBuffer;
  private envSrcs: GPUBuffer;
  /** Growing colonies: [awake count, step, ring of counts]. */
  private readonly awake: GPUBuffer;
  private foodBuf: GPUBuffer | null = null;
  private foodBG: GPUBindGroup[] = [];
  private foodCount = 0;
  private foodKey = "";
  private wallsRef: Uint32Array | null = null;
  private flags = 0;
  private readonly paramsBG: GPUBindGroup;
  private readonly agentsBG: GPUBindGroup[][] = [];
  private readonly diffuseBG: GPUBindGroup[] = [];
  private readonly keysBG: GPUBindGroup[] = [];
  private readonly gatherBG: GPUBindGroup[] = [];
  private readonly seedBG: GPUBindGroup;
  private envBG: GPUBindGroup;
  private readonly logBG: GPUBindGroup;
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
    this.uniform = device.createBuffer({ size: 64, usage: U().UNIFORM | U().COPY_DST, label: "phys-params" });
    this.seedUniform = device.createBuffer({ size: 32, usage: U().UNIFORM | U().COPY_DST, label: "phys-seed" });
    this.env = device.createBuffer({ size: cellBytes, usage: S, label: "phys-env" });
    this.bitsWords = Math.ceil(this.cells / 32);
    this.cellBits = device.createBuffer({ size: Math.max(16, this.bitsWords * 8), usage: S, label: "phys-cell-bits" });
    this.envUniform = device.createBuffer({ size: 16, usage: U().UNIFORM | U().COPY_DST, label: "phys-env-info" });
    this.envSrcs = device.createBuffer({ size: 64, usage: S, label: "phys-env-srcs" });
    this.awake = device.createBuffer({ size: (2 + AWAKE_RING) * 4, usage: S, label: "phys-awake" });
    this.flags = cfg.longRun ? 3 : 0;
    this.writeParams();

    const bg = (layout: GPUBindGroupLayout, label: string, ...bufs: GPUBuffer[]): GPUBindGroup =>
      device.createBindGroup({ layout, label, entries: bufs.map((b, i) => ({ binding: i, resource: { buffer: b } })) });
    this.paramsBG = bg(kernels.paramsLayout, "phys-params", this.uniform);
    for (let t = 0; t < 2; t += 1) {
      // trail parity t ⇒ deposit into dep[t]; the fused pass reads dep[t], clears dep[1 − t]
      this.agentsBG.push(
        [0, 1].map((a) =>
          bg(kernels.agentsLayout, `phys-agents-${t}${a}`, this.trailBufs[t]!, this.agentBufs[a]!, this.depBufs[t]!, this.env, this.cellBits, this.awake),
        ),
      );
      this.diffuseBG.push(bg(kernels.diffuseLayout, `phys-diffuse-${t}`, this.trailBufs[t]!, this.depBufs[t]!, this.trailBufs[1 - t]!, this.depBufs[1 - t]!));
    }
    for (let a = 0; a < 2; a += 1) {
      this.keysBG.push(bg(kernels.keysLayout, `phys-keys-${a}`, this.agentBufs[a]!, this.keys));
      this.gatherBG.push(bg(kernels.gatherLayout, `phys-gather-${a}`, this.agentBufs[a]!, this.sort.order, this.agentBufs[1 - a]!));
    }
    this.seedBG = bg(kernels.seedLayout, "phys-seed", this.seedUniform, this.agentBufs[0], this.awake);
    this.envBG = bg(kernels.envLayout, "phys-env", this.envUniform, this.envSrcs, this.cellBits, this.env);
    this.logBG = bg(kernels.logLayout, "phys-log", this.awake);
  }

  /** Current trail (row-major, w × h f32). */
  get trail(): GPUBuffer {
    return this.trailBufs[this.t]!;
  }

  /** Deposits of the last step (u32 ×65536 per agent; stale until the next step clears it). */
  get lastDeposit(): GPUBuffer {
    return this.depBufs[1 - this.t]!;
  }

  /** Current agents (vec4: pos.xy, head.xy; dormant agents carry head.x + 3). */
  get agents(): GPUBuffer {
    return this.agentBufs[this.a]!;
  }

  get trailBytes(): number {
    return this.cells * 4;
  }

  /** Mean trail per cell at equilibrium for the current parameters (every agent awake). */
  get meanTrail(): number {
    return (this.params.deposit * (this.n / this.cells) * (1 - this.params.decay_alpha)) / this.params.decay_alpha;
  }

  /** Total mass at equilibrium, (d·N + F)·(1−α)/α (every agent awake). */
  get equilibriumMass(): number {
    return ((this.params.deposit * this.n + this.foodPerStep) * (1 - this.params.decay_alpha)) / this.params.decay_alpha;
  }

  /**
   * The closed form's prediction after the steps folded so far. Exact for
   * every step run unless a colony is growing: then `foldMass()` first.
   */
  get predictedMass(): number {
    return this.mass.mass;
  }

  /** Steps whose awake count has not been read back yet. */
  get unfoldedSteps(): number {
    return this.tick - this.mass.foldedTick;
  }

  setParams(p: JonesParams): void {
    this.params = { ...p };
    this.writeParams();
    // the environment's strengths are in units of the mean trail, which moved
    if (this.envSpec) this.setEnv(this.envSpec);
  }

  /** The per-step terms of the mass recurrence, as the kernel computes them (f32 params, fixed-point deposit). */
  private massTerms(): void {
    const d = Math.fround(this.params.deposit);
    this.perAgent = roundEven(Math.fround(d * 65536)) / 65536;
    this.keep = Math.fround(1 - Math.fround(this.params.decay_alpha));
  }

  private writeParams(): void {
    const ab = new ArrayBuffer(64);
    const dv = new DataView(ab);
    const p = this.params;
    dv.setUint32(0, this.n, true);
    dv.setUint32(4, this.w, true);
    dv.setUint32(8, this.h, true);
    dv.setUint32(12, this.flags, true);
    // the gated writer's arithmetic: radians from degrees in f64, then f32
    dv.setFloat32(16, (p.delta_phi_deg * Math.PI) / 180, true);
    dv.setFloat32(20, p.L_sense, true);
    dv.setFloat32(24, p.L_move, true);
    dv.setFloat32(28, p.deposit, true);
    dv.setFloat32(32, p.decay_alpha, true);
    dv.setUint32(36, this.tilesX, true);
    dv.setUint32(40, TILE_SHIFT, true);
    dv.setUint32(44, this.bitsWords, true);
    dv.setFloat32(48, this.wakeMul * Math.fround(p.deposit), true);
    dv.setFloat32(52, this.jitter, true);
    this.device.queue.writeBuffer(this.uniform, 0, ab);
    this.massTerms();
  }

  private setFlags(): void {
    const sensing = !!this.envSpec && (this.envSpec.food.length + this.envSpec.lights.length > 0 || !!this.envSpec.walls);
    this.flags = (this.longRun ? 3 : 0) | (sensing ? 4 : 0) | (this.envSpec?.walls ? 8 : 0) | (this.growing ? 16 : 0) | (this.stochastic ? 32 : 0);
    this.writeParams();
  }

  /**
   * Install a scene's environment (or none): rebuilds what the agents sense
   * on top of the trail, the cell bits and the food's deposit list. Cheap
   * enough to call every frame while a light is dragged.
   */
  setEnv(spec: EnvSpec | null): void {
    const dev = this.device;
    const S = U().STORAGE | U().COPY_DST | U().COPY_SRC;
    this.envSpec = spec ? { ...spec, food: spec.food.map((f) => ({ ...f })), lights: spec.lights.map((l) => ({ ...l })) } : null;
    const mean = this.meanTrail;
    const srcs: number[] = [];
    if (spec) {
      for (const f of spec.food) srcs.push(f.x, f.y, f.r, 0, spec.scent * mean, spec.scentRange, 0, 0);
      for (const l of spec.lights) srcs.push(l.x, l.y, l.r, 1, spec.light * mean, Math.max(1, l.r * 0.45), 0, 0);
    }
    const count = srcs.length / 8;
    if (this.envSrcs.size < count * 32) {
      this.envSrcs.destroy();
      this.envSrcs = dev.createBuffer({ size: count * 64, usage: S, label: "phys-env-srcs" });
      this.envBG = dev.createBindGroup({
        layout: this.k.envLayout,
        label: "phys-env",
        entries: [this.envUniform, this.envSrcs, this.cellBits, this.env].map((b, i) => ({ binding: i, resource: { buffer: b } })),
      });
    }
    if (count > 0) {
      const ab = new ArrayBuffer(count * 32);
      const fv = new Float32Array(ab);
      const uv = new Uint32Array(ab);
      for (let k = 0; k < count; k += 1) {
        for (let j = 0; j < 8; j += 1) fv[k * 8 + j] = srcs[k * 8 + j]!;
        uv[k * 8 + 3] = srcs[k * 8 + 3]!;
      }
      dev.queue.writeBuffer(this.envSrcs, 0, ab);
    }
    dev.queue.writeBuffer(this.envUniform, 0, new Uint32Array([count, 0, 0, 0]));

    // food: every cell of every crumb deposits the same whole number of 1/65536ths per step
    const walls = spec?.walls ?? null;
    const cells: number[] = [];
    if (spec && spec.food.length > 0) {
      const amount = Math.max(1, Math.round(spec.foodDeposit * this.perAgent * 65536));
      for (const f of spec.food) {
        const r = Math.max(0.5, f.r);
        const r2 = r * r;
        for (let dy = Math.floor(-r); dy <= Math.ceil(r); dy += 1) {
          for (let dx = Math.floor(-r); dx <= Math.ceil(r); dx += 1) {
            if (dx * dx + dy * dy > r2) continue;
            const ix = (((Math.round(f.x) + dx) % this.w) + this.w) % this.w;
            const iy = (((Math.round(f.y) + dy) % this.h) + this.h) % this.h;
            const c = iy * this.w + ix;
            if (walls && (walls[c >> 5]! & (1 << (c & 31))) !== 0) continue;
            cells.push(c, amount);
          }
        }
      }
    }
    this.foodCount = cells.length / 2;
    this.foodPerStep = 0;
    for (let k = 1; k < cells.length; k += 2) this.foodPerStep += cells[k]! / 65536;
    const foodKey = cells.join(",");
    if (foodKey !== this.foodKey || walls !== this.wallsRef) {
      this.foodKey = foodKey;
      this.wallsRef = walls;
      const bits = new Uint32Array(this.bitsWords * 2);
      if (walls) bits.set(walls.subarray(0, this.bitsWords));
      // the food plane covers each crumb and its halo
      for (const f of spec?.food ?? []) {
        const r = Math.max(0.5, f.r) + FOOD_HALO;
        for (let dy = Math.floor(-r); dy <= Math.ceil(r); dy += 1) {
          for (let dx = Math.floor(-r); dx <= Math.ceil(r); dx += 1) {
            if (dx * dx + dy * dy > r * r) continue;
            const ix = (((Math.round(f.x) + dx) % this.w) + this.w) % this.w;
            const iy = (((Math.round(f.y) + dy) % this.h) + this.h) % this.h;
            const c = iy * this.w + ix;
            bits[this.bitsWords + (c >> 5)]! |= 1 << (c & 31);
          }
        }
      }
      dev.queue.writeBuffer(this.cellBits, 0, bits);
      if (this.foodCount > 0) {
        const bytes = cells.length * 4;
        if (!this.foodBuf || this.foodBuf.size !== bytes) {
          this.foodBuf?.destroy();
          this.foodBuf = dev.createBuffer({ size: bytes, usage: S, label: "phys-food" });
          this.foodBG = [0, 1].map((t) =>
            dev.createBindGroup({
              layout: this.k.foodLayout,
              label: `phys-food-${t}`,
              entries: [
                { binding: 0, resource: { buffer: this.foodBuf! } },
                { binding: 1, resource: { buffer: this.depBufs[t]! } },
              ],
            }),
          );
        }
        dev.queue.writeBuffer(this.foodBuf, 0, new Uint32Array(cells));
      }
    }
    this.setFlags();

    const enc = dev.createCommandEncoder({ label: "phys-env" });
    const pass = enc.beginComputePass({ label: "phys-env" });
    pass.setPipeline(this.k.env);
    pass.setBindGroup(0, this.paramsBG);
    pass.setBindGroup(1, this.envBG);
    pass.dispatchWorkgroups(Math.ceil(this.w / 16), Math.ceil(this.h / 16));
    pass.end();
    dev.queue.submit([enc.finish()]);
  }

  private clearField(enc: GPUCommandEncoder): void {
    for (const b of [...this.trailBufs, ...this.depBufs]) enc.clearBuffer(b);
    this.t = 0;
    this.mass = { mass: 0, foldedTick: 0, pending: [] };
    this.foldGen += 1;
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
    this.growing = s.mode === 3;
    this.wakeMul = s.wake ?? 1;
    this.setFlags();
    // the awake log starts empty; the seed pass counts a growing colony's awake agents
    this.device.queue.writeBuffer(this.awake, 0, new Uint32Array([this.growing ? 0 : this.n, 0]));
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
    this.growing = false;
    this.setFlags();
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
      if (this.growing) {
        pass.setPipeline(this.k.log);
        pass.setBindGroup(1, this.logBG);
        pass.dispatchWorkgroups(1);
      }
      if (this.foodCount > 0) {
        pass.setPipeline(this.k.food);
        pass.setBindGroup(1, this.foodBG[this.t]!);
        pass.dispatchWorkgroups(Math.ceil(this.foodCount / 64));
      }
      pass.setPipeline(this.k.diffuse);
      pass.setBindGroup(1, this.diffuseBG[this.t]!);
      pass.dispatchWorkgroups(wgX, wgY);
      this.t = 1 - this.t;
      this.tick += 1;
      if (this.growing) {
        this.mass.pending.push({ perAgent: this.perAgent, keep: this.keep, food: this.foodPerStep });
      } else {
        this.mass.mass = (this.mass.mass + this.perAgent * this.n + this.foodPerStep) * this.keep;
        this.mass.foldedTick = this.tick;
      }
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

  /**
   * Growing colonies: read the awake log back and fold every step run so
   * far into the prediction. Call at least every AWAKE_RING steps (the app
   * does about once a second); a fold that a seed or restore overtook is dropped.
   */
  async foldMass(): Promise<void> {
    if (!this.growing || this.mass.foldedTick === this.tick) return;
    const gen = this.foldGen;
    const upTo = this.tick;
    const data = new Uint32Array(await readBuffer(this.device, this.awake, (2 + AWAKE_RING) * 4));
    if (gen !== this.foldGen) return;
    const logged = data[1]!;
    const m = this.mass;
    const from = m.foldedTick;
    const to = Math.min(upTo, logged);
    // folds can resolve out of order: a later one may already have covered this one
    if (to <= from) return;
    if (to - from > AWAKE_RING) throw new Error(`awake log overrun: ${to - from} steps since the last fold`);
    for (let k = from; k < to; k += 1) {
      const terms = m.pending[k - from]!;
      const awake = data[2 + (k % AWAKE_RING)]!;
      m.mass = (m.mass + terms.perAgent * awake + terms.food) * terms.keep;
    }
    m.pending.splice(0, to - from);
    m.foldedTick = to;
  }

  /** Agents awake now (a growing colony's count read back; else every agent). */
  async awakeCount(): Promise<number> {
    if (!this.growing) return this.n;
    return new Uint32Array(await readBuffer(this.device, this.awake, 8))[0]!;
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
    const awake = this.growing ? this.device.createBuffer({ size: this.awake.size, usage: S, label: "phys-cp-awake" }) : null;
    const enc = this.device.createCommandEncoder({ label: "phys-checkpoint" });
    enc.copyBufferToBuffer(this.agents, 0, agents, 0, this.n * 16);
    enc.copyBufferToBuffer(this.trail, 0, trail, 0, this.cells * 4);
    if (awake) enc.copyBufferToBuffer(this.awake, 0, awake, 0, this.awake.size);
    this.device.queue.submit([enc.finish()]);
    return {
      agents,
      trail,
      awake,
      tick: this.tick,
      params: { ...this.params },
      mass: { mass: this.mass.mass, foldedTick: this.mass.foldedTick, pending: this.mass.pending.slice() },
      growing: this.growing,
      wakeMul: this.wakeMul,
      env: this.envSpec,
    };
  }

  restore(c: Checkpoint): void {
    const enc = this.device.createCommandEncoder({ label: "phys-restore" });
    this.clearField(enc);
    enc.copyBufferToBuffer(c.agents, 0, this.agentBufs[0], 0, this.n * 16);
    enc.copyBufferToBuffer(c.trail, 0, this.trailBufs[0], 0, this.cells * 4);
    if (c.awake) enc.copyBufferToBuffer(c.awake, 0, this.awake, 0, this.awake.size);
    this.device.queue.submit([enc.finish()]);
    this.a = 0;
    this.t = 0;
    this.tick = c.tick;
    this.params = { ...c.params };
    this.growing = c.growing;
    this.wakeMul = c.wakeMul;
    this.setEnv(c.env);
    this.mass = { mass: c.mass.mass, foldedTick: c.mass.foldedTick, pending: c.mass.pending.slice() };
  }

  release(c: Checkpoint): void {
    c.agents.destroy();
    c.trail.destroy();
    c.awake?.destroy();
  }

  /** Read the trail back (f32, row-major). */
  async readTrail(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.trail, this.trailBytes));
  }

  /** Read the agents back (vec4 per agent). */
  async readAgents(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.agents, this.n * 16));
  }

  /** Read the environment back (f32, row-major; scenes only). */
  async readEnv(): Promise<Float32Array> {
    return new Float32Array(await readBuffer(this.device, this.env, this.cells * 4));
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
    for (const b of [
      ...this.agentBufs,
      ...this.trailBufs,
      ...this.depBufs,
      this.keys,
      this.uniform,
      this.seedUniform,
      this.env,
      this.cellBits,
      this.envUniform,
      this.envSrcs,
      this.awake,
    ])
      b.destroy();
    this.foodBuf?.destroy();
    this.sort.destroy();
  }
}
