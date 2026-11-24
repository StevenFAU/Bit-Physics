// M2's Prove checks: each of the three new pictures, made on this GPU in
// f32, against the same picture made in f64 on the CPU — compared as
// distributions (total variation), since individual trajectories diverge by
// design. Each also reports the comparison's own floor: two f64 pictures
// from different starts.

import type { ChaosKernels } from "../model/ensemble.js";
import { Chaos, OBS_BINS } from "../model/ensemble.js";
import { BIF_WARM_STEPS, Bifurcation, Y0, Y1, bifStart, lorenzRoad } from "../model/bifurcation.js";
import type { LorenzParams } from "../model/lorenz.js";
import { CLASSIC } from "../model/lorenz.js";
import { tvDistance } from "../model/measure.js";
import { coarsen, columnHist, hist2d, histFromCounts, observeBoxes, peaksF64, returnMap, sectionF64 } from "../model/observe-f64.js";

/**
 * Road to Chaos's test columns: chaos (28, 60, 120) and periodic windows
 * (100.5, 150, 230). Chaotic columns are compared as distributions on 64
 * bins; a window's column is one orbit's few peaks, compared on the
 * diagram's own 1,024 bins, where a small change of ρ moves them.
 */
export const ROAD_TEST_RHOS = [28, 60, 100.5, 120, 150, 230] as const;
export const ROAD_WINDOWS: ReadonlySet<number> = new Set([100.5, 150, 230]);
/** Trajectories per test column, and the steps they run after the warm-up (200 time units). */
export const ROAD_TEST_PER = 32;
export const ROAD_TEST_STEPS = 20000;
/** The checks bin the columns coarser than the picture: 64 bins of z / ρ over [Y0, Y1). */
export const ROAD_TEST_BINS = 64;
/** The map and section checks coarsen 256 bins per side to 32. */
const COARSEN = 8;

export interface RoadCheck {
  rhos: number[];
  /** Per column: TV GPU vs f64, and f64 vs f64 (other starts); bins it was compared on. */
  tv: number[];
  floor: number[];
  bins: number[];
  /** Worst chaotic column (64 bins) and worst window (1,024 bins). */
  worstChaos: number;
  worstOrbit: number;
  /** Peaks per column on the GPU. */
  peaks: number[];
}

export interface PictureCheck {
  tv: number;
  floor: number;
  /** Samples: GPU (pairs or crossings) and f64. */
  gpu: number;
  ref: number;
}

const chunked = async (device: GPUDevice, steps: number, chunk: number, encode: (enc: GPUCommandEncoder, n: number) => void): Promise<void> => {
  let left = steps;
  while (left > 0) {
    const n = Math.min(left, chunk);
    const enc = device.createCommandEncoder({ label: "prove-m2" });
    encode(enc, n);
    device.queue.submit([enc.finish()]);
    left -= n;
  }
  await device.queue.onSubmittedWorkDone();
};

/** f64 peaks of a test column: the same starts as the GPU's (bifStart), or another seed's (the floor). */
function columnPeaksF64(p: LorenzParams, rho: number, col: number, seed: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < ROAD_TEST_PER; j += 1) {
    const x0 = bifStart(seed, col * ROAD_TEST_PER + j, rho, p.beta);
    out.push(...peaksF64({ ...p, rho }, x0, BIF_WARM_STEPS, ROAD_TEST_STEPS));
  }
  return out;
}

export async function roadCheck(device: GPUDevice, bifPipe: GPUComputePipeline): Promise<RoadCheck> {
  const p = { ...CLASSIC };
  const rhos = [...ROAD_TEST_RHOS];
  const bif = Bifurcation.create(device, bifPipe, { cols: rhos.length, per: ROAD_TEST_PER, bins: 1024 }, lorenzRoad(() => p));
  try {
    bif.seed = 1;
    bif.setRhos(new Float32Array(rhos));
    await chunked(device, 1, 1, (enc) => bif.encode(enc, 0));
    await chunked(device, BIF_WARM_STEPS + ROAD_TEST_STEPS, 500, (enc, n) => bif.encode(enc, n));
    const counts = await bif.readCounts();
    const tv: number[] = [];
    const floor: number[] = [];
    const peaks: number[] = [];
    const bins: number[] = [];
    rhos.forEach((rho, col) => {
      // the GPU column, re-binned from the diagram's bins to the check's
      const k = ROAD_WINDOWS.has(rho) ? bif.bins : ROAD_TEST_BINS;
      const g = new Float64Array(k);
      let n = 0;
      for (let b = 0; b < bif.bins; b += 1) {
        const c = counts[b * bif.cols + col]!;
        g[Math.floor((b * k) / bif.bins)] += c;
        n += c;
      }
      for (let i = 0; i < g.length; i += 1) g[i] /= Math.max(n, 1);
      peaks.push(n);
      bins.push(k);
      const ref = columnHist(columnPeaksF64(p, rho, col, 1), rho, Y0, Y1, k);
      const other = columnHist(columnPeaksF64(p, rho, col, 2), rho, Y0, Y1, k);
      tv.push(tvDistance({ p: g, outside: 0 }, ref));
      floor.push(tvDistance(ref, other));
    });
    const chaos = tv.filter((_, i) => !ROAD_WINDOWS.has(rhos[i]!));
    const orbit = tv.filter((_, i) => ROAD_WINDOWS.has(rhos[i]!));
    return { rhos, tv, floor, bins, worstChaos: Math.max(...chaos), worstOrbit: Math.max(...orbit), peaks };
  } finally {
    bif.destroy();
  }
}

/** A Chaos instance observing the classic attractor: half its density count, warmed, histograms fresh. */
async function observing(device: GPUDevice, k: ChaosKernels, map: boolean): Promise<{ chaos: Chaos; box: NonNullable<ReturnType<typeof observeBoxes>> }> {
  const p = { ...CLASSIC };
  const chaos = new Chaos(device, k, 1, 262_144, p);
  chaos.seedDensity(3, 1500);
  const box = observeBoxes(p)!;
  const enc = device.createCommandEncoder();
  chaos.setObserve(enc, { ...box, map, slice: !map });
  device.queue.submit([enc.finish()]);
  return { chaos, box };
}

/** Lorenz's map: 262,144 GPU points for 20 time units vs one long f64 run, 32 × 32 bins. */
export async function mapCheck(device: GPUDevice, k: ChaosKernels): Promise<PictureCheck> {
  const { chaos, box } = await observing(device, k, true);
  try {
    await chunked(device, 2000, 32, (enc, n) => chaos.encodeSteps(enc, n));
    const { counts, total } = await chaos.readObservation("map");
    const gpu = coarsen(histFromCounts(counts), OBS_BINS, COARSEN);
    const pairs = (x0: [number, number, number]): [number, number][] => returnMap(peaksF64(CLASSIC, x0, 2000, 4_000_000));
    const a = pairs([1, 1, 1]);
    const b = pairs([-7, 3, 30]);
    const ha = coarsen(hist2d(a, box.mapLo, box.mapHi, box.mapLo, box.mapHi), OBS_BINS, COARSEN);
    const hb = coarsen(hist2d(b, box.mapLo, box.mapHi, box.mapLo, box.mapHi), OBS_BINS, COARSEN);
    return { tv: tvDistance(gpu, ha), floor: tvDistance(ha, hb), gpu: total, ref: a.length };
  } finally {
    chaos.destroy();
  }
}

/** The section at z = ρ − 1: 262,144 GPU points for 20 time units vs one long f64 run, 32 × 32 bins. */
export async function sectionCheck(device: GPUDevice, k: ChaosKernels): Promise<PictureCheck> {
  const { chaos, box } = await observing(device, k, false);
  try {
    await chunked(device, 2000, 32, (enc, n) => chaos.encodeSteps(enc, n));
    const { counts, total } = await chaos.readObservation("slice");
    const gpu = coarsen(histFromCounts(counts), OBS_BINS, COARSEN);
    const [x0, x1, y0, y1] = box.box;
    const cross = (s: [number, number, number]): [number, number][] => sectionF64(CLASSIC, box.plane, s, 2000, 8_000_000);
    const a = cross([1, 1, 1]);
    const b = cross([-7, 3, 30]);
    const ha = coarsen(hist2d(a, x0, x1, y0, y1), OBS_BINS, COARSEN);
    const hb = coarsen(hist2d(b, x0, x1, y0, y1), OBS_BINS, COARSEN);
    return { tv: tvDistance(gpu, ha), floor: tvDistance(ha, hb), gpu: total, ref: a.length };
  } finally {
    chaos.destroy();
  }
}
