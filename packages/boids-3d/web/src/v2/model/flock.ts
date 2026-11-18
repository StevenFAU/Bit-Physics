// Murmuration's live model (07-boids-3d.md, "The model"): v1's starling
// flock, `starling-topological-v1`, with its kernels imported unchanged from
// the v1 page — src/grid.wgsl (the dense counting-sort grid: clear,
// histogram, scan, scatter), src/starling.wgsl (seven topological
// neighbours, one avoidance neighbour, the rear blind cone, bounded and
// bank-coupled turning, cruise-speed relaxation, the roost and its preferred
// altitude, the threat state) and src/stats.wgsl (the compact GPU
// reductions). The presets and the seeded initial state are v1's too
// (src/engine.ts PRESETS and reset()).
//
// One thing differs from v1's frame loop, and it is a fix, not a model
// change: v1 wrote every step's uniforms into one buffer with
// queue.writeBuffer and encoded up to two steps in one submit, so both steps
// read the second write (its frame index, which seeds the turning noise, and
// its time). Here every step has its own 256-byte uniform slot (a dynamic
// offset into a ring), so a step's inputs depend only on its own step number:
// the same seed gives the same bytes however the steps fall into frames.
//
// The brute-force path is the same kernel with one change, made by text so
// it cannot drift: the 27-cell candidate loop becomes a loop over every bird.
// The selection is lexicographic in (distance², id) and the reductions run in
// selection order, so whenever the grid's cell is at least the social reach
// both paths give the same bytes (Prove, "Grid ≡ brute force").

import gridWgsl from "../../grid.wgsl?raw";
import starlingWgsl from "../../starling.wgsl?raw";
import statsWgsl from "../../stats.wgsl?raw";
import { PRESETS } from "../../engine.js";
import type { MurmurationPreset } from "../../engine.js";
import observeWgsl from "./observe.wgsl?raw";

export type { MurmurationPreset };
export { PRESETS };

/** v1's dense grid (src/engine.ts GRID): 24 × 12 × 24 cells of 6, from (−72, −36, −72). */
export const GRID = { nx: 24, ny: 12, nz: 24, cellSize: 6, min: [-72, -36, -72] as const } as const;
export const CELL_COUNT = GRID.nx * GRID.ny * GRID.nz;
export const AGENT_BYTES = 64;
const PARAM_BYTES = 176;
const SLOT = 256;
/** Uniform slots in the ring; at most this many steps per submit. */
export const RING_SLOTS = 64;
/** Steps per encodeSteps call. */
export const MAX_STEPS = 32;
/** v1's fixed step: 1/120 s, two per 60 Hz frame. */
export const DT = 1 / 120;
const STATS_VEC4 = 8;

export type ToolCode = 0 | 1 | 2 | 3 | 4;
/** v1's tool codes (src/engine.ts toolCode): none, attract, repel, falcon (repel + alarm), gust (a vortex). */
export const TOOL = { none: 0, attract: 1, repel: 2, startle: 3, gust: 4 } as const;

export interface ToolInput {
  code: ToolCode;
  position: [number, number, number];
  direction: [number, number, number];
  radius: number;
  strength: number;
}

export const NO_TOOL: ToolInput = { code: 0, position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2 };

export function presetById(label: string): MurmurationPreset {
  return PRESETS.find((p) => p.label === label) ?? PRESETS[0]!;
}

/**
 * v1's reset(seed) (src/engine.ts), verbatim: an xorshift32 stream fills a
 * flattened ellipsoid (31 × 11 × 27) with birds circling the roost.
 */
export function seedFlock(count: number, preset: MurmurationPreset, seed: number): ArrayBuffer {
  let state = seed >>> 0 || 1;
  const random = (): number => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  const normalize = (v: readonly number[]): [number, number, number] => {
    const inverse = 1 / Math.max(Math.hypot(v[0]!, v[1]!, v[2]!), 1e-8);
    return [v[0]! * inverse, v[1]! * inverse, v[2]! * inverse];
  };
  const data = new ArrayBuffer(count * AGENT_BYTES);
  const floats = new Float32Array(data);
  const integers = new Uint32Array(data);
  for (let i = 0; i < count; i += 1) {
    const base = i * 16;
    const radius = Math.cbrt(random());
    const azimuth = random() * Math.PI * 2;
    const vertical = random() * 2 - 1;
    const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const position: [number, number, number] = [
      Math.cos(azimuth) * horizontal * radius * 31,
      vertical * radius * 11 + preset.altitude,
      Math.sin(azimuth) * horizontal * radius * 27,
    ];
    const tangent = normalize([-position[2] + (random() - 0.5) * 12, (random() - 0.5) * 0.28, position[0] + (random() - 0.5) * 12]);
    const speed = preset.minSpeed + random() * (preset.maxSpeed - preset.minSpeed) * 0.55;
    floats.set([position[0], position[1], position[2], speed, tangent[0], tangent[1], tangent[2], 0, 0, 0, 0, random()], base);
    integers[base + 12] = i; integers[base + 13] = state; integers[base + 14] = 0; integers[base + 15] = 0;
  }
  return data;
}

/**
 * v1's writeParams (src/engine.ts), for one step: `frame` is the step's own
 * number since the seed and `time` its own model time.
 */
export function packParams(out: ArrayBuffer, offset: number, count: number, preset: MurmurationPreset, tool: ToolInput, frame: number, time: number, dt = DT): void {
  const u = new Uint32Array(out, offset, PARAM_BYTES / 4);
  const f = new Float32Array(out, offset, PARAM_BYTES / 4);
  u.set([count, CELL_COUNT, GRID.nx, GRID.ny, GRID.nz, tool.code, preset.id, frame >>> 0], 0);
  f.set([GRID.min[0], GRID.min[1], GRID.min[2], 0, GRID.cellSize, 1 / GRID.cellSize, 0, 0], 8);
  f.set([preset.separation, preset.alignment, preset.cohesion, preset.roost], 16);
  f.set([preset.minSpeed, preset.maxSpeed, preset.maxTurn, dt], 20);
  f.set([preset.hardRadius, preset.socialRadius, preset.blindCosine, preset.noise], 24);
  f.set([tool.position[0], tool.position[1], tool.position[2], tool.radius], 28);
  f.set([tool.direction[0], tool.direction[1], tool.direction[2], tool.strength], 32);
  f.set([preset.radii[0], preset.radii[1], preset.radii[2], preset.altitude], 36);
  f.set([time, 7.5, 0.72, 0], 40);
}

// The candidate loop of src/starling.wgsl, from its first line to the line
// that fetches a candidate, and the four closing braces after its body.
const GRID_LOOP_HEAD =
  "  for (var dz = -1; dz <= 1; dz += 1) {\n" +
  "    for (var dy = -1; dy <= 1; dy += 1) {\n" +
  "      for (var dx = -1; dx <= 1; dx += 1) {\n";
const GRID_LOOP_FETCH = "          let j = sorted_index[begin + slot];\n";
const GRID_LOOP_TAIL = "          best_id[insert] = j;\n        }\n      }\n    }\n  }\n";

/**
 * The brute-force twin of the live kernel: the same source with the 27-cell
 * loop replaced by a loop over every bird in id order. Throws if the live
 * kernel's text no longer has the expected shape.
 */
export function bruteSource(src: string): string {
  const once = (needle: string): number => {
    const at = src.indexOf(needle);
    if (at < 0 || src.indexOf(needle, at + 1) >= 0) throw new Error(`starling.wgsl changed shape: ${JSON.stringify(needle.slice(0, 40))}`);
    return at;
  };
  const head = once(GRID_LOOP_HEAD);
  const fetchAt = once(GRID_LOOP_FETCH);
  const tail = once(GRID_LOOP_TAIL);
  if (!(head < fetchAt && fetchAt < tail)) throw new Error("starling.wgsl changed shape: loop order");
  return (
    src.slice(0, head) +
    "  for (var j = 0u; j < p.counts.x; j += 1u) {\n" +
    src.slice(fetchAt + GRID_LOOP_FETCH.length, tail) +
    "          best_id[insert] = j;\n  }\n" +
    src.slice(tail + GRID_LOOP_TAIL.length)
  );
}

/** The live kernel's source as the page compiles it (shared with the brute twin). */
export const LIVE_STEP_SOURCE: string = starlingWgsl;

export interface FlockStats {
  centroid: [number, number, number];
  meanHeading: [number, number, number];
  polarization: number;
  meanSpeed: number;
  alertFraction: number;
  meanNeighbors: number;
  rmsRoll: number;
  milling: number;
  radius: number;
  verticalSpread: number;
  /** Covariance eigenvalues, largest first (model units²). */
  axes: [number, number, number];
  /** Smallest principal axis, rms (model units): the flock's thickness. */
  thickness: number;
  /** Mean distance to the nearest bird, over birds with one within the social reach. */
  nnd: number;
  /** Fraction of birds with no neighbour within the social reach. */
  isolated: number;
  count: number;
}

/** Eigenvalues of a symmetric 3×3 (Smith 1961, closed form), largest first. */
export function symEig3(xx: number, yy: number, zz: number, xy: number, xz: number, yz: number): [number, number, number] {
  const p1 = xy * xy + xz * xz + yz * yz;
  if (p1 < 1e-30 * (xx * xx + yy * yy + zz * zz + 1e-300)) {
    return [xx, yy, zz].sort((a, b) => b - a) as [number, number, number];
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
    readonly grid: Record<"clear" | "histogram" | "scan" | "scatter", GPUComputePipeline>,
    readonly step: GPUComputePipeline,
    readonly brute: GPUComputePipeline,
    readonly stats: readonly [GPUComputePipeline, GPUComputePipeline, GPUComputePipeline],
  ) {}

  static async create(device: GPUDevice): Promise<FlockKernels> {
    const C = GPUShaderStage.COMPUTE;
    // v1's layouts, with binding 0 a dynamic-offset view into the uniform ring
    const gridLayout = device.createBindGroupLayout({
      label: "murmur-grid",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: PARAM_BYTES } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
        { binding: 3, visibility: C, buffer: { type: "storage" } },
        { binding: 4, visibility: C, buffer: { type: "storage" } },
        { binding: 5, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const stepLayout = device.createBindGroupLayout({
      label: "murmur-step",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: PARAM_BYTES } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "storage" } },
        { binding: 3, visibility: C, buffer: { type: "storage" } },
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
    const gridModule = device.createShaderModule({ code: gridWgsl, label: "murmur-grid" });
    const stepModule = device.createShaderModule({ code: LIVE_STEP_SOURCE, label: "murmur-starling" });
    const bruteModule = device.createShaderModule({ code: bruteSource(LIVE_STEP_SOURCE), label: "murmur-starling-brute" });
    const statsModule = device.createShaderModule({ code: statsWgsl, label: "murmur-stats" });
    const observeModule = device.createShaderModule({ code: observeWgsl, label: "murmur-observe" });
    const gridPl = device.createPipelineLayout({ bindGroupLayouts: [gridLayout] });
    const stepPl = device.createPipelineLayout({ bindGroupLayouts: [stepLayout] });
    const statsPl = device.createPipelineLayout({ bindGroupLayouts: [statsLayout] });
    const g = (entryPoint: string): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({ label: `murmur-${entryPoint}`, layout: gridPl, compute: { module: gridModule, entryPoint } });
    const s = (module: GPUShaderModule, entryPoint: string): Promise<GPUComputePipeline> =>
      device.createComputePipelineAsync({ label: `murmur-${entryPoint}`, layout: statsPl, compute: { module, entryPoint } });
    const [clear, histogram, scan, scatter, step, brute, s0, s1, s2] = await Promise.all([
      g("clear_grid"),
      g("histogram"),
      g("scan_cells"),
      g("scatter"),
      device.createComputePipelineAsync({ label: "murmur-step", layout: stepPl, compute: { module: stepModule, entryPoint: "step" } }),
      device.createComputePipelineAsync({ label: "murmur-step-brute", layout: stepPl, compute: { module: bruteModule, entryPoint: "step" } }),
      s(statsModule, "reduce_stats"),
      s(statsModule, "reduce_shape"),
      s(observeModule, "reduce_extra"),
    ]);
    return new FlockKernels(gridLayout, stepLayout, statsLayout, { clear, histogram, scan, scatter }, step, brute, [s0, s1, s2]);
  }
}

export interface FlockCheckpoint {
  buffer: GPUBuffer;
  steps: number;
  count: number;
  preset: MurmurationPreset;
  seed: number;
}

/** One flock: its state ping-pong, its grid, its uniform ring and its instruments. */
export class Flock {
  readonly agents: readonly [GPUBuffer, GPUBuffer];
  readonly cellCount: GPUBuffer;
  readonly cellStart: GPUBuffer;
  readonly cellCursor: GPUBuffer;
  readonly sortedIndex: GPUBuffer;
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
  preset: MurmurationPreset = PRESETS[0]!;
  seed = 42;
  tool: ToolInput = { ...NO_TOOL };
  dt = DT;

  constructor(
    private readonly device: GPUDevice,
    private readonly kernels: FlockKernels,
    readonly capacity: number,
  ) {
    const usage = GPUBufferUsage;
    const mk = (size: number, u: number, label: string): GPUBuffer => device.createBuffer({ size, usage: u, label });
    this.count = capacity;
    this.agents = [
      mk(capacity * AGENT_BYTES, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC, "murmur-agents-a"),
      mk(capacity * AGENT_BYTES, usage.STORAGE | usage.COPY_DST | usage.COPY_SRC, "murmur-agents-b"),
    ];
    this.cellCount = mk(CELL_COUNT * 4, usage.STORAGE | usage.COPY_SRC, "murmur-cell-count");
    this.cellStart = mk(CELL_COUNT * 4, usage.STORAGE | usage.COPY_SRC, "murmur-cell-start");
    this.cellCursor = mk(CELL_COUNT * 4, usage.STORAGE, "murmur-cell-cursor");
    this.sortedIndex = mk(capacity * 4, usage.STORAGE | usage.COPY_SRC, "murmur-sorted-index");
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
          { binding: 2, resource: { buffer: this.cellCount } },
          { binding: 3, resource: { buffer: this.cellStart } },
          { binding: 4, resource: { buffer: this.cellCursor } },
          { binding: 5, resource: { buffer: this.sortedIndex } },
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
          { binding: 3, resource: { buffer: this.cellCount } },
          { binding: 4, resource: { buffer: this.cellStart } },
          { binding: 5, resource: { buffer: this.sortedIndex } },
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

  /** Seed `count` birds for `preset` (v1's reset), into both buffers. */
  reset(seed: number, preset: MurmurationPreset = this.preset, count: number = this.count): void {
    this.seed = seed >>> 0;
    this.preset = preset;
    this.count = Math.max(1, Math.min(this.capacity, Math.round(count)));
    const data = seedFlock(this.count, preset, this.seed);
    this.device.queue.writeBuffer(this.agents[0], 0, data);
    this.device.queue.writeBuffer(this.agents[1], 0, data);
    this.source = 0;
    this.steps = 0;
  }

  /** Load a state written elsewhere (Prove's fixtures): `data` is `count` agent records. */
  load(data: ArrayBuffer, preset: MurmurationPreset, steps = 0): void {
    this.count = Math.min(this.capacity, data.byteLength / AGENT_BYTES);
    this.preset = preset;
    this.device.queue.writeBuffer(this.agents[0], 0, data);
    this.device.queue.writeBuffer(this.agents[1], 0, data);
    this.source = 0;
    this.steps = steps;
  }

  /**
   * Encode `n` steps: per step, its uniforms into the next ring slot, the
   * grid (clear, histogram, scan, scatter) and the step — or, with `brute`,
   * the all-pairs twin (no grid).
   */
  encodeSteps(enc: GPUCommandEncoder, n: number, o: { brute?: boolean; timestampWrites?: GPUComputePassTimestampWrites } = {}): void {
    if (n <= 0) return;
    if (n > MAX_STEPS) throw new Error(`encodeSteps: at most ${MAX_STEPS} steps per call`);
    const first = this.cursor;
    for (let k = 0; k < n; k += 1) {
      const slot = (first + k) % RING_SLOTS;
      packParams(this.ringData, slot * SLOT, this.count, this.preset, this.tool, this.steps + k, (this.steps + k) * this.dt, this.dt);
    }
    // the slots, written in one or two contiguous runs
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
        pass.setBindGroup(0, this.gridGroups[this.source]!, offset);
        pass.setPipeline(k.grid.clear);
        pass.dispatchWorkgroups(Math.ceil(CELL_COUNT / 256));
        pass.setPipeline(k.grid.histogram);
        pass.dispatchWorkgroups(birds);
        pass.setPipeline(k.grid.scan);
        pass.dispatchWorkgroups(1);
        pass.setPipeline(k.grid.scatter);
        pass.dispatchWorkgroups(birds);
      }
      pass.setPipeline(o.brute ? k.brute : k.step);
      pass.setBindGroup(0, this.stepGroups[this.source]!, offset);
      pass.dispatchWorkgroups(Math.ceil(this.count / 128));
      this.source = 1 - this.source;
    }
    pass.end();
    this.steps += n;
  }

  /** Encode only the grid build for the current state (Prove's permutation check). */
  encodeGrid(enc: GPUCommandEncoder): void {
    const slot = this.cursor;
    packParams(this.ringData, slot * SLOT, this.count, this.preset, this.tool, this.steps, this.time, this.dt);
    this.device.queue.writeBuffer(this.ring, slot * SLOT, this.ringData, slot * SLOT, SLOT);
    this.cursor = (slot + 1) % RING_SLOTS;
    const k = this.kernels;
    const pass = enc.beginComputePass({ label: "murmur-grid-only" });
    pass.setBindGroup(0, this.gridGroups[this.source]!, [slot * SLOT]);
    pass.setPipeline(k.grid.clear);
    pass.dispatchWorkgroups(Math.ceil(CELL_COUNT / 256));
    pass.setPipeline(k.grid.histogram);
    pass.dispatchWorkgroups(Math.ceil(this.count / 256));
    pass.setPipeline(k.grid.scan);
    pass.dispatchWorkgroups(1);
    pass.setPipeline(k.grid.scatter);
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
    return { buffer, steps: this.steps, count: this.count, preset: this.preset, seed: this.seed };
  }

  restore(c: FlockCheckpoint): void {
    const bytes = c.count * AGENT_BYTES;
    const enc = this.device.createCommandEncoder({ label: "murmur-restore" });
    enc.copyBufferToBuffer(c.buffer, 0, this.agents[0], 0, bytes);
    enc.copyBufferToBuffer(c.buffer, 0, this.agents[1], 0, bytes);
    this.device.queue.submit([enc.finish()]);
    this.source = 0;
    this.steps = c.steps;
    this.count = c.count;
    this.preset = c.preset;
    this.seed = c.seed;
  }

  releaseCheckpoint(c: FlockCheckpoint): void {
    c.buffer.destroy();
  }

  destroy(): void {
    for (const b of [...this.agents, this.cellCount, this.cellStart, this.cellCursor, this.sortedIndex, this.ring, this.statsParams, this.statsBuffer]) b.destroy();
  }
}
