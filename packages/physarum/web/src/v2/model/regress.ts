// Morphology regression (02-physarum.md § The proof, "morphology checks"):
// what each scene grows, as a handful of numbers — measured per scene and
// tier, committed with a band (generated/morphology-baseline.json), and
// checked again by v2-morphology.mjs (in CI on a software GPU), so a change
// that alters what the scenes grow fails a test instead of passing unseen.
//
// Descriptors of the whole dish (territories: every colony's plane summed):
//   * from morphology.ts, the trail ÷ its mean at balance, thresholded at 1:
//     tube cover, tube length per 1,000 cells, and enclosed gaps and network
//     pieces per 100,000 cells (not loopiness, their ratio: on a small dish
//     it is a ratio of two or three features, 2/3 on every seed of the ci
//     maze and 1/2 on SwiftShader — gaps and pieces carry counting-noise
//     bands of their own);
//   * a node-degree histogram from the network the score card extracts
//     (graph.ts: cells above half the dish's measured mean, thinned): loose
//     ends, three-way and four-or-more-way junctions per 100,000 cells, after
//     links shorter than 12 cells are contracted into their junctions (the
//     same contraction the score uses, so thinning's small triangles do not
//     count as junctions).

import { DEFAULT_EXTRACT, extractNetwork } from "./graph.js";
import { morphology } from "./morphology.js";
import { normalise } from "./analysis.js";

export type Descriptors = Record<string, number>;

/** Loose ends and junctions by degree, per 100,000 cells of dish. */
export function degreeHistogram(field: Float32Array, w: number, h: number, walls: Uint32Array | null = null): { ends: number; y3: number; x4: number } {
  const g = extractNetwork(normalise(field, walls), w, h, [], { ...DEFAULT_EXTRACT, raw: true });
  // contract short links into their junctions
  const rep = g.nodes.map((_, i) => i);
  const root = (i: number): number => (rep[i] === i ? i : (rep[i] = root(rep[i]!)));
  for (const l of g.links) {
    if (l.len >= DEFAULT_EXTRACT.minLink) continue;
    const a = root(l.a);
    const b = root(l.b);
    if (a !== b) rep[Math.max(a, b)] = Math.min(a, b);
  }
  const deg = new Map<number, number>();
  for (const l of g.links) {
    if (l.len < DEFAULT_EXTRACT.minLink) continue;
    const a = root(l.a);
    const b = root(l.b);
    if (a === b) continue;
    deg.set(a, (deg.get(a) ?? 0) + 1);
    deg.set(b, (deg.get(b) ?? 0) + 1);
  }
  let ends = 0;
  let y3 = 0;
  let x4 = 0;
  for (const d of deg.values()) {
    if (d === 1) ends += 1;
    else if (d === 3) y3 += 1;
    else if (d >= 4) x4 += 1;
  }
  const per = 1e5 / (w * h);
  return { ends: ends * per, y3: y3 * per, x4: x4 * per };
}

/**
 * The dish's descriptors from its trail (`planes` planes of w × h, summed),
 * the dish's mean trail at balance, and its walls.
 */
export function describeDish(trail: Float32Array, w: number, h: number, planes: number, meanTrail: number, walls: Uint32Array | null): Descriptors {
  const n = w * h;
  const sum = new Float32Array(n);
  for (let k = 0; k < planes; k += 1) for (let i = 0; i < n; i += 1) sum[i]! += trail[k * n + i]!;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i += 1) f[i] = sum[i]! / meanTrail;
  const m = morphology(f, w, h, 1);
  const d = degreeHistogram(sum, w, h, walls);
  return {
    cover: m.cover,
    length: m.lengthDensity,
    meshes: m.meshDensity,
    pieces: m.pieceDensity,
    ends: d.ends,
    y3: d.y3,
    x4: d.x4,
  };
}

/**
 * How far a descriptor may move: its band is mean ± max(5 SD over the
 * measured seeds, a floor). Measured over ten seeds, a fresh run of the same
 * dynamics lands outside 5 SD about once in a thousand numbers (Student's t,
 * nine degrees of freedom); a check reads ~100. The floor keeps a band from
 * collapsing where the seeds happened to agree closely: 0.02 for fractions
 * (cover, shares); 3% of the mean for lengths and score ratios; for
 * densities of countable features, two counting-noise sigmas, 2·√(count)
 * expressed as a density (the criterion the pad calibration used, M1).
 */
export const BAND_SD = 5;
export function bandFloor(key: string, mean: number, cells: number): number {
  if (["cover", "overlap"].includes(key) || key.startsWith("share") || key.startsWith("held") || key === "joined" || key === "border") return 0.02;
  if (["meshes", "pieces", "ends", "y3", "x4", "links", "cutLinks"].includes(key)) {
    const count = (mean * cells) / 1e5;
    return (2 * Math.sqrt(Math.max(count, 1)) * 1e5) / cells;
  }
  if (key === "reached") return 1;
  return 0.03 * Math.abs(mean);
}

export interface Band {
  mean: number;
  sd: number;
  lo: number;
  hi: number;
  /** The seeds' values the band was measured from. */
  seen: number[];
}

/** A band from the seeds' values (see BAND_SD, bandFloor). */
export function bandOf(key: string, values: number[], cells: number): Band {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const half = Math.max(BAND_SD * sd, bandFloor(key, mean, cells));
  return { mean, sd, lo: mean - half, hi: mean + half, seen: values };
}
