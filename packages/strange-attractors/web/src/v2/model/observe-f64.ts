// The f64 side of M2's scenes: z peaks (Road to Chaos's columns and
// Lorenz's map), crossings of a plane (Slice), the boxes their histograms
// use, and histograms on the GPU's own bins — for the panels' overlays and
// for Prove's comparisons. Peaks use the same rule as the GPU: a sample
// above both neighbours, refined by the parabola through the three.

import type { LorenzParams, V3 } from "./lorenz.js";
import { DT, rk4Step } from "./lorenz.js";
import type { Observe } from "./ensemble.js";
import { OBS_BINS } from "./ensemble.js";

/** A z peak from three samples z0 < z1 ≥ z2 (the parabola's vertex). */
export function peakOf(z0: number, z1: number, z2: number): number {
  const d = z0 - 2 * z1 + z2;
  return d < 0 ? z1 - ((z2 - z0) * (z2 - z0)) / (8 * d) : z1;
}

/** z peaks of one trajectory after `warm` steps, over `steps` more. */
export function peaksF64(p: LorenzParams, x0: V3, warm: number, steps: number): number[] {
  let x = x0;
  for (let i = 0; i < warm; i += 1) x = rk4Step(p, x, DT).next;
  const out: number[] = [];
  let z0 = x[2];
  let z1 = x[2];
  let seen = 0;
  for (let i = 0; i < steps; i += 1) {
    x = rk4Step(p, x, DT).next;
    const z2 = x[2];
    if (seen >= 2 && z1 > z0 && z1 >= z2) out.push(peakOf(z0, z1, z2));
    z0 = z1;
    z1 = z2;
    seen += 1;
  }
  return out;
}

/** Successive-peak pairs (z_n, z_{n+1}). */
export function returnMap(peaks: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < peaks.length; i += 1) out.push([peaks[i]!, peaks[i + 1]!]);
  return out;
}

/** Upward crossings (x, y) of the plane z = h, after `warm` steps, over `steps` more. */
export function sectionF64(p: LorenzParams, h: number, x0: V3, warm: number, steps: number): [number, number][] {
  let x = x0;
  for (let i = 0; i < warm; i += 1) x = rk4Step(p, x, DT).next;
  const out: [number, number][] = [];
  for (let i = 0; i < steps; i += 1) {
    const prev = x;
    x = rk4Step(p, x, DT).next;
    if (prev[2] < h && x[2] >= h) {
      const t = (h - prev[2]) / (x[2] - prev[2]);
      out.push([prev[0] + (x[0] - prev[0]) * t, prev[1] + (x[1] - prev[1]) * t]);
    }
  }
  return out;
}

/**
 * The histograms' boxes for σ, ρ, β: the map's z range from the peaks of a
 * short f64 run (15% margin: a short run misses the rarest extremes), the plane at z = ρ − 1 (the level of C±; the
 * classic Poincaré section), and the section's (x, y) box from its
 * crossings (8% margin). Null where the motion settles on a fixed point.
 */
export function observeBoxes(p: LorenzParams): Omit<Observe, "map" | "slice"> | null {
  const x0: V3 = [1, 1, Math.max(p.rho - 1, 1) + 1];
  const peaks = peaksF64(p, x0, 3000, 30000);
  if (peaks.length < 8) return null;
  let lo = Math.min(...peaks);
  let hi = Math.max(...peaks);
  // a spiral settling on a fixed point still has (shrinking) peaks: no attractor to map
  if (hi - lo < 0.01 * Math.max(p.rho, 1)) return null;
  const m = Math.max((hi - lo) * 0.15, 0.5);
  lo -= m;
  hi += m;
  const plane = p.rho - 1;
  const cross = sectionF64(p, plane, x0, 3000, 30000);
  let box: [number, number, number, number] = [-20, 20, -20, 20];
  if (cross.length >= 8) {
    const xs = cross.map((c) => c[0]);
    const ys = cross.map((c) => c[1]);
    const [x0b, x1b, y0b, y1b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const mx = Math.max((x1b - x0b) * 0.08, 0.5);
    const my = Math.max((y1b - y0b) * 0.08, 0.5);
    box = [x0b - mx, x1b + mx, y0b - my, y1b + my];
  }
  return { mapLo: lo, mapHi: hi, plane, box };
}

/** A normalised 2D histogram on the GPU's bins (OBS_BINS per side), with the mass outside the box. */
export function hist2d(pts: readonly [number, number][], x0: number, x1: number, y0: number, y1: number, bins = OBS_BINS): { p: Float64Array; outside: number } {
  const p = new Float64Array(bins * bins);
  let outside = 0;
  for (const [x, y] of pts) {
    const bx = Math.floor(((x - x0) / (x1 - x0)) * bins);
    const by = Math.floor(((y - y0) / (y1 - y0)) * bins);
    if (bx < 0 || by < 0 || bx >= bins || by >= bins) outside += 1;
    else p[by * bins + bx] += 1;
  }
  const n = Math.max(pts.length, 1);
  for (let i = 0; i < p.length; i += 1) p[i] /= n;
  return { p, outside: outside / n };
}

/** Coarsen a bins×bins histogram by `k` per side (Prove compares on coarser bins than the picture). */
export function coarsen(h: { p: Float64Array; outside: number }, bins: number, k: number): { p: Float64Array; outside: number } {
  const nb = Math.floor(bins / k);
  const p = new Float64Array(nb * nb);
  for (let y = 0; y < bins; y += 1) for (let x = 0; x < bins; x += 1) p[Math.floor(y / k) * nb + Math.floor(x / k)] += h.p[y * bins + x]!;
  return { p, outside: h.outside };
}

/** A normalised histogram from GPU counts (row-major bins×bins) and its total (counts outside were never binned). */
export function histFromCounts(counts: Uint32Array, bins = OBS_BINS): { p: Float64Array; outside: number } {
  let n = 0;
  for (let i = 0; i < counts.length; i += 1) n += counts[i]!;
  const p = new Float64Array(bins * bins);
  for (let i = 0; i < p.length; i += 1) p[i] = counts[i]! / Math.max(n, 1);
  return { p, outside: 0 };
}

/** A column's y = z_peak / ρ histogram on `k` bins over [y0, y1). */
export function columnHist(peaks: readonly number[], rho: number, y0: number, y1: number, k: number): { p: Float64Array; outside: number } {
  const p = new Float64Array(k);
  let outside = 0;
  for (const z of peaks) {
    const b = Math.floor(((z / rho - y0) / (y1 - y0)) * k);
    if (b < 0 || b >= k) outside += 1;
    else p[b] += 1;
  }
  const n = Math.max(peaks.length, 1);
  for (let i = 0; i < k; i += 1) p[i] /= n;
  return { p, outside: outside / n };
}
