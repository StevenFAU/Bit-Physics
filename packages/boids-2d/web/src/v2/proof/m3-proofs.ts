// The M3 brains' proofs (03-boids-2d.md § The proof). Every check runs on its
// own scratch flocks, never the live one, and every number is measured here:
//
//   exact   — the vision model and the species matrix, each by brute force and
//             by the counting sort, the sort twice: every position and velocity
//             of every step hashes the same; and a run re-sorted in memory every
//             few steps matches one that never moves, fish by fish (by id);
//   field   — every fish's visual field on the GPU, bin for bin, against the
//             f64 reference computed from the same positions; and, where the
//             field matches, the step it takes against the reference's step;
//   order   — the paper's qualitative result: a group of fish with no
//             alignment rule polarizes. ⟨φ⟩ over seeds on the GPU against other
//             seeds of the f64 reference (two-sample z, as The Order Dial's
//             check), both above the declared floor; the control, the same
//             model with its edge terms off, must stay far below it;
//   mixing  — the matrix does what it says: "keep apart" gathers each kind with
//             its own, "all together" mixes them as a random draw would.

import type { BrainParams } from "../model/brains.js";
import type { SpeciesParams, VisionBrainParams } from "../model/brains-m3.js";
import { speciesPreset } from "../model/brains-m3.js";
import type { Broadphase, FlockKernels } from "../model/flock.js";
import { Flock, orderParams, sumPartials } from "../model/flock.js";
import { makeInitM3 } from "../model/init-m3.js";
import type { VisionRun } from "../model/vision-cpu.js";
import { VISION_WORDS, boundaryTables, fieldTerms, runVisionCpu, stateFromBoids, visualField, visionState } from "../model/vision-cpu.js";
import { V4_DENSITY, worldFor } from "../model/world.js";
import { ownKindShare } from "../matrix-panel.js";
import { EYES_DENSITY, OPEN_WATER_RULE, visionFor } from "../scenes.js";
import { settledMean, zScore } from "./vicsek-check.js";

const seeds = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);

/**
 * Declared after measuring on the RX 6800 XT (RADV), 2026-10-30 (the status
 * note in 03-boids-2d.md has the numbers):
 *   field — 0–4 of 524,288 bins differ over seven runs (worst 7.6e-6), |Δψ| ≤ 2.8e-7
 *           rad and |Δv| ≤ 2.7e-7 where the field matches: declared 5e-5 and 1e-6;
 *   order — 32 + 32 seeds: ⟨φ⟩ 0.83–0.94, z 2.85 and 0.34 with the seed sets swapped
 *           (no systematic difference), the control's mean 0.12–0.13: declared z ≤ 4
 *           (as The Order Dial's), the paper's φ > 0.5, control ≤ 0.25;
 *   mixing — apart +0.651…+0.657, together |x| ≤ 0.0002 over three seeds: declared
 *           ≥ +0.4 and ±0.01.
 */
export const M3_CHECK = {
  exact: { visionN: 2048, speciesN: 4096, steps: 60, seed: 42, eta: 0.2, reorderN: 16384, reorderSteps: 120, every: 8 },
  field: { n: 2048, warm: 300, seed: 7, maxDiffer: 5e-5, maxDpsi: 1e-6, maxDv: 1e-6 },
  order: {
    n: 20,
    /** A torus wide enough that the group never meets its own image, and a sight that spans the group. */
    halfW: 200,
    range: 100,
    steps: 3000,
    relax: 1500,
    every: 50,
    gpuSeeds: seeds(1, 32),
    cpuSeeds: seeds(101, 32),
    zMax: 4,
    /** The paper's own bar for "polarized" (P > 0.5). */
    minPhi: 0.5,
    controlMax: 0.25,
  },
  mixing: { n: 16384, kinds: 3, steps: 900, seed: 3, apartMin: 0.4, togetherMax: 0.01 },
} as const;

const mean = (a: readonly number[]): number => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);

function scratch(device: GPUDevice, kernels: FlockKernels, brain: BrainParams, n: number, density: number, broadphase: Broadphase, seed: number, sortEvery = 0, retinaDump = false): Flock {
  const w = worldFor(n, 1600, 900, density);
  return new Flock(device, kernels, {
    n,
    ...w,
    seed,
    rule: OPEN_WATER_RULE,
    brain,
    init: brain.kind === "vision" ? "sight" : "species",
    broadphase,
    sortEvery,
    retinaDump,
  });
}

// ------------------------------------------------------------------- exact --

export interface M3Exact {
  brain: "vision" | "species";
  n: number;
  brute: string;
  sort: string;
  sort2: string;
  nan: number;
  saturated: boolean;
  identical: boolean;
  repeatable: boolean;
  /** Re-sorting in memory every few steps against never: fish (by id) whose state differs. */
  reorder: { n: number; steps: number; reorders: number; differing: number };
}

const E = M3_CHECK.exact;

export function speciesForCheck(): SpeciesParams {
  // the opening rock–paper–scissors, with noise on (it is keyed by fish id)
  return { ...speciesPreset("cycle", 3), eta: E.eta };
}

async function exactOne(device: GPUDevice, kernels: FlockKernels, brain: BrainParams): Promise<M3Exact> {
  const n = brain.kind === "vision" ? E.visionN : E.speciesN;
  const density = brain.kind === "vision" ? EYES_DENSITY : V4_DENSITY;
  const run = async (bp: Broadphase): Promise<{ hash: string; nan: number; saturated: boolean }> => {
    const f = scratch(device, kernels, brain, n, density, bp, E.seed);
    try {
      const r = await f.hashRun(E.steps);
      return { hash: r.hash, nan: r.nan, saturated: await f.readSaturated() };
    } finally {
      f.destroy();
    }
  };
  const brute = await run("brute");
  const sort = await run("sort");
  const sort2 = await run("sort");
  // re-sorting in memory changes no fish's path: the same ocean with and without, compared by id
  const byId = async (every: number): Promise<{ state: Float32Array; reorders: number }> => {
    const f = scratch(device, kernels, brain, E.reorderN, density, "sort", E.seed, every);
    try {
      for (let s = 0; s < E.reorderSteps; s += 16) {
        const enc = device.createCommandEncoder({ label: "swarm-m3-reorder" });
        f.encodeSteps(enc, Math.min(16, E.reorderSteps - s), { pure: true });
        device.queue.submit([enc.finish()]);
      }
      const [b, ids] = await Promise.all([f.readBoids(), f.readIds()]);
      const out = new Float32Array(E.reorderN * 6);
      for (let s = 0; s < E.reorderN; s += 1) out.set(b.subarray(s * 6, s * 6 + 6), ids[s]! * 6);
      return { state: out, reorders: f.reorders };
    } finally {
      f.destroy();
    }
  };
  const moved = await byId(E.every);
  const still = await byId(0);
  const a = new Uint32Array(moved.state.buffer);
  const c = new Uint32Array(still.state.buffer);
  let differing = 0;
  for (let i = 0; i < E.reorderN; i += 1) {
    for (let w = 0; w < 6; w += 1) {
      if (a[i * 6 + w] !== c[i * 6 + w]) {
        differing += 1;
        break;
      }
    }
  }
  return {
    brain: brain.kind as "vision" | "species",
    n,
    brute: brute.hash,
    sort: sort.hash,
    sort2: sort2.hash,
    nan: brute.nan + sort.nan + sort2.nan,
    saturated: brute.saturated || sort.saturated || sort2.saturated,
    identical: brute.hash === sort.hash,
    repeatable: sort.hash === sort2.hash,
    reorder: { n: E.reorderN, steps: E.reorderSteps, reorders: moved.reorders, differing },
  };
}

export async function m3Exact(device: GPUDevice, kernels: FlockKernels): Promise<M3Exact[]> {
  return [await exactOne(device, kernels, { kind: "vision", p: visionFor() }), await exactOne(device, kernels, { kind: "species", p: speciesForCheck() })];
}

// ------------------------------------------------------------------- field --

export interface FieldCheck {
  n: number;
  /** Bins compared (n × 256) and how many differ. */
  bins: number;
  differ: number;
  /** Fish with at least one differing bin. */
  fishDiffering: number;
  /** For fish whose field matches bit for bit: the largest |Δψ| (rad) and |Δv| between the GPU's step and the reference's. */
  maxDpsi: number;
  maxDv: number;
  /** Mean covered fraction and edges per fish (what the fields look like). */
  cover: number;
  edges: number;
  seconds: number;
}

export async function fieldCheck(device: GPUDevice, kernels: FlockKernels, o: { seed?: number; warm?: number } = {}): Promise<FieldCheck> {
  const t0 = performance.now();
  const F = { ...M3_CHECK.field, ...o };
  const p = visionFor();
  const f = scratch(device, kernels, { kind: "vision", p }, F.n, EYES_DENSITY, "sort", F.seed, 0, true);
  try {
    // let schools form, so the fields have structure
    for (let s = 0; s < F.warm; s += 16) {
      const enc = device.createCommandEncoder({ label: "swarm-field-warm" });
      f.encodeSteps(enc, Math.min(16, F.warm - s), { pure: true });
      device.queue.submit([enc.finish()]);
    }
    const before = await f.readBoids();
    const enc = device.createCommandEncoder({ label: "swarm-field-step" });
    f.encodeSteps(enc, 1, { pure: true });
    device.queue.submit([enc.finish()]);
    const [after, dump] = await Promise.all([f.readBoids(), readRetina(device, f.retina!, F.n)]);
    const s = visionState(F.n, f.halfW, f.halfH, stateFromBoids(before, F.n, p.dt));
    const tab = boundaryTables();
    const params = { R: p.R, v0: p.speed, gamma: p.gamma, a0: p.a0, a1: p.a1, b0: p.b0, b1: p.b1, dt: p.dt, range: p.range };
    const V = new Uint32Array(VISION_WORDS);
    let differ = 0;
    let fishDiffering = 0;
    let maxDpsi = 0;
    let maxDv = 0;
    let cover = 0;
    let edges = 0;
    for (let i = 0; i < F.n; i += 1) {
      visualField(s, i, params, V);
      let d = 0;
      for (let w = 0; w < VISION_WORDS; w += 1) {
        let x = (V[w]! ^ dump[16 + i * 8 + w]!) >>> 0;
        while (x) {
          x &= x - 1;
          d += 1;
        }
      }
      const t = fieldTerms(V, tab);
      cover += t.cover;
      edges += t.edges;
      if (d > 0) {
        differ += d;
        fishDiffering += 1;
        continue;
      }
      // the reference's step from the same state, against the GPU's
      const v = s.v[i]!;
      const nv = v + p.dt * (p.gamma * (p.speed - v) + p.a0 * (-t.bc + p.a1 * t.ec));
      let npsi = s.psi[i]! + p.dt * p.b0 * (-t.bs + p.b1 * t.es);
      if (npsi > Math.PI) npsi -= 2 * Math.PI;
      else if (npsi < -Math.PI) npsi += 2 * Math.PI;
      const gpsi = after[i * 6 + 4]!;
      const gv = (after[i * 6 + 2]! * Math.cos(gpsi) + after[i * 6 + 3]! * Math.sin(gpsi)) / p.dt;
      let dpsi = Math.abs(gpsi - npsi);
      if (dpsi > Math.PI) dpsi = 2 * Math.PI - dpsi;
      maxDpsi = Math.max(maxDpsi, dpsi);
      maxDv = Math.max(maxDv, Math.abs(gv - nv));
    }
    return {
      n: F.n,
      bins: F.n * 256,
      differ,
      fishDiffering,
      maxDpsi,
      maxDv,
      cover: cover / F.n,
      edges: edges / F.n,
      seconds: (performance.now() - t0) / 1000,
    };
  } finally {
    f.destroy();
  }
}

/** The field check's verdict against its declared budgets. */
export const fieldPass = (r: FieldCheck): boolean =>
  r.differ / r.bins <= M3_CHECK.field.maxDiffer && r.maxDpsi <= M3_CHECK.field.maxDpsi && r.maxDv <= M3_CHECK.field.maxDv;

async function readRetina(device: GPUDevice, buf: GPUBuffer, n: number): Promise<Uint32Array> {
  const bytes = (16 + n * 8) * 4;
  const stg = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(buf, 0, stg, 0, bytes);
  device.queue.submit([enc.finish()]);
  await stg.mapAsync(GPUMapMode.READ);
  const u = new Uint32Array(stg.getMappedRange().slice(0));
  stg.unmap();
  stg.destroy();
  return u;
}

// ------------------------------------------------------------------- order --

export interface OrderCheck {
  gpu: number[];
  cpu: number[];
  gpuMean: number;
  cpuMean: number;
  z: number;
  /** The control (edge terms off), on the GPU. */
  control: number[];
  controlMean: number;
  pass: boolean;
  gpuSeconds: number;
  cpuSeconds: number;
}

const O = M3_CHECK.order;

export function orderParamsFor(edges = true): VisionBrainParams {
  const p = { ...visionFor(), range: O.range };
  return edges ? p : { ...p, a1: 0, b1: 0 };
}

function groupInit(seed: number, p: VisionBrainParams): Float32Array<ArrayBuffer> {
  return makeInitM3(O.n, seed, O.halfW, O.halfW, { kind: "vision", p }, "group");
}

/** ⟨φ⟩ per seed on the GPU: every run in parallel, one submit per φ sample. */
export async function orderGpu(device: GPUDevice, kernels: FlockKernels, seeds: readonly number[], p: VisionBrainParams): Promise<number[]> {
  const samples = Math.floor(O.steps / O.every);
  const runs = seeds.map((seed) => {
    const flock = new Flock(device, kernels, { n: O.n, halfW: O.halfW, halfH: O.halfW, seed, rule: OPEN_WATER_RULE, brain: { kind: "vision", p }, init: "group", broadphase: "brute", sortEvery: 0 });
    flock.load(groupInit(seed, p));
    const series = device.createBuffer({ size: samples * flock.groups * 40, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "swarm-eyes-series" });
    return { flock, series };
  });
  try {
    for (let s = 0; s < samples; s += 1) {
      const cmds: GPUCommandBuffer[] = [];
      for (const r of runs) {
        const enc = device.createCommandEncoder({ label: "swarm-eyes-check" });
        for (let k = 0; k < O.every; k += 16) r.flock.encodeSteps(enc, Math.min(16, O.every - k), { pure: true });
        r.flock.encodeReduce(enc);
        enc.copyBufferToBuffer(r.flock.partialsBuffer, 0, r.series, s * r.flock.groups * 40, r.flock.groups * 40);
        cmds.push(enc.finish());
      }
      device.queue.submit(cmds);
      if (s % 16 === 15) await device.queue.onSubmittedWorkDone();
    }
    await Promise.all(runs.map((r) => r.series.mapAsync(GPUMapMode.READ)));
    return runs.map((r) => {
      const all = new Int32Array(r.series.getMappedRange().slice(0));
      const g = r.flock.groups;
      const phi = new Float64Array(samples);
      for (let s = 0; s < samples; s += 1) phi[s] = orderParams(sumPartials(all.subarray(s * g * 10, (s + 1) * g * 10), g)).phi;
      return settledMean(phi, O.every, O.relax);
    });
  } finally {
    for (const r of runs) {
      r.flock.destroy();
      r.series.destroy();
    }
  }
}

/** The same jobs on the f64 reference (workers when there are any). */
export async function orderCpu(seeds: readonly number[], p: VisionBrainParams): Promise<number[]> {
  const params = { R: p.R, v0: p.speed, gamma: p.gamma, a0: p.a0, a1: p.a1, b0: p.b0, b1: p.b1, dt: p.dt, range: p.range };
  const jobs: VisionRun[] = seeds.map((seed) => ({
    n: O.n,
    halfW: O.halfW,
    halfH: O.halfW,
    params,
    init: stateFromBoids(groupInit(seed, p), O.n, p.dt),
    steps: O.steps,
    every: O.every,
  }));
  const out: Float64Array[] = new Array(jobs.length);
  const cores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 2) : 2;
  const count = typeof Worker === "undefined" ? 0 : Math.max(1, Math.min(6, cores - 1));
  if (count === 0) {
    jobs.forEach((j, k) => (out[k] = runVisionCpu(j)));
  } else {
    const workers = Array.from({ length: count }, () => new Worker(new URL("./vision-worker.ts", import.meta.url), { type: "module" }));
    try {
      let next = 0;
      await Promise.all(
        workers.map(
          (w) =>
            new Promise<void>((resolve, reject) => {
              const take = (): void => {
                if (next >= jobs.length) {
                  resolve();
                  return;
                }
                const id = next++;
                w.postMessage({ id, run: jobs[id] });
              };
              w.onmessage = (e: MessageEvent<{ id: number; phi: Float64Array }>) => {
                out[e.data.id] = e.data.phi;
                take();
              };
              w.onerror = (e) => reject(new Error(`vision reference worker: ${e.message}`));
              take();
            }),
        ),
      );
    } finally {
      for (const w of workers) w.terminate();
    }
  }
  return out.map((phi) => settledMean(phi, O.every, O.relax));
}

export async function orderCheck(device: GPUDevice, kernels: FlockKernels, o: { gpuSeeds?: readonly number[]; cpuSeeds?: readonly number[] } = {}): Promise<OrderCheck> {
  const t0 = performance.now();
  const on = orderParamsFor(true);
  const gpuSeeds = o.gpuSeeds ?? O.gpuSeeds;
  const gpu = await orderGpu(device, kernels, gpuSeeds, on);
  const control = await orderGpu(device, kernels, gpuSeeds, orderParamsFor(false));
  const t1 = performance.now();
  const cpu = await orderCpu(o.cpuSeeds ?? O.cpuSeeds, on);
  const t2 = performance.now();
  const z = zScore(gpu, cpu);
  const gpuMean = mean(gpu);
  const cpuMean = mean(cpu);
  const controlMean = mean(control);
  return {
    gpu,
    cpu,
    gpuMean,
    cpuMean,
    z,
    control,
    controlMean,
    pass: z <= O.zMax && gpuMean >= O.minPhi && cpuMean >= O.minPhi && controlMean <= O.controlMax,
    gpuSeconds: (t1 - t0) / 1000,
    cpuSeconds: (t2 - t1) / 1000,
  };
}

// ------------------------------------------------------------------ mixing --

export interface MixingCheck {
  kinds: number;
  /** Own-kind share of each kind's neighbours, minus that kind's share of the ocean, averaged over kinds. */
  apart: number;
  together: number;
  pass: boolean;
  seconds: number;
}

export async function mixingCheck(device: GPUDevice, kernels: FlockKernels, o: { seed?: number } = {}): Promise<MixingCheck> {
  const t0 = performance.now();
  const M = { ...M3_CHECK.mixing, ...o };
  const excess = async (p: SpeciesParams): Promise<number> => {
    const f = scratch(device, kernels, { kind: "species", p }, M.n, V4_DENSITY, "sort", M.seed, 16);
    try {
      for (let s = 0; s < M.steps; s += 16) {
        const enc = device.createCommandEncoder({ label: "swarm-mixing" });
        f.encodeSteps(enc, Math.min(16, M.steps - s), { pure: true });
        device.queue.submit([enc.finish()]);
      }
      const b = await f.readBoids();
      const m = ownKindShare(b, M.n, p.count);
      return mean(m.share.map((s, k) => s - m.fraction[k]!));
    } finally {
      f.destroy();
    }
  };
  const apart = await excess(speciesPreset("segregate", M.kinds));
  const together = await excess(speciesPreset("mixed", M.kinds));
  return { kinds: M.kinds, apart, together, pass: apart >= M.apartMin && Math.abs(together) <= M.togetherMax, seconds: (performance.now() - t0) / 1000 };
}
