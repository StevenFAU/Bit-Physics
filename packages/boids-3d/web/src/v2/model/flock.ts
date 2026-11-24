// Murmuration's live model (07-boids-3d.md, "The model"; M1): murmur.wgsl, a
// fork of v1's starling kernel (src/starling.wgsl stays byte-frozen for the v1
// page). What changed and why is at the top of murmur.wgsl; in short: an
// ordered, dense flock (the roost turns birds back only past its edge, edge
// birds pull in harder), an alarm that spreads through the seven followed
// neighbours with integer-step delays, a falcon, and an exact k-nearest search
// that stops early — over @bp/gpu's CountingSort on cells smaller than the
// reach, with birds processed in cell order.
//
// Every step has its own 256-byte uniform slot (a dynamic offset into a ring),
// written with the step's own number, time, falcon and tool: the bytes do not
// depend on how steps fall into submits.

import { CountingSort, wgsl } from "@bp/gpu";
import statsWgsl from "../../stats.wgsl?raw";
import gridSrc from "./murmur-grid.wgsl?raw";
import paramsSrc from "./murmur-params.wgsl?raw";
import stepSrc from "./murmur.wgsl?raw";
import observeWgsl from "./observe.wgsl?raw";

export const AGENT_BYTES = 64;
const PARAM_BYTES = 240;
const SLOT = 256;
/** Uniform slots in the ring; at most this many steps per submit. */
export const RING_SLOTS = 64;
/** Steps per encodeSteps call. */
export const MAX_STEPS = 32;
/** v1's fixed step: 1/120 s, two per 60 Hz frame. */
export const DT = 1 / 120;
const STATS_VEC4 = 8;
const NONE = 0xffffffff;

export type V3 = [number, number, number];

/** The dense grid: a box around the roost in cells smaller than a bird's reach. */
export interface GridSpec {
  min: V3;
  cell: number;
  dims: V3;
}

export function gridFor(cell: number): GridSpec {
  const min: V3 = [-84, -34, -84];
  const size: V3 = [168, 68, 168];
  return { min, cell, dims: [Math.ceil(size[0] / cell), Math.ceil(size[1] / cell), Math.ceil(size[2] / cell)] };
}

export const cellCount = (g: GridSpec): number => g.dims[0] * g.dims[1] * g.dims[2];

/** The model's parameters (model units ≈ 2 m, seconds). */
export interface ModelParams {
  label: string;
  /** Social reach: the farthest a followed neighbour may be. */
  reach: number;
  /** Closer than this, a bird turns away from its nearest neighbour first. */
  separation: number;
  /** Cosine of the edge of the rear blind cone. */
  blindCos: number;
  align: number;
  cohere: number;
  /** Cohesion × (1 + edgeGain · centrality²): edge birds pull in harder. */
  edgeGain: number;
  avoid: number;
  roost: number;
  roostRadius: number;
  height: number;
  floor: number;
  ceiling: number;
  minSpeed: number;
  cruise: number;
  maxSpeed: number;
  /** Largest turn rate, rad/s. */
  maxTurn: number;
  noise: number;
  /** Bank relaxation rate, 1/s. */
  bank: number;
  /** Falcon: seen within, and dodged within (model units). */
  detect: number;
  dodge: number;
  /** Alarm timers in steps of 1/120 s. */
  directDelay: number;
  contagionDelay: number;
  refractory: number;
  /** Alarm decay per second; a neighbour at least this alarmed passes it on. */
  decay: number;
  threshold: number;
  escape: number;
}

export const MURMURATION: ModelParams = {
  label: "murmuration",
  reach: 5,
  separation: 0.5,
  blindCos: -0.8,
  align: 1.4,
  cohere: 0.35,
  edgeGain: 3,
  avoid: 2.5,
  roost: 1.2,
  roostRadius: 50,
  height: 0,
  floor: -18,
  ceiling: 26,
  minSpeed: 3.5,
  cruise: 5.5,
  maxSpeed: 9,
  maxTurn: 3,
  noise: 0.05,
  bank: 6,
  detect: 6,
  dodge: 3,
  directDelay: 3,
  contagionDelay: 4,
  refractory: 180,
  decay: 1.1,
  threshold: 0.6,
  escape: 1,
};

export const TOOL = { none: 0, repel: 2, startle: 3, gust: 4 } as const;
export type ToolCode = 0 | 2 | 3 | 4;

export interface ToolInput {
  code: ToolCode;
  position: V3;
  direction: V3;
  radius: number;
  strength: number;
}

export const NO_TOOL: ToolInput = { code: 0, position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2 };

export interface FalconInput {
  position: V3;
  velocity: V3;
}

/** The step's own number, time, falcon and tool: everything that may vary per step. */
export interface StepInput {
  step: number;
  falcon: FalconInput | null;
  tool: ToolInput;
}

/** Pack one step's uniforms (exported for tests). */
export function packParams(out: ArrayBuffer, offset: number, count: number, g: GridSpec, m: ModelParams, s: StepInput, dt = DT): void {
  const u = new Uint32Array(out, offset, PARAM_BYTES / 4);
  const f = new Float32Array(out, offset, PARAM_BYTES / 4);
  const rmax = Math.ceil(m.reach / g.cell) + 1;
  const flags = (s.falcon ? 1 : 0) | ((s.tool.code & 0xff) << 8);
  u.set([count, cellCount(g), g.dims[0], g.dims[1]], 0);
  u.set([g.dims[2], rmax, s.step >>> 0, flags], 4);
  f.set([g.min[0], g.min[1], g.min[2], g.cell], 8);
  f.set([1 / g.cell, m.reach * m.reach, m.separation, m.blindCos], 12);
  f.set([m.align, m.cohere, m.avoid, m.roost], 16);
  f.set([m.minSpeed, m.cruise, m.maxSpeed, m.maxTurn], 20);
  f.set([dt, s.step * dt, m.noise, m.bank], 24);
  f.set([m.roostRadius, m.height, m.floor, m.ceiling], 28);
  const fp = s.falcon?.position ?? [0, 0, 0];
  const fv = s.falcon?.velocity ?? [0, 0, 0];
  f.set([fp[0], fp[1], fp[2], m.detect], 32);
  f.set([fv[0], fv[1], fv[2], m.dodge], 36);
  u.set([m.directDelay, m.contagionDelay, m.refractory, 0], 40);
  f.set([m.decay, m.threshold, m.escape, m.edgeGain], 44);
  f.set([s.tool.position[0], s.tool.position[1], s.tool.position[2], s.tool.radius], 48);
  f.set([s.tool.direction[0], s.tool.direction[1], s.tool.direction[2], s.tool.strength], 52);
}

/**
 * The starting flock: `count` birds spread uniformly through a flattened,
 * elongated ellipsoid near the roost's edge, at about the model's spacing,
 * flying together (a little scatter in heading and speed). xorshift32 from
 * the seed, as v1's reset() — but its own shape.
 */
export function seedFlock(count: number, m: ModelParams, seed: number): ArrayBuffer {
  let state = seed >>> 0 || 1;
  const random = (): number => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  // volume for the count at ~1.6 × the separation radius apart
  const spacing = m.separation * 1.6;
  const volume = count * spacing ** 3;
  const k = Math.cbrt((3 * volume) / (4 * Math.PI * 4 * 1 * 2.2));
  const axes: V3 = [4 * k, 1 * k, 2.2 * k];
  const data = new ArrayBuffer(count * AGENT_BYTES);
  const f = new Float32Array(data);
  const u = new Uint32Array(data);
  const centre: V3 = [-m.roostRadius * 0.35, m.height, m.roostRadius * 0.15];
  const dir: V3 = [0.86, 0.02, -0.5];
  const dl = Math.hypot(...dir);
  for (let i = 0; i < count; i += 1) {
    let x = 0, y = 0, z = 0;
    do {
      x = random() * 2 - 1; y = random() * 2 - 1; z = random() * 2 - 1;
    } while (x * x + y * y + z * z > 1);
    // the long axis along the flight direction (in xz), thin vertically
    const ax = x * axes[0], az = z * axes[2];
    const px = centre[0] + (ax * dir[0] - az * dir[2]) / dl;
    const pz = centre[2] + (ax * dir[2] + az * dir[0]) / dl;
    const py = centre[1] + y * axes[1];
    const hx = dir[0] / dl + (random() - 0.5) * 0.25;
    const hy = dir[1] / dl + (random() - 0.5) * 0.08;
    const hz = dir[2] / dl + (random() - 0.5) * 0.25;
    const hl = Math.hypot(hx, hy, hz);
    const speed = m.cruise * (0.92 + random() * 0.16);
    const base = i * 16;
    f.set([px, py, pz, speed, hx / hl, hy / hl, hz / hl, 0, 0, 0, 0, 0], base);
    u[base + 12] = i;
    u[base + 13] = state;
    u[base + 14] = NONE;
    u[base + 15] = 0;
  }
  return data;
}

export interface FlockStats {
  centroid: V3;
  meanHeading: V3;
  polarization: number;
  meanSpeed: number;
  alertFraction: number;
  meanNeighbors: number;
  rmsRoll: number;
  milling: number;
  radius: number;
  verticalSpread: number;
  /** Covariance eigenvalues, largest first (model units²). */
  axes: V3;
  /** Smallest principal axis, rms (model units): the flock's thickness. */
  thickness: number;
  /** Mean distance to the nearest bird, over birds with one within the social reach. */
  nnd: number;
  /** Fraction of birds with no neighbour within the social reach. */
  isolated: number;
  count: number;
}

/** Eigenvalues of a symmetric 3×3 (Smith 1961, closed form), largest first. */
export function symEig3(xx: number, yy: number, zz: number, xy: number, xz: number, yz: number): V3 {
  const p1 = xy * xy + xz * xz + yz * yz;
  if (p1 < 1e-30 * (xx * xx + yy * yy + zz * zz + 1e-300)) {
    return [xx, yy, zz].sort((a, b) => b - a) as V3;
  }
  const q = (xx + yy + zz) / 3;
  const p2 = (xx - q) ** 2 + (yy - q) ** 2 + (zz - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6);
  const b = [(xx - q) / p, xy / p, xz / p, xy / p, (yy - q) / p, yz / p, xz / p, yz / p, (zz - q) / p];
  const det = b[0]! * (b[4]! * b[8]! - b[5]! * b[7]!) - b[1]! * (b[3]! * b[8]! - b[5]! * b[6]!) + b[2]! * (b[3]! * b[7]! - b[4]! * b[6]!);
  const r = Math.min(Math.max(det / 2, -1), 1);
  const phi = Math.acos(r) / 3;
  const e1 = q + 2 * p * Math.cos(phi);
  const e3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  const e2 = 3 * q - e1 - e3;
  return [e1, e2, e3];
}

/** Decode the 128-byte stats block (v1's four rows + observe.wgsl's three). */
export function decodeStats(v: Float32Array): FlockStats | null {
  for (let i = 0; i < 28; i += 1) if (!Number.isFinite(v[i]!)) return null;
  const count = Math.max(v[19]!, 1);
  const n = Math.max(v[11]!, 1);
  const [e1, e2, e3] = symEig3(v[16]! / count, v[17]! / count, v[18]! / count, v[20]! / count, v[21]! / count, v[22]! / count);
  const withNear = v[25]!;
  return {
    centroid: [v[0]!, v[1]!, v[2]!],
    meanHeading: [v[8]!, v[9]!, v[10]!],
    polarization: v[3]!,
    meanSpeed: v[4]!,
    alertFraction: v[5]!,
    meanNeighbors: v[6]!,
    rmsRoll: Math.sqrt(Math.max(0, v[7]!)),
    milling: v[12]!,
    radius: v[13]!,
    verticalSpread: v[14]!,
    axes: [e1, e2, e3],
    thickness: Math.sqrt(Math.max(0, e3)),
    nnd: withNear > 0 ? v[24]! / withNear : NaN,
    isolated: 1 - withNear / n,
    count: n,
  };
}

/** The compiled kernels, shared by every Flock (the live one, Prove's small ones). */
export class FlockKernels {
  private constructor(
    readonly gridLayout: GPUBindGroupLayout,
    readonly stepLayout: GPUBindGroupLayout,
    readonly statsLayout: GPUBindGroupLayout,
    readonly keys: GPUComputePipeline,
    readonly gather: GPUComputePipeline,
    readonly step: GPUComputePipeline,
    readonly brute: GPUComputePipeline,
    readonly stats: readonly [GPUComputePipeline, GPUComputePipeline, GPUComputePipeline],
  ) {}

  static async create(device: GPUDevice): Promise<FlockKernels> {
    const C = GPUShaderStage.COMPUTE;
    const ring = { type: "uniform" as const, hasDynamicOffset: true, minBindingSize: PARAM_BYTES };
    const gridLayout = device.createBindGroupLayout({
      label: "murmur-grid",
      entries: [
        { binding: 0, visibility: C, buffer: ring },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
        { binding: 3, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const stepLayout = device.createBindGroupLayout({
      label: "murmur-step",
      entries: [
        { binding: 0, visibility: C, buffer: ring },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
        { binding: 3, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 5, visibility: C, buffer: { type: "read-only-storage" } },
      ],
    });
    const statsLayout = device.createBindGroupLayout({
      label: "murmur-stats",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform" } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const local = { "murmur/params": paramsSrc };
    const gridModule = device.createShaderModule({ code: wgsl(gridSrc, local), label: "murmur-grid" });
    const stepModule = device.createShaderModule({ code: wgsl(stepSrc, local), label: "murmur-step" });
    const statsModule = device.createShaderModule({ code: statsWgsl, label: "murmur-stats" });
    const observeModule = device.createShaderModule({ code: observeWgsl, label: "murmur-observe" });
    const gridPl = device.createPipelineLayout({ bindGroupLayouts: [gridLayout] });
    const stepPl = device.createPipelineLayout({ bindGroupLayouts: [stepLayout] });
    const statsPl = device.createPipelineLayout({ bindGroupLayouts: [statsLayout] });
    const s = (module: GPUShaderModule, entryPoint: string): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({ label: `murmur-${entryPoint}`, layout: statsPl, compute: { module, entryPoint } });
    const [keys, gather, step, brute, s0, s1, s2] = await Promise.all([
      device.createComputePipelineAsync({ label: "murmur-keys", layout: gridPl, compute: { module: gridModule, entryPoint: "cell_keys" } }),
      device.createComputePipelineAsync({ label: "murmur-gather", layout: gridPl, compute: { module: gridModule, entryPoint: "gather" } }),
      device.createComputePipelineAsync({ label: "murmur-step", layout: stepPl, compute: { module: stepModule, entryPoint: "step" } }),
      device.createComputePipelineAsync({ label: "murmur-step-brute", layout: stepPl, compute: { module: stepModule, entryPoint: "step_brute" } }),
      s(statsModule, "reduce_stats"),
      s(statsModule, "reduce_shape"),
      s(observeModule, "reduce_extra"),
    ]);
    return new FlockKernels(gridLayout, stepLayout, statsLayout, keys, gather, step, brute, [s0, s1, s2]);
  }
}

export interface FlockCheckpoint {
  buffer: GPUBuffer;
  steps: number;
  count: number;
  seed: number;
}

/** One flock: its state ping-pong, its grid, its uniform ring and its instruments. */
export class Flock {
  readonly agents: readonly [GPUBuffer, GPUBuffer];
  readonly keys: GPUBuffer;
  readonly cand: GPUBuffer;
  readonly sort: CountingSort;
  readonly grid: GridSpec;
  private readonly ring: GPUBuffer;
  private readonly ringData = new ArrayBuffer(RING_SLOTS * SLOT);
  private cursor = 0;
  private readonly statsParams: GPUBuffer;
  readonly statsBuffer: GPUBuffer;
  private readonly gridGroups: readonly [GPUBindGroup, GPUBindGroup];
  private readonly stepGroups: readonly [GPUBindGroup, GPUBindGroup];
  private readonly statsGroups: readonly [GPUBindGroup, GPUBindGroup];
  /** Which agent buffer holds the current state. */
  source = 0;
  /** Steps since the seed. */
  steps = 0;
  count: number;
  seed = 42;
  model: ModelParams = { ...MURMURATION };
  dt = DT;
  /** Called before each step is packed (the falcon advances here). Returns that step's inputs. */
  input: (step: number) => StepInput = (step) => ({ step, falcon: null, tool: NO_TOOL });

  constructor(
    private readonly device: GPUDevice,
    private readonly kernels: FlockKernels,
    readonly capacity: number,
    cell = 1.25,
  ) {
    const usage = GPUBufferUsage;
    const mk = (size: number, u: number, label: string): GPUBuffer => device.createBuffer({ size, usage: u, label });
    this.count = capacity;
    this.grid = gridFor(cell);
    this.agents = [
      mk(capacity * AGENT_BYTES, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC, "murmur-agents-a"),
      mk(capacity * AGENT_BYTES, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC, "murmur-agents-b"),
    ];
    this.keys = mk(capacity * 4, usage.STORAGE | usage.COPY_SRC, "murmur-keys");
    this.cand = mk(capacity * 16, usage.STORAGE | usage.COPY_SRC, "murmur-cand");
    this.sort = new CountingSort(device, { maxItems: capacity, keyCount: cellCount(this.grid), label: "murmur-sort" });
    this.ring = mk(RING_SLOTS * SLOT, usage.UNIFORM | usage.COPY_DST, "murmur-params-ring");
    this.statsParams = mk(16, usage.UNIFORM | usage.COPY_DST, "murmur-stats-params");
    this.statsBuffer = mk(STATS_VEC4 * 16, usage.STORAGE | usage.COPY_SRC, "murmur-stats");
    const ringBinding = { buffer: this.ring, offset: 0, size: PARAM_BYTES };
    this.gridGroups = [0, 1].map((src) =>
      device.createBindGroup({
        layout: kernels.gridLayout,
        entries: [
          { binding: 0, resource: ringBinding },
          { binding: 1, resource: { buffer: this.agents[src]! } },
          { binding: 2, resource: { buffer: this.keys } },
          { binding: 3, resource: { buffer: this.sort.order } },
          { binding: 4, resource: { buffer: this.cand } },
        ],
      }),
    ) as unknown as readonly [GPUBindGroup, GPUBindGroup];
    this.stepGroups = [0, 1].map((src) =>
      device.createBindGroup({
        layout: kernels.stepLayout,
        entries: [
          { binding: 0, resource: ringBinding },
          { binding: 1, resource: { buffer: this.agents[src]! } },
          { binding: 2, resource: { buffer: this.agents[1 - src]! } },
          { binding: 3, resource: { buffer: this.sort.cellStart } },
          { binding: 4, resource: { buffer: this.sort.order } },
          { binding: 5, resource: { buffer: this.cand } },
        ],
      }),
    ) as unknown as readonly [GPUBindGroup, GPUBindGroup];
    this.statsGroups = [0, 1].map((src) =>
      device.createBindGroup({
        layout: kernels.statsLayout,
        entries: [
          { binding: 0, resource: { buffer: this.statsParams } },
          { binding: 1, resource: { buffer: this.agents[src]! } },
          { binding: 2, resource: { buffer: this.statsBuffer } },
        ],
      }),
    ) as unknown as readonly [GPUBindGroup, GPUBindGroup];
  }

  /** The buffer the renderer reads. */
  get current(): GPUBuffer {
    return this.agents[this.source]!;
  }

  get time(): number {
    return this.steps * this.dt;
  }

  private setCount(count: number): void {
    this.count = Math.max(1, Math.min(this.capacity, Math.round(count)));
    this.sort.setCount(this.count);
  }

  /** Seed `count` birds into both buffers. */
  reset(seed: number, count: number = this.count): void {
    this.seed = seed >>> 0;
    this.setCount(count);
    const data = seedFlock(this.count, this.model, this.seed);
    this.device.queue.writeBuffer(this.agents[0], 0, data);
    this.device.queue.writeBuffer(this.agents[1], 0, data);
    this.source = 0;
    this.steps = 0;
  }

  /** Load a state written elsewhere (Prove's fixtures): `data` is whole agent records. */
  load(data: ArrayBuffer, steps = 0): void {
    this.setCount(data.byteLength / AGENT_BYTES);
    this.device.queue.writeBuffer(this.agents[0], 0, data);
    this.device.queue.writeBuffer(this.agents[1], 0, data);
    this.source = 0;
    this.steps = steps;
  }

  /**
   * Encode `n` steps: per step, its uniforms into the next ring slot, then
   * keys → counting sort → gather → step; with `brute`, the all-pairs twin.
   */
  encodeSteps(enc: GPUCommandEncoder, n: number, o: { brute?: boolean; timestampWrites?: GPUComputePassTimestampWrites } = {}): void {
    if (n <= 0) return;
    if (n > MAX_STEPS) throw new Error(`encodeSteps: at most ${MAX_STEPS} steps per call`);
    const first = this.cursor;
    for (let k = 0; k < n; k += 1) {
      const slot = (first + k) % RING_SLOTS;
      packParams(this.ringData, slot * SLOT, this.count, this.grid, this.model, this.input(this.steps + k), this.dt);
    }
    const end = first + n;
    if (end <= RING_SLOTS) {
      this.device.queue.writeBuffer(this.ring, first * SLOT, this.ringData, first * SLOT, n * SLOT);
    } else {
      this.device.queue.writeBuffer(this.ring, first * SLOT, this.ringData, first * SLOT, (RING_SLOTS - first) * SLOT);
      this.device.queue.writeBuffer(this.ring, 0, this.ringData, 0, (end - RING_SLOTS) * SLOT);
    }
    this.cursor = end % RING_SLOTS;
    const k = this.kernels;
    const pass = enc.beginComputePass({ label: o.brute ? "murmur-steps-brute" : "murmur-steps", timestampWrites: o.timestampWrites });
    const birds = Math.ceil(this.count / 256);
    for (let s = 0; s < n; s += 1) {
      const offset = [((first + s) % RING_SLOTS) * SLOT];
      if (!o.brute) {
        pass.setPipeline(k.keys);
        pass.setBindGroup(0, this.gridGroups[this.source]!, offset);
        pass.dispatchWorkgroups(birds);
        this.sort.encode(pass, this.keys);
        pass.setPipeline(k.gather);
        pass.setBindGroup(0, this.gridGroups[this.source]!, offset);
        pass.dispatchWorkgroups(birds);
      }
      pass.setPipeline(o.brute ? k.brute : k.step);
      pass.setBindGroup(0, this.stepGroups[this.source]!, offset);
      pass.dispatchWorkgroups(Math.ceil(this.count / 64));
      this.source = 1 - this.source;
    }
    pass.end();
    this.steps += n;
  }

  /** Encode only the grid build (keys, sort, gather) for the current state: Prove's scatter check. */
  encodeGrid(enc: GPUCommandEncoder): void {
    const slot = this.cursor;
    // the grid reads only positions: no falcon or tool (and no falcon step taken)
    packParams(this.ringData, slot * SLOT, this.count, this.grid, this.model, { step: this.steps, falcon: null, tool: NO_TOOL }, this.dt);
    this.device.queue.writeBuffer(this.ring, slot * SLOT, this.ringData, slot * SLOT, SLOT);
    this.cursor = (slot + 1) % RING_SLOTS;
    const pass = enc.beginComputePass({ label: "murmur-grid-only" });
    pass.setPipeline(this.kernels.keys);
    pass.setBindGroup(0, this.gridGroups[this.source]!, [slot * SLOT]);
    pass.dispatchWorkgroups(Math.ceil(this.count / 256));
    this.sort.encode(pass, this.keys);
    pass.setPipeline(this.kernels.gather);
    pass.setBindGroup(0, this.gridGroups[this.source]!, [slot * SLOT]);
    pass.dispatchWorkgroups(Math.ceil(this.count / 256));
    pass.end();
  }

  /** Encode the compact reductions into statsBuffer (read it with a ReadbackSlot). */
  encodeStats(enc: GPUCommandEncoder): void {
    this.device.queue.writeBuffer(this.statsParams, 0, new Uint32Array([this.count, 0, 0, 0]));
    const pass = enc.beginComputePass({ label: "murmur-instruments" });
    pass.setBindGroup(0, this.statsGroups[this.source]!);
    for (const p of this.kernels.stats) {
      pass.setPipeline(p);
      pass.dispatchWorkgroups(1);
    }
    pass.end();
  }

  /** Read the whole state (count × 64 bytes). */
  async readState(): Promise<ArrayBuffer> {
    return this.readBuffer(this.current, this.count * AGENT_BYTES);
  }

  async readBuffer(src: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const staging = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "murmur-read" });
    try {
      const enc = this.device.createCommandEncoder();
      enc.copyBufferToBuffer(src, 0, staging, 0, bytes);
      this.device.queue.submit([enc.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      return staging.getMappedRange().slice(0);
    } finally {
      staging.destroy();
    }
  }

  capture(): FlockCheckpoint {
    const bytes = this.count * AGENT_BYTES;
    const buffer = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label: "murmur-checkpoint" });
    const enc = this.device.createCommandEncoder({ label: "murmur-checkpoint" });
    enc.copyBufferToBuffer(this.current, 0, buffer, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    return { buffer, steps: this.steps, count: this.count, seed: this.seed };
  }

  restore(c: FlockCheckpoint): void {
    const bytes = c.count * AGENT_BYTES;
    const enc = this.device.createCommandEncoder({ label: "murmur-restore" });
    enc.copyBufferToBuffer(c.buffer, 0, this.agents[0], 0, bytes);
    enc.copyBufferToBuffer(c.buffer, 0, this.agents[1], 0, bytes);
    this.device.queue.submit([enc.finish()]);
    this.source = 0;
    this.steps = c.steps;
    this.setCount(c.count);
    this.seed = c.seed;
  }

  releaseCheckpoint(c: FlockCheckpoint): void {
    c.buffer.destroy();
  }

  destroy(): void {
    for (const b of [...this.agents, this.keys, this.cand, this.ring, this.statsParams, this.statsBuffer]) b.destroy();
    this.sort.destroy();
  }
}
