// Water in Hand — the live water: the shipped DFSPH (Bender & Koschier 2015)
// with the recorded 2026-07 live recipe, on its own buffers sized for the
// tier, in a glass.
//
// Kernels:
//   * the shipped broadphase (packages/sph-water/src/sph_core.wgsl: clear →
//     histogram → two-level Blelloch scan → scatter → per-cell id-sort →
//     reorder), unchanged;
//   * the shipped DFSPH passes (packages/sph-water/src/dfsph_solver.wgsl),
//     unchanged — `solver = "shipped"` runs them as v1 does;
//   * the same passes over per-step neighbour lists (model/lists.wgsl) —
//     `solver = "lists"`, the default: one stencil walk a step instead of ~26,
//     the same float sums in the same order;
//   * the glass (a cylinder wall and floor after the shipped box walls), a
//     velocity commit inside the pass (v1 copied the buffer), and the drop
//     scatter.
//
// The recipe (sph-water spec § 8.3 and the 2026-07 sweep): h = 1.2 spacing,
// dt = 0.4 h / 5, 8 density and 4 divergence iterations, warm start off,
// speed cap 0.315 · 2h / dt, XSPH, restitution 0.02, friction 0.002 — and
// the lattice mass re-measured at this scale: v1's ρ₀ s³ × 1.07 assumed a
// lattice sums to 0.93 ρ₀, but an interior lattice at h = 1.2 s sums to
// 1.00081 ρ₀ (latticeSum; the GPU measures 1000.8 kg/m³), so × 1.07 starts
// the glass 7 % compressed and its first step throws particles at 6.2 m/s.
// The mass is ρ₀ s³ / latticeSum(1.2): the interior starts at ρ₀.
//
// Determinism: the broadphase's per-cell id-sort makes every gather
// order-deterministic and the only atomics are integer; edits (drops) land at
// step boundaries from positions read at that step. Same device, same seed,
// same edits ⇒ the same bytes.

import { hash3, unit } from "@bp/runtime";
import coreWgsl from "../../../../src/sph_core.wgsl?raw";
import dfsphWgsl from "../../../../src/dfsph_solver.wgsl?raw";
import listsWgsl from "./lists.wgsl?raw";

export type V3 = [number, number, number];
export type SolverKind = "lists" | "shipped";

/** The glass, metres: a cylinder standing on the table (y up). */
export interface Glass {
  /** Inner radius (the water's wall). */
  radius: number;
  /** Wall thickness (rendering). */
  wall: number;
  /** Height of the inner floor above the table (the thick base). */
  floor: number;
  /** Rim height above the table. */
  height: number;
}

export const GLASS: Glass = { radius: 0.3, wall: 0.018, floor: 0.05, height: 0.95 };
/** Water depth in the glass at rest (above the inner floor), metres. */
export const FILL = 0.38;
/** The dropped blob's radius, metres. */
export const BLOB_RADIUS = 0.075;
export const RHO0 = 1000;
export const GRAVITY = 9.81;

/** Particles a list may hold (≈1.7× the 56 neighbours measured at rest). */
export const LIST_K = 96;

export interface Recipe {
  n: number;
  spacing: number;
  h: number;
  dt: number;
  mass: number;
  vmax: number;
}

/** Fluid volume of the scene: the fill plus one blob. */
export function fluidVolume(): number {
  return Math.PI * GLASS.radius ** 2 * FILL + (4 / 3) * Math.PI * BLOB_RADIUS ** 3;
}

/** Smoothing length per lattice spacing (the recipe). */
export const H_PER_SPACING = 1.2;

/**
 * Σ_j W(|x_j|, h) s³ over an infinite cubic lattice of spacing s, at h = hs·s:
 * the support-2h cubic spline's (σ₃ = 1/(π h³)) density of a unit-mass-per-
 * cell lattice, self term included — what an interior particle sums to.
 */
export function latticeSum(hs: number): number {
  const m = Math.ceil(2 * hs) + 1;
  let tot = 0;
  for (let i = -m; i <= m; i += 1)
    for (let j = -m; j <= m; j += 1)
      for (let k = -m; k <= m; k += 1) {
        const q = Math.sqrt(i * i + j * j + k * k) / hs;
        const f = q < 1 ? 1 - 1.5 * q * q + 0.75 * q * q * q : q < 2 ? 0.25 * (2 - q) ** 3 : 0;
        tot += (1 / Math.PI / hs ** 3) * f;
      }
  return tot;
}

const LATTICE_SUM = latticeSum(H_PER_SPACING);

/** The live recipe at a particle budget (spacing from the scene's volume). */
export function recipeFor(nTarget: number): Recipe {
  const spacing = Math.cbrt(fluidVolume() / Math.max(nTarget, 1));
  const h = H_PER_SPACING * spacing;
  const dt = (0.4 * h) / 5.0;
  return { n: nTarget, spacing, h, dt, mass: (RHO0 * spacing ** 3) / LATTICE_SUM, vmax: (0.315 * 2 * h) / dt };
}

/**
 * Lattice points (cell centres) filling the glass to `level` above its floor,
 * and a blob centred at `blob`, in z-y-x order.
 */
export function seedPositions(spacing: number, level: number, blob: V3 | null): { fill: Float32Array; blob: Float32Array } {
  const pts: number[] = [];
  const R = GLASS.radius - 0.5 * spacing;
  const y0 = GLASS.floor + 0.5 * spacing;
  for (let z = -R; z <= R; z += spacing)
    for (let y = y0; y < GLASS.floor + level; y += spacing)
      for (let x = -R; x <= R; x += spacing) if (x * x + z * z <= R * R) pts.push(x, y, z);
  return { fill: new Float32Array(pts), blob: blob ? blobPositions(spacing, blob) : new Float32Array(0) };
}

/** A sphere of lattice points of BLOB_RADIUS around c. */
export function blobPositions(spacing: number, c: V3): Float32Array {
  const pts: number[] = [];
  const r = BLOB_RADIUS;
  const m = Math.floor(r / spacing);
  for (let k = -m; k <= m; k += 1)
    for (let j = -m; j <= m; j += 1)
      for (let i = -m; i <= m; i += 1) {
        const x = i * spacing;
        const y = j * spacing;
        const z = k * spacing;
        if (x * x + y * y + z * z <= r * r) pts.push(c[0] + x, c[1] + y, c[2] + z);
      }
  return new Float32Array(pts);
}

/** Water level at rest above the table, with the blob merged in. */
export function restingLevel(): number {
  return GLASS.floor + FILL + ((4 / 3) * Math.PI * BLOB_RADIUS ** 3) / (Math.PI * GLASS.radius ** 2);
}

/** Where the director drops its k-th blob for this seed (inside the glass, clear of the wall). */
export function directorSpot(seed: number, k: number): [number, number] {
  const r = (GLASS.radius - BLOB_RADIUS) * 0.75 * Math.sqrt(unit(hash3(seed, 7, k)));
  const a = 2 * Math.PI * unit(hash3(seed, 11, k));
  return [r * Math.cos(a), r * Math.sin(a)];
}

/**
 * Pick the `count` highest particles (largest y; ties by lower original index
 * — `orig`, or the array index when it is omitted). Returns array indices in
 * ascending order. Deterministic.
 */
export function highest(posXyzw: Float32Array, n: number, count: number, orig?: Uint32Array): Uint32Array {
  const k = Math.min(count, n);
  if (k <= 0) return new Uint32Array(0);
  const ys = new Float32Array(n);
  for (let i = 0; i < n; i += 1) ys[i] = posXyzw[i * 4 + 1]!;
  const sorted = ys.slice().sort();
  const cut = sorted[n - k]!;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) if (ys[i]! > cut) out.push(i);
  const ties: number[] = [];
  for (let i = 0; i < n; i += 1) if (ys[i] === cut) ties.push(i);
  if (orig) ties.sort((a, b) => orig[a]! - orig[b]!);
  for (const i of ties) {
    if (out.length >= k) break;
    out.push(i);
  }
  return Uint32Array.from(out).sort();
}

const CORE_BINDINGS: Record<string, number[]> = {
  clear_cells: [0, 4],
  histogram: [0, 1, 4, 8],
  scan_blocks: [0, 5, 11, 12],
  scan_block_sums: [0, 12],
  scan_add_offsets: [0, 5, 12],
  seed_cursor: [0, 5, 6],
  scatter: [0, 6, 7, 8],
  cell_sort: [0, 5, 7, 14],
  reorder: [0, 1, 2, 7, 9, 10],
};

const DF_BINDINGS: Record<string, number[]> = {
  df_density_alpha: [0, 1, 4, 7, 8, 9],
  df_xsph: [0, 1, 2, 3, 4, 7, 8, 9],
  df_apply_ext: [0, 1, 3],
  df_warm_start: [0, 5, 6],
  df_predict_density: [0, 1, 3, 4, 5, 6, 7, 8, 9],
  df_predict_divergence: [0, 1, 3, 4, 5, 7, 8, 9],
  df_apply_kappa: [0, 1, 3, 4, 5, 7, 8, 9],
  df_integrate: [0, 1, 3],
};

const LIST_BINDINGS: Record<string, number[]> = {
  nbr_build: [0, 1, 7, 8, 9, 10, 11, 12, 13],
  l_density_alpha: [0, 1, 4, 10, 11, 12, 22],
  l_xsph: [0, 1, 2, 3, 10, 11, 12, 22],
  l_predict_density: [0, 1, 3, 4, 5, 6, 10, 11, 12, 23],
  l_predict_divergence: [0, 1, 3, 4, 5, 10, 11, 12, 23],
  l_apply_kappa: [0, 1, 3, 5, 10, 11, 12, 22],
  glass_constrain: [1, 3, 14],
  cell_sort_orig: [0, 8, 9, 13, 19],
  resort_gather: [0, 8, 19, 20],
  resort_commit: [0, 1, 2, 7, 19, 20, 21],
  commit_vel: [0, 2, 3],
  drop_scatter: [1, 2, 6, 15, 16, 17],
};

type Pipe = { pipeline: GPUComputePipeline; bg: GPUBindGroup };

/** Compiled kernels (shared by every Water of a page). */
export class WaterKernels {
  private constructor(
    readonly core: GPUShaderModule,
    readonly df: GPUShaderModule,
    readonly lists: GPUShaderModule,
    readonly pipes: Map<string, GPUComputePipeline>,
  ) {}

  static async create(device: GPUDevice): Promise<WaterKernels> {
    const core = device.createShaderModule({ label: "sph_core", code: coreWgsl });
    const df = device.createShaderModule({ label: "dfsph_solver", code: dfsphWgsl });
    const lists = device.createShaderModule({ label: "water-lists", code: listsWgsl });
    const pipes = new Map<string, GPUComputePipeline>();
    const all: [GPUShaderModule, Record<string, number[]>][] = [
      [core, CORE_BINDINGS],
      [df, DF_BINDINGS],
      [lists, LIST_BINDINGS],
    ];
    await Promise.all(
      all.flatMap(([module, b]) =>
        Object.keys(b).map(async (entryPoint) => {
          pipes.set(entryPoint, await device.createComputePipelineAsync({ label: entryPoint, layout: "auto", compute: { module, entryPoint } }));
        }),
      ),
    );
    return new WaterKernels(core, df, lists, pipes);
  }
}

export interface WaterCheckpoint {
  pos: GPUBuffer;
  vel: GPUBuffer;
  kappaTotal: GPUBuffer;
  orig: GPUBuffer;
  n: number;
  steps: number;
  time: number;
}

export interface WaterDiagnostics {
  n: number;
  /** Mean and largest compression (ρ − ρ₀)/ρ₀ over particles with a full neighbourhood. */
  meanCompression: number;
  maxCompression: number;
  interior: number;
  meanSpeed: number;
  maxSpeed: number;
  maxNeighbours: number;
  /** Particles whose list overflowed this run (0 at the recipe's densities). */
  listOverflow: number;
}

/** One glass of water on the GPU. */
/** Steps between permutations of the particle arrays into cell order. */
export const RESORT_EVERY = 32;

export class Water {
  readonly maxN: number;
  /** Permute the particle arrays into cell order every RESORT_EVERY steps (lists only). */
  resort = true;
  n = 0;
  steps = 0;
  /** Model time, s. */
  time = 0;
  solver: SolverKind = "lists";
  recipe: Recipe;
  gravity: V3 = [0, -GRAVITY, 0];
  xsphAlpha = 0.06;
  readonly buf: Record<string, GPUBuffer>;
  private readonly p = new Map<string, Pipe>();
  private nCells = 0;
  private grid = { origin: [0, 0, 0] as V3, dims: [1, 1, 1] as V3, cell: 1 };
  private readonly maxCells = 262144;
  private readonly maxDrop: number;

  constructor(
    readonly device: GPUDevice,
    readonly kernels: WaterKernels,
    maxN: number,
  ) {
    this.maxN = maxN;
    this.recipe = recipeFor(maxN);
    this.maxDrop = Math.max(4096, Math.ceil(((4 / 3) * Math.PI * BLOB_RADIUS ** 3) / this.recipe.spacing ** 3) * 2);
    const S = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const U = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    const mk = (label: string, size: number, usage = S): GPUBuffer => device.createBuffer({ label: `water-${label}`, size, usage });
    this.buf = {
      simParams: mk("simParams", 64, U),
      liveParams: mk("liveParams", 176, U),
      listParams: mk("listParams", 16, U),
      glassParams: mk("glassParams", 32, U),
      dropParams: mk("dropParams", 16, U),
      pos: mk("pos", maxN * 16),
      vel: mk("vel", maxN * 16),
      velOut: mk("velOut", maxN * 16),
      partAux: mk("partAux", maxN * 16),
      kappa: mk("kappa", maxN * 4),
      kappaTotal: mk("kappaTotal", maxN * 4),
      orig: mk("orig", maxN * 4),
      rho: mk("rho", maxN * 4),
      kappaSum: mk("kappaSum", maxN * 4),
      origTmp: mk("origTmp", maxN * 4),
      cellCount: mk("cellCount", this.maxCells * 4),
      cellStart: mk("cellStart", (this.maxCells + 1) * 4),
      cursor: mk("cursor", this.maxCells * 4),
      sortedIdx: mk("sortedIdx", maxN * 4),
      cellOf: mk("cellOf", maxN * 4),
      posSorted: mk("posSorted", maxN * 16),
      velSorted: mk("velSorted", maxN * 16),
      blockSums: mk("blockSums", 512 * 4),
      flags: mk("flags", 16),
      nbr: mk("nbr", maxN * LIST_K * 4),
      nbrCount: mk("nbrCount", maxN * 4),
      lflags: mk("lflags", 16),
      dropIdx: mk("dropIdx", this.maxDrop * 4),
      dropPos: mk("dropPos", this.maxDrop * 16),
    };
    const b = this.buf;
    const core: Record<number, GPUBuffer> = {
      0: b.simParams!, 1: b.pos!, 2: b.vel!, 4: b.cellCount!, 5: b.cellStart!, 6: b.cursor!, 7: b.sortedIdx!, 8: b.cellOf!,
      9: b.posSorted!, 10: b.velSorted!, 11: b.cellCount!, 12: b.blockSums!, 14: b.flags!,
    };
    const live: Record<number, GPUBuffer> = {
      0: b.liveParams!, 1: b.pos!, 2: b.vel!, 3: b.velOut!, 4: b.partAux!, 5: b.kappa!, 6: b.kappaTotal!, 7: b.posSorted!,
      8: b.sortedIdx!, 9: b.cellStart!, 10: b.nbr!, 11: b.nbrCount!, 12: b.listParams!, 13: b.lflags!, 14: b.glassParams!,
      15: b.dropParams!, 16: b.dropIdx!, 17: b.dropPos!, 19: b.orig!, 20: b.origTmp!, 21: b.velSorted!, 22: b.rho!, 23: b.kappaSum!,
    };
    const bind = (bindings: Record<string, number[]>, byBinding: Record<number, GPUBuffer>): void => {
      for (const [entry, list] of Object.entries(bindings)) {
        const pipeline = kernels.pipes.get(entry)!;
        const bg = device.createBindGroup({
          label: entry,
          layout: pipeline.getBindGroupLayout(0),
          entries: list.map((binding) => ({ binding, resource: { buffer: byBinding[binding]! } })),
        });
        this.p.set(entry, { pipeline, bg });
      }
    };
    bind(CORE_BINDINGS, core);
    bind(DF_BINDINGS, live);
    bind(LIST_BINDINGS, live);
    device.queue.writeBuffer(b.listParams!, 0, new Uint32Array([LIST_K, maxN, 0, 0]));
  }

  // ------------------------------------------------------------ setup --

  /** Seed the glass with `positions` (xyz triples) at rest under the recipe for `nTarget`. */
  seed(positions: Float32Array, recipe: Recipe): void {
    const n = positions.length / 3;
    if (n > this.maxN) throw new Error(`too many particles: ${n} > ${this.maxN}`);
    this.n = n;
    this.recipe = recipe;
    this.steps = 0;
    this.time = 0;
    const p4 = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      p4[i * 4] = positions[i * 3]!;
      p4[i * 4 + 1] = positions[i * 3 + 1]!;
      p4[i * 4 + 2] = positions[i * 3 + 2]!;
    }
    const q = this.device.queue;
    q.writeBuffer(this.buf.pos!, 0, p4);
    q.writeBuffer(this.buf.vel!, 0, new Float32Array(n * 4));
    q.writeBuffer(this.buf.velOut!, 0, new Float32Array(n * 4));
    q.writeBuffer(this.buf.kappaTotal!, 0, new Float32Array(n));
    const orig = new Uint32Array(n);
    for (let i = 0; i < n; i += 1) orig[i] = i;
    q.writeBuffer(this.buf.orig!, 0, orig);
    q.writeBuffer(this.buf.flags!, 0, new Uint32Array(4));
    q.writeBuffer(this.buf.lflags!, 0, new Uint32Array(4));
    this.layoutGrid();
    this.writeParams();
  }

  private layoutGrid(): void {
    const cell = 2 * this.recipe.h;
    const R = GLASS.radius;
    const lo: V3 = [-R - cell, GLASS.floor - cell, -R - cell];
    const top = GLASS.height + 0.6;
    const dims: V3 = [Math.ceil((2 * R + 2 * cell) / cell), Math.ceil((top - lo[1] + cell) / cell), Math.ceil((2 * R + 2 * cell) / cell)];
    const nCells = dims[0] * dims[1] * dims[2];
    if (nCells > this.maxCells) throw new Error(`grid too large: ${nCells}`);
    this.grid = { origin: lo, dims, cell };
    this.nCells = nCells;
  }

  /** The shipped SimParams (grid only: the canonical increments are zero) and LiveParams, packed as v1 packs them. */
  writeParams(): void {
    const r = this.recipe;
    const [nx, ny, nz] = this.grid.dims;
    {
      const ab = new ArrayBuffer(64);
      const dv = new DataView(ab);
      dv.setUint32(0, this.n, true);
      dv.setUint32(4, nx, true);
      dv.setUint32(8, ny, true);
      dv.setUint32(12, nz, true);
      dv.setUint32(16, this.nCells, true);
      dv.setFloat32(24, 1.0 / this.grid.cell, true);
      dv.setFloat32(28, r.h, true);
      dv.setFloat32(32, this.grid.origin[0], true);
      dv.setFloat32(36, this.grid.origin[1], true);
      dv.setFloat32(40, this.grid.origin[2], true);
      dv.setFloat32(44, 0, true);
      dv.setFloat32(48, r.dt, true);
      dv.setFloat32(52, r.mass, true);
      this.device.queue.writeBuffer(this.buf.simParams!, 0, ab);
    }
    {
      const ab = new ArrayBuffer(176);
      const dv = new DataView(ab);
      const R = GLASS.radius;
      dv.setUint32(0, this.n, true);
      dv.setUint32(4, nx, true);
      dv.setUint32(8, ny, true);
      dv.setUint32(12, nz, true);
      dv.setUint32(16, this.nCells, true);
      dv.setUint32(20, 0, true); // warm start off (Carensac et al. 2022)
      dv.setFloat32(24, 1.0 / this.grid.cell, true);
      dv.setFloat32(28, r.h, true);
      dv.setFloat32(32, this.grid.origin[0], true);
      dv.setFloat32(36, this.grid.origin[1], true);
      dv.setFloat32(40, this.grid.origin[2], true);
      dv.setFloat32(44, r.dt, true);
      dv.setFloat32(48, this.gravity[0], true);
      dv.setFloat32(52, this.gravity[1], true);
      dv.setFloat32(56, this.gravity[2], true);
      dv.setFloat32(60, r.mass, true);
      // the shipped box walls: the glass's bounding box, open well above the rim
      dv.setFloat32(64, -R, true);
      dv.setFloat32(68, GLASS.floor, true);
      dv.setFloat32(72, -R, true);
      dv.setFloat32(76, RHO0, true);
      dv.setFloat32(80, R, true);
      dv.setFloat32(84, GLASS.height + 0.55, true);
      dv.setFloat32(88, R, true);
      dv.setFloat32(92, this.xsphAlpha, true);
      // obstacle, impulse: off
      for (let k = 0; k < 12; k += 1) dv.setFloat32(96 + k * 4, 0, true);
      dv.setFloat32(140, 1, true); // impulse falloff exponent (unused while off)
      dv.setFloat32(144, 0.02, true); // restitution
      dv.setFloat32(148, 0.002, true); // friction
      dv.setFloat32(152, 1e6, true); // kappa clamp
      dv.setFloat32(156, 20, true); // surface neighbour count
      dv.setFloat32(160, r.vmax, true);
      this.device.queue.writeBuffer(this.buf.liveParams!, 0, ab);
    }
    const g = new Float32Array([0, 0, GLASS.radius, GLASS.floor, 0.02, 0.002, 1e-4, this.n]);
    this.device.queue.writeBuffer(this.buf.glassParams!, 0, g);
  }

  // ------------------------------------------------------------- step --

  private dispatch(pass: GPUComputePassEncoder, name: string, groups: number): void {
    const p = this.p.get(name)!;
    pass.setPipeline(p.pipeline);
    pass.setBindGroup(0, p.bg);
    pass.dispatchWorkgroups(groups);
  }

  private encodeGridBuild(pass: GPUComputePassEncoder, byOrig = this.solver === "lists"): void {
    const gc = Math.ceil(this.nCells / 256);
    const gp = Math.ceil(this.n / 64);
    this.dispatch(pass, "clear_cells", gc);
    this.dispatch(pass, "histogram", gp);
    this.dispatch(pass, "scan_blocks", Math.ceil(this.nCells / 512));
    this.dispatch(pass, "scan_block_sums", 1);
    this.dispatch(pass, "scan_add_offsets", gc);
    this.dispatch(pass, "seed_cursor", gc);
    this.dispatch(pass, "scatter", gp);
    this.dispatch(pass, byOrig ? "cell_sort_orig" : "cell_sort", Math.ceil(this.nCells / 64));
    this.dispatch(pass, "reorder", gp);
  }

  /** Record `steps` solver steps in one compute pass. */
  encodeSteps(enc: GPUCommandEncoder, steps: number, timestampWrites?: GPUComputePassTimestampWrites): void {
    if (this.n === 0 || steps <= 0) return;
    const gp = Math.ceil(this.n / 64);
    const pass = enc.beginComputePass({ label: "water-steps", timestampWrites });
    const lists = this.solver === "lists";
    for (let s = 0; s < steps; s += 1) {
      // every RESORT_EVERY steps, permute the particles into cell order (lists only)
      if (lists && this.resort && (this.steps + s) % RESORT_EVERY === 0) {
        this.encodeGridBuild(pass);
        this.dispatch(pass, "resort_gather", gp);
        this.dispatch(pass, "resort_commit", gp);
      }
      this.encodeGridBuild(pass);
      if (lists) {
        this.dispatch(pass, "nbr_build", gp);
        this.dispatch(pass, "l_density_alpha", gp);
        this.dispatch(pass, "l_xsph", gp);
      } else {
        this.dispatch(pass, "df_density_alpha", gp);
        this.dispatch(pass, "df_xsph", gp);
      }
      this.dispatch(pass, "df_apply_ext", gp);
      this.dispatch(pass, "df_warm_start", gp);
      for (let it = 0; it < 8; it += 1) {
        this.dispatch(pass, lists ? "l_predict_density" : "df_predict_density", gp);
        this.dispatch(pass, lists ? "l_apply_kappa" : "df_apply_kappa", gp);
      }
      for (let it = 0; it < 4; it += 1) {
        this.dispatch(pass, lists ? "l_predict_divergence" : "df_predict_divergence", gp);
        this.dispatch(pass, lists ? "l_apply_kappa" : "df_apply_kappa", gp);
      }
      this.dispatch(pass, "df_integrate", gp);
      this.dispatch(pass, "glass_constrain", gp);
      this.dispatch(pass, "commit_vel", gp);
    }
    pass.end();
    this.steps += steps;
    this.time += steps * this.recipe.dt;
  }

  // ------------------------------------------------------------ drops --

  /** Read every particle's position (xyzw) and original index, e.g. to choose a drop. */
  async readPositions(): Promise<{ pos: Float32Array; orig: Uint32Array }> {
    const [p, o] = await Promise.all([this.read(this.buf.pos!, this.n * 16), this.read(this.buf.orig!, this.n * 4)]);
    return { pos: new Float32Array(p), orig: new Uint32Array(o) };
  }

  /** Move `idx` to the lattice points `at` (xyz triples), at rest — a drop. */
  encodeDrop(enc: GPUCommandEncoder, idx: Uint32Array, at: Float32Array): void {
    const k = Math.min(idx.length, at.length / 3, this.maxDrop);
    if (k <= 0) return;
    const p4 = new Float32Array(k * 4);
    for (let i = 0; i < k; i += 1) p4.set([at[i * 3]!, at[i * 3 + 1]!, at[i * 3 + 2]!, 0], i * 4);
    const q = this.device.queue;
    q.writeBuffer(this.buf.dropIdx!, 0, idx, 0, k);
    q.writeBuffer(this.buf.dropPos!, 0, p4);
    q.writeBuffer(this.buf.dropParams!, 0, new Uint32Array([k, 0, 0, 0]));
    const pass = enc.beginComputePass({ label: "water-drop" });
    this.dispatch(pass, "drop_scatter", Math.ceil(k / 64));
    pass.end();
  }

  // ------------------------------------------------------- readbacks --

  async read(src: GPUBuffer, bytes: number): Promise<ArrayBuffer> {
    const rb = this.device.createBuffer({ size: Math.max(4, bytes), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "water-readback" });
    const enc = this.device.createCommandEncoder({ label: "water-readback" });
    enc.copyBufferToBuffer(src, 0, rb, 0, Math.max(4, bytes));
    this.device.queue.submit([enc.finish()]);
    try {
      await rb.mapAsync(GPUMapMode.READ);
      return rb.getMappedRange().slice(0, bytes);
    } finally {
      rb.destroy();
    }
  }

  /** Everything the instruments need, for every particle. */
  async readState(): Promise<{ pos: Float32Array; vel: Float32Array; aux: Float32Array; kappaTotal: Float32Array; overflow: number }> {
    const n = this.n;
    const [pos, vel, aux, kt, lf] = await Promise.all([
      this.read(this.buf.pos!, n * 16),
      this.read(this.buf.vel!, n * 16),
      this.read(this.buf.partAux!, n * 16),
      this.read(this.buf.kappaTotal!, n * 4),
      this.read(this.buf.lflags!, 16),
    ]);
    return {
      pos: new Float32Array(pos),
      vel: new Float32Array(vel),
      aux: new Float32Array(aux),
      kappaTotal: new Float32Array(kt),
      overflow: new Uint32Array(lf)[0]!,
    };
  }

  /** Positions, velocities and accumulated stiffness in original-particle order (undoing any re-sort). */
  async readOrdered(): Promise<{ pos: Float32Array; vel: Float32Array; kappaTotal: Float32Array }> {
    const n = this.n;
    const [p, v, k, o] = await Promise.all([
      this.read(this.buf.pos!, n * 16),
      this.read(this.buf.vel!, n * 16),
      this.read(this.buf.kappaTotal!, n * 4),
      this.read(this.buf.orig!, n * 4),
    ]);
    const P = new Float32Array(p);
    const Vv = new Float32Array(v);
    const K = new Float32Array(k);
    const O = new Uint32Array(o);
    const pos = new Float32Array(n * 4);
    const vel = new Float32Array(n * 4);
    const kappaTotal = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = O[i]!;
      pos.set(P.subarray(i * 4, i * 4 + 4), t * 4);
      vel.set(Vv.subarray(i * 4, i * 4 + 4), t * 4);
      kappaTotal[t] = K[i]!;
    }
    return { pos, vel, kappaTotal };
  }

  /** sha256 of the state the next step reads, particle by particle in original order. */
  async stateHash(): Promise<string> {
    const s = await this.readOrdered();
    const all = new Uint8Array(s.pos.byteLength + s.vel.byteLength + s.kappaTotal.byteLength);
    all.set(new Uint8Array(s.pos.buffer), 0);
    all.set(new Uint8Array(s.vel.buffer), s.pos.byteLength);
    all.set(new Uint8Array(s.kappaTotal.buffer), s.pos.byteLength + s.vel.byteLength);
    const d = await crypto.subtle.digest("SHA-256", all);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  /** Put the particles back in original order (the shipped solver's own order), keeping the state. */
  async unpermute(): Promise<void> {
    const s = await this.readOrdered();
    const n = this.n;
    const q = this.device.queue;
    q.writeBuffer(this.buf.pos!, 0, s.pos);
    q.writeBuffer(this.buf.vel!, 0, s.vel);
    q.writeBuffer(this.buf.velOut!, 0, s.vel);
    q.writeBuffer(this.buf.kappaTotal!, 0, s.kappaTotal);
    const orig = new Uint32Array(n);
    for (let i = 0; i < n; i += 1) orig[i] = i;
    q.writeBuffer(this.buf.orig!, 0, orig);
    await q.onSubmittedWorkDone();
  }

  /** Start a pressure-averaging window (lists solver only). */
  resetPressure(): void {
    this.device.queue.writeBuffer(this.buf.kappaSum!, 0, new Float32Array(this.n));
  }

  /** Positions, densities and the κ summed since resetPressure (array order). */
  async readPressure(): Promise<{ pos: Float32Array; aux: Float32Array; kappaSum: Float32Array }> {
    const n = this.n;
    const [p, a, k] = await Promise.all([this.read(this.buf.pos!, n * 16), this.read(this.buf.partAux!, n * 16), this.read(this.buf.kappaSum!, n * 4)]);
    return { pos: new Float32Array(p), aux: new Float32Array(a), kappaSum: new Float32Array(k) };
  }

  // ----------------------------------------------------- checkpoints --

  capture(): WaterCheckpoint {
    const n = this.n;
    const mk = (size: number): GPUBuffer =>
      this.device.createBuffer({ size: Math.max(16, size), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, label: "water-checkpoint" });
    const c: WaterCheckpoint = { pos: mk(n * 16), vel: mk(n * 16), kappaTotal: mk(n * 4), orig: mk(n * 4), n, steps: this.steps, time: this.time };
    const enc = this.device.createCommandEncoder({ label: "water-capture" });
    enc.copyBufferToBuffer(this.buf.pos!, 0, c.pos, 0, n * 16);
    enc.copyBufferToBuffer(this.buf.vel!, 0, c.vel, 0, n * 16);
    enc.copyBufferToBuffer(this.buf.kappaTotal!, 0, c.kappaTotal, 0, n * 4);
    enc.copyBufferToBuffer(this.buf.orig!, 0, c.orig, 0, n * 4);
    this.device.queue.submit([enc.finish()]);
    return c;
  }

  restore(c: WaterCheckpoint): void {
    const n = c.n;
    const enc = this.device.createCommandEncoder({ label: "water-restore" });
    enc.copyBufferToBuffer(c.pos, 0, this.buf.pos!, 0, n * 16);
    enc.copyBufferToBuffer(c.vel, 0, this.buf.vel!, 0, n * 16);
    enc.copyBufferToBuffer(c.vel, 0, this.buf.velOut!, 0, n * 16);
    enc.copyBufferToBuffer(c.kappaTotal, 0, this.buf.kappaTotal!, 0, n * 4);
    enc.copyBufferToBuffer(c.orig, 0, this.buf.orig!, 0, n * 4);
    this.device.queue.submit([enc.finish()]);
    this.n = n;
    this.steps = c.steps;
    this.time = c.time;
    this.writeParams();
  }

  releaseCheckpoint(c: WaterCheckpoint): void {
    c.pos.destroy();
    c.vel.destroy();
    c.kappaTotal.destroy();
    c.orig.destroy();
  }

  get gridDims(): V3 {
    return [...this.grid.dims];
  }

  destroy(): void {
    for (const b of Object.values(this.buf)) b.destroy();
  }
}

/** Instruments from a full readback: compression, speeds, neighbours. */
export function diagnose(s: { pos: Float32Array; vel: Float32Array; aux: Float32Array; overflow: number }, n: number): WaterDiagnostics {
  let sumC = 0;
  let maxC = 0;
  let interior = 0;
  let sumS = 0;
  let maxS = 0;
  let maxNb = 0;
  for (let i = 0; i < n; i += 1) {
    const rho = s.aux[i * 4]!;
    const nb = s.aux[i * 4 + 2]!;
    maxNb = Math.max(maxNb, nb);
    // a full neighbourhood: the surface and the walls have fewer neighbours,
    // so their summed density is low by construction (no boundary particles)
    if (nb >= 45) {
      const c = Math.max(0, (rho - RHO0) / RHO0);
      sumC += c;
      maxC = Math.max(maxC, c);
      interior += 1;
    }
    const sp = Math.hypot(s.vel[i * 4]!, s.vel[i * 4 + 1]!, s.vel[i * 4 + 2]!);
    sumS += sp;
    maxS = Math.max(maxS, sp);
  }
  return {
    n,
    meanCompression: interior > 0 ? sumC / interior : 0,
    maxCompression: maxC,
    interior,
    meanSpeed: n > 0 ? sumS / n : 0,
    maxSpeed: maxS,
    maxNeighbours: maxNb,
    listOverflow: s.overflow,
  };
}
