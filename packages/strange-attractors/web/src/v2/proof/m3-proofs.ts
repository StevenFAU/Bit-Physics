// M3's Prove checks. Rössler's road, column by column against f64 (the M2
// Lorenz check's method: chaotic columns as distributions on coarse bins,
// periodic windows on the diagram's own fine bins, where a wrong c shows);
// and The Family — each system's GPU cloud (f32, family.wgsl) against one long
// f64 run, as total variation, illustrative: no budget, not gated.

import { tvDistance } from "../model/measure.js";
import type { V3 } from "../model/lorenz.js";
import { Bifurcation, ROSSLER_AB, ROSSLER_DT, ROSSLER_ROAD, ROSSLER_WARM_STEPS, RY0, RY1, bifStartRossler } from "../model/bifurcation.js";
import { coarsen, columnHist, hist2d, peakOf } from "../model/observe-f64.js";
import { FAMILY, familyTrajectory, rk4f } from "../model/family.js";
import type { FamilySystem } from "../model/family.js";
import { FamilyDensity } from "../model/family-gpu.js";

/** Rössler's test columns: chaos (4.6, 5.7, 9) and order (period 2 at 3.5, period 4 at 4, the window at 5.3). */
export const RROAD_TEST_CS = [3.5, 4, 4.6, 5.3, 5.7, 9] as const;
export const RROAD_WINDOWS: ReadonlySet<number> = new Set([3.5, 4, 5.3]);
export const RROAD_TEST_PER = 32;
/** Steps after the warm-up: 1,200 time units, ~200 turns of the spiral per trajectory (~6,600 peaks a column). */
export const RROAD_TEST_STEPS = 60000;
export const RROAD_TEST_BINS = 64;

export interface RoadCheckR {
  cs: number[];
  tv: number[];
  floor: number[];
  bins: number[];
  worstChaos: number;
  worstOrbit: number;
  peaks: number[];
}

/** f64 positive x maxima (three-point parabola vertex) after `warm` steps. */
export function rosslerPeaksF64(c: number, x0: V3, warm: number, steps: number): number[] {
  const p = [ROSSLER_AB[0], ROSSLER_AB[1], c];
  let s: V3 = [...x0];
  let a = s[0];
  let b = s[0];
  const out: number[] = [];
  for (let i = 0; i < warm + steps; i += 1) {
    s = rk4f(1, p, s, ROSSLER_DT);
    const x2 = s[0];
    if (i >= warm && b > a && b >= x2 && b > 0) out.push(peakOf(a, b, x2));
    a = b;
    b = x2;
  }
  return out;
}

function columnPeaks(c: number, col: number, seed: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < RROAD_TEST_PER; j += 1) out.push(...rosslerPeaksF64(c, bifStartRossler(seed, col * RROAD_TEST_PER + j, c), ROSSLER_WARM_STEPS, RROAD_TEST_STEPS));
  return out;
}

const chunked = async (device: GPUDevice, steps: number, chunk: number, encode: (enc: GPUCommandEncoder, n: number) => void): Promise<void> => {
  let left = steps;
  while (left > 0) {
    const n = Math.min(left, chunk);
    const enc = device.createCommandEncoder({ label: "prove-m3" });
    encode(enc, n);
    device.queue.submit([enc.finish()]);
    left -= n;
  }
  await device.queue.onSubmittedWorkDone();
};

export async function roadCheckRossler(device: GPUDevice, pipe: GPUComputePipeline): Promise<RoadCheckR> {
  const cs = [...RROAD_TEST_CS];
  const bif = Bifurcation.create(device, pipe, { cols: cs.length, per: RROAD_TEST_PER, bins: 1024 }, ROSSLER_ROAD);
  try {
    bif.seed = 1;
    bif.setRhos(new Float32Array(cs));
    await chunked(device, 1, 1, (enc) => bif.encode(enc, 0));
    await chunked(device, ROSSLER_WARM_STEPS + RROAD_TEST_STEPS, 500, (enc, n) => bif.encode(enc, n));
    const counts = await bif.readCounts();
    const tv: number[] = [];
    const floor: number[] = [];
    const peaks: number[] = [];
    const bins: number[] = [];
    cs.forEach((c, col) => {
      const k = RROAD_WINDOWS.has(c) ? bif.bins : RROAD_TEST_BINS;
      const g = new Float64Array(k);
      let n = 0;
      for (let b = 0; b < bif.bins; b += 1) {
        const v = counts[b * bif.cols + col]!;
        g[Math.floor((b * k) / bif.bins)] += v;
        n += v;
      }
      for (let i = 0; i < k; i += 1) g[i] /= Math.max(n, 1);
      peaks.push(n);
      bins.push(k);
      const ref = columnHist(columnPeaks(c, col, 1), c, RY0, RY1, k);
      const other = columnHist(columnPeaks(c, col, 2), c, RY0, RY1, k);
      tv.push(tvDistance({ p: g, outside: 0 }, ref));
      floor.push(tvDistance(ref, other));
    });
    const chaos = tv.filter((_, i) => !RROAD_WINDOWS.has(cs[i]!));
    const orbit = tv.filter((_, i) => RROAD_WINDOWS.has(cs[i]!));
    return { cs, tv, floor, bins, worstChaos: Math.max(...chaos), worstOrbit: Math.max(...orbit), peaks };
  } finally {
    bif.destroy();
  }
}

// ------------------------------------------------------------- The Family --

export interface FamilyRow {
  key: string;
  label: string;
  /** TV, GPU cloud vs the f64 run; the floor: the f64 run's first half vs its second. */
  tv: number;
  floor: number;
  /** Fraction of the GPU cloud outside the f64 run's box. */
  outside: number;
}

/** GPU points per system, steps run after seeding, f64 samples (and the stride between them). */
export const FAMILY_CHECK = { n: 262_144, steps: 2000, samples: 200_000, every: 5, bins: 32 } as const;

/** One system: its cloud after seeding, warm-up and FAMILY_CHECK.steps more, binned on (x, z) against f64. */
async function familyRow(device: GPUDevice, pipe: GPUComputePipeline, sys: FamilySystem): Promise<FamilyRow> {
  const fam = new FamilyDensity(device, pipe, FAMILY_CHECK.n);
  try {
    fam.set(sys, sys.params, 7);
    await chunked(device, FAMILY_CHECK.steps, 100, (enc, n) => fam.encodeRaw(enc, n));
    const size = FAMILY_CHECK.n * 16;
    const staging = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(fam.density.state, 0, staging, 0, size);
    device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const f = new Float32Array(staging.getMappedRange().slice(0));
    staging.destroy();
    // the f64 run: from the system's start, after 200 of its time units
    const warm = Math.min(Math.round(200 / sys.dt), 40000);
    const ref = familyTrajectory(sys, sys.params, FAMILY_CHECK.samples * 2, FAMILY_CHECK.every, warm);
    let [x0, x1, z0, z1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let i = 0; i < ref.length / 3; i += 1) {
      x0 = Math.min(x0, ref[i * 3]!);
      x1 = Math.max(x1, ref[i * 3]!);
      z0 = Math.min(z0, ref[i * 3 + 2]!);
      z1 = Math.max(z1, ref[i * 3 + 2]!);
    }
    const mx = (x1 - x0) * 0.04;
    const mz = (z1 - z0) * 0.04;
    [x0, x1, z0, z1] = [x0 - mx, x1 + mx, z0 - mz, z1 + mz];
    const half = (from: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let i = from; i < from + FAMILY_CHECK.samples; i += 1) out.push([ref[i * 3]!, ref[i * 3 + 2]!]);
      return out;
    };
    const gpuPts: [number, number][] = [];
    for (let i = 0; i < FAMILY_CHECK.n; i += 1) gpuPts.push([f[i * 4]!, f[i * 4 + 2]!]);
    const H = (pts: [number, number][]) => coarsen(hist2d(pts, x0, x1, z0, z1), 256, 256 / FAMILY_CHECK.bins);
    const a = H(half(0));
    const b = H(half(FAMILY_CHECK.samples));
    const g = H(gpuPts);
    return { key: sys.key, label: sys.label, tv: tvDistance(g, a), floor: tvDistance(a, b), outside: g.outside };
  } finally {
    fam.destroy();
  }
}

export async function familyCheck(device: GPUDevice, pipe: GPUComputePipeline): Promise<FamilyRow[]> {
  const rows: FamilyRow[] = [];
  for (const s of FAMILY) rows.push(await familyRow(device, pipe, s));
  return rows;
}
