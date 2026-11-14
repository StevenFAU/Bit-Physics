// The invariant measure, as histograms (05-strange-attractors.md, "The
// proof": the GPU ensemble's long-run histogram against a CPU f64 long run —
// distribution-level, so immune to pointwise divergence). Points are binned
// on the (x, z) plane, the attractor's butterfly view; the distance is total
// variation, ½ Σ |p − q| (0 = the same distribution, 1 = disjoint).

import type { LorenzParams, V3 } from "./lorenz.js";
import { DT, rk4Step } from "./lorenz.js";

export interface HistBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  bins: number;
}

/** The classic attractor's (x, z) extent with a margin. */
export const CLASSIC_BOX: HistBox = { x0: -22, x1: 22, z0: 0, z1: 52, bins: 32 };

/** A normalised (x, z) histogram of points with `stride` floats each (xyz first). Points outside fall in an overflow mass. */
export function histogramXZ(points: ArrayLike<number>, stride: number, box: HistBox, offset: V3 = [0, 0, 0]): { p: Float64Array; outside: number; n: number } {
  const b = box.bins;
  const h = new Float64Array(b * b);
  let outside = 0;
  let n = 0;
  const sx = b / (box.x1 - box.x0);
  const sz = b / (box.z1 - box.z0);
  for (let i = 0; i + 2 < points.length; i += stride) {
    const x = points[i]! + offset[0];
    const z = points[i + 2]! + offset[2];
    n += 1;
    const ix = Math.floor((x - box.x0) * sx);
    const iz = Math.floor((z - box.z0) * sz);
    if (ix < 0 || iz < 0 || ix >= b || iz >= b || !Number.isFinite(x + z)) {
      outside += 1;
      continue;
    }
    h[iz * b + ix] += 1;
  }
  for (let i = 0; i < h.length; i += 1) h[i] /= Math.max(n, 1);
  return { p: h, outside: outside / Math.max(n, 1), n };
}

/** Total-variation distance between two normalised histograms (overflow masses included). */
export function tvDistance(a: { p: Float64Array; outside: number }, b: { p: Float64Array; outside: number }): number {
  let s = Math.abs(a.outside - b.outside);
  for (let i = 0; i < a.p.length; i += 1) s += Math.abs(a.p[i]! - b.p[i]!);
  return s / 2;
}

/** A long f64 run sampled every `every` steps after a transient: packed xyz. */
export function referenceRun(p: LorenzParams, samples: number, every = 5, warm = 2000, x0: V3 = [1, 1, 1]): Float64Array<ArrayBuffer> {
  let x = x0;
  for (let i = 0; i < warm; i += 1) x = rk4Step(p, x, DT).next;
  const out = new Float64Array(samples * 3);
  for (let k = 0; k < samples; k += 1) {
    for (let i = 0; i < every; i += 1) x = rk4Step(p, x, DT).next;
    out[k * 3] = x[0];
    out[k * 3 + 1] = x[1];
    out[k * 3 + 2] = x[2];
  }
  return out;
}
