// Scenes (01-reaction-diffusion.md § Scenes). Each is a named experiment
// with a one-line prompt, a chemistry, an initial condition, a look, and —
// where the dish would otherwise settle into stillness — a director that
// re-triggers events on a deterministic schedule (hashed from the scene seed
// and the tick, so replays and share links reproduce it).

import { HashStream, hash3, unit } from "@bp/runtime";
import type { PaletteId } from "../render/look.js";
import type { Field } from "../model/ic.js";
import { brokenFronts, centre, restNoise, scatter, sprinkle } from "../model/ic.js";
import type { ModelId } from "../model/models.js";
import type { SurfaceStart } from "../model/surface-ic.js";
import { MODELS } from "../model/models.js";
import type { Kernel, Stamp } from "../model/sim.js";
import { PARAMS } from "../proof/gate.js";

export type SceneId =
  | "map"
  | "mitosis"
  | "coral"
  | "solitons"
  | "spirals"
  | "garden"
  | "stripes"
  | "spacing"
  | "excitable"
  | "shape"
  | "dish"
  | "gated";

import { MAP_F, PLANE_K, mapChem } from "./map.js";
export { MAP_F, PLANE_K } from "./map.js";

export interface Regime {
  id: string;
  name: string;
  /** What it does, in plain words. */
  blurb: string;
  F: number;
  k: number;
}

// Named regimes of THIS kernel (Du 0.16, Dv 0.08, Δt 1, 5-point Laplacian),
// placed after Pearson (1993) and Munafo's xmorphia catalogue and checked by
// eye on the live solver (a 512 × 320 dish, scattered seeds, 6000 steps; the
// 2026-10-17 survey moved Solitons to (0.038, 0.0665) — at lower k the spots
// replicate, and at (0.030, 0.065) they die out within ~16k steps — and
// Spirals/Chaos to where broken fronts and turbulence actually appear). Descriptive labels, not classifications computed from
// the field.
export const REGIMES: readonly Regime[] = [
  { id: "mitosis", name: "Mitosis", blurb: "spots that grow and split in two", F: PARAMS.F, k: PARAMS.k },
  { id: "coral", name: "Coral", blurb: "fronts that branch into coral", F: 0.0545, k: 0.062 },
  { id: "mazes", name: "Mazes", blurb: "rings that lock into long corridors", F: 0.029, k: 0.057 },
  { id: "solitons", name: "Solitons", blurb: "isolated spots that hold their shape", F: 0.038, k: 0.0665 },
  { id: "worms", name: "Worms", blurb: "stripes that break into short worms", F: 0.042, k: 0.061 },
  { id: "holes", name: "Holes", blurb: "a sheet riddled with holes", F: 0.039, k: 0.058 },
  { id: "chaos", name: "Chaos", blurb: "stripes that never settle", F: 0.022, k: 0.051 },
  { id: "spirals", name: "Spirals", blurb: "broken fronts that curl", F: 0.012, k: 0.047 },
];

export function nearestRegime(F: number, k: number): { regime: Regime; distance: number } {
  let best = REGIMES[0]!;
  let bd = Infinity;
  for (const r of REGIMES) {
    // normalise by the map's span so F and k count equally
    const d = Math.hypot((r.F - F) / (MAP_F[1] - MAP_F[0]), (r.k - k) / (PLANE_K[1] - PLANE_K[0]));
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return { regime: best, distance: bd };
}

export type PatternId = "coral" | "spots" | "maze" | "stripes" | "waves";

export interface ShapePattern {
  id: PatternId;
  label: string;
  model: ModelId;
  F: number;
  k: number;
  palette: PaletteId;
  start: SurfaceStart;
}

/** What "On a Shape" can coat an object with: one chemistry per model, Gray–Scott three ways. */
export const SHAPE_PATTERNS: Record<PatternId, ShapePattern> = {
  coral: { id: "coral", label: "Coral", model: "gray-scott", F: 0.0545, k: 0.062, palette: "coral", start: "seeds" },
  spots: { id: "spots", label: "Mitosis", model: "gray-scott", F: PARAMS.F, k: PARAMS.k, palette: "enamel", start: "seeds" },
  maze: { id: "maze", label: "Maze", model: "gray-scott", F: 0.029, k: 0.057, palette: "ink", start: "seeds" },
  stripes: {
    id: "stripes",
    label: "Stripes",
    model: "brusselator",
    F: MODELS.brusselator.p[0],
    k: MODELS.brusselator.p[1],
    palette: "enamel",
    start: "noise",
  },
  waves: {
    id: "waves",
    label: "Spirals",
    model: "fitzhugh-nagumo",
    F: MODELS["fitzhugh-nagumo"].p[0],
    k: MODELS["fitzhugh-nagumo"].p[1],
    palette: "nocturne",
    start: "fronts",
  },
};
export const PATTERN_IDS = Object.keys(SHAPE_PATTERNS) as PatternId[];

export interface SceneContext {
  w: number;
  h: number;
  seed: number;
}

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  /** Learn → what you're seeing. */
  story: string;
  kernel: Kernel;
  /** Reaction terms (model/models.ts); default Gray–Scott. */
  model?: ModelId;
  periodic: boolean;
  F: number;
  k: number;
  /** The Map only: F and k sweep across the grid (scenes/map.ts). */
  sweep?: boolean;
  palette: PaletteId;
  /** Initial condition; null = the committed gated asset. */
  ic: ((c: SceneContext) => Field) | null;
  /** Camera zoom as a multiple of the cover fit. */
  zoom: number;
  tools: readonly string[];
  tool: string;
  /** Runs on a closed surface ("On a Shape"): shape and pattern come from SHAPE_PATTERNS. */
  surface?: boolean;
  /** Fixed grid (the gated dish is always 128²). */
  grid?: readonly [number, number];
  /** Deterministic re-triggers: stamps to apply at the start of tick t, or null. */
  director?: (t: number, c: SceneContext) => Stamp[] | null;
  /** Shown in the scene picker. */
  listed: boolean;
}

const seedStamp = (x: number, y: number, r: number): Stamp => ({ x, y, r, strength: 1, mode: 0, F: 0, k: 0 });
const eraseStamp = (x: number, y: number, r: number): Stamp => ({ x, y, r, strength: 1, mode: 1, F: 0, k: 0 });

const every = (period: number, t: number): boolean => t > 0 && t % period === 0;

const PAINT = ["seed", "erase", "chemistry", "probe", "pan"] as const;

export const SCENES: readonly SceneDef[] = [
  {
    id: "map",
    title: "The Map",
    prompt: "Every point is a different chemistry. Pick one.",
    story:
      "One dish whose feed rate F rises from left to right and whose kill rate k rises from bottom to top, so " +
      "every point grows a different pattern at once. The window of k follows the narrow band where patterns " +
      "live — above it spots starve and vanish, below it the dish turns solid. Tap anywhere to dive in: the " +
      "chemistry there spreads outward and the pattern keeps growing.",
    kernel: "live",
    periodic: false,
    F: mapChem(0.5, 0.5)[0],
    k: mapChem(0.5, 0.5)[1],
    sweep: true,
    palette: "nocturne",
    ic: ({ w, h, seed }) => scatter(w, h, seed, { spacing: 30, radius: [3, 5], periodic: false }),
    zoom: 1,
    tools: ["dive", ...PAINT],
    tool: "dive",
    director: (t, { w, h, seed }) => {
      if (!every(1200, t)) return null;
      const r = new HashStream(seed ^ t, 7);
      return Array.from({ length: 6 }, () => seedStamp(r.next() * w, r.next() * h, r.range(3, 5)));
    },
    listed: true,
  },
  {
    id: "mitosis",
    title: "Mitosis",
    prompt: "Watch one spot become two.",
    story:
      "At this chemistry a spot of V grows until it is too big to feed, pinches in the middle and splits. The " +
      "daughters split again until the dish is full; every so often a wave clears a patch and it starts over.",
    kernel: "live",
    periodic: true,
    F: PARAMS.F,
    k: PARAMS.k,
    palette: "enamel",
    ic: ({ w, h, seed }) => centre(w, h, seed, 8),
    zoom: 1.8,
    tools: PAINT,
    tool: "seed",
    director: (t, { w, h, seed }) => {
      if (!every(4800, t)) return null;
      const x = unit(hash3(seed, t, 1)) * w;
      const y = unit(hash3(seed, t, 2)) * h;
      return [eraseStamp(x, y, Math.min(w, h) / 4), seedStamp(x, y, 5)];
    },
    listed: true,
  },
  {
    id: "coral",
    title: "Coral",
    prompt: "Draw a seed; it will branch.",
    story:
      "Here the front between the two states is unstable to bumps: any bulge grows faster than its " +
      "neighbours, so a smooth seed sprouts branches that fork into a coral-like labyrinth.",
    kernel: "live",
    periodic: true,
    F: 0.0545,
    k: 0.062,
    palette: "coral",
    ic: ({ w, h, seed }) => centre(w, h, seed, 7),
    zoom: 1.8,
    tools: PAINT,
    tool: "seed",
    director: (t, { w, h, seed }) => {
      if (!every(7200, t)) return null;
      const x = unit(hash3(seed, t, 3)) * w;
      const y = unit(hash3(seed, t, 4)) * h;
      return [eraseStamp(x, y, Math.min(w, h) / 5), seedStamp(x, y, 4)];
    },
    listed: true,
  },
  {
    id: "solitons",
    title: "Solitons",
    prompt: "Each seed becomes one spot that keeps its shape. Plant them close.",
    story:
      "A little more kill than Mitosis and spots stop dividing: each seed settles into a single spot that holds " +
      "its size, fed at its edge and starved at its core. Plant them close together and they compete for the " +
      "same food.",
    kernel: "live",
    periodic: true,
    F: 0.038,
    k: 0.0665,
    palette: "ink",
    ic: ({ w, h, seed }) => sprinkle(w, h, seed, Math.round((w * h) / 3000), [4, 6], true),
    zoom: 1.8,
    tools: PAINT,
    tool: "seed",
    director: (t, { w, h, seed }) => {
      if (!every(3600, t)) return null;
      const r = new HashStream(seed ^ t, 9);
      return [seedStamp(r.next() * w, r.next() * h, 4), seedStamp(r.next() * w, r.next() * h, 4)];
    },
    listed: true,
  },
  {
    id: "spirals",
    title: "Spirals",
    prompt: "Break a wave front and it curls.",
    story:
      "Low feed, low kill: fronts of V travel through the dish and annihilate where they meet. Where a front is " +
      "broken, its free end lags behind the rest and curls.",
    kernel: "live",
    periodic: true,
    F: 0.012,
    k: 0.047,
    palette: "nocturne",
    ic: ({ w, h, seed }) => scatter(w, h, seed, { spacing: 70, radius: [5, 8], periodic: true }),
    zoom: 1.5,
    tools: PAINT,
    tool: "erase",
    director: (t, { w, h, seed }) => {
      if (!every(2400, t)) return null;
      const x = unit(hash3(seed, t, 5)) * w;
      const y = unit(hash3(seed, t, 6)) * h;
      return [eraseStamp(x, y, Math.min(w, h) / 9)];
    },
    listed: true,
  },
  {
    id: "garden",
    title: "Gradient Garden",
    prompt: "Paint chemistry, not pixels.",
    story:
      "The chemistry brush paints a local feed and kill rate. Each painted region grows its own pattern, and " +
      "where two chemistries meet the patterns negotiate a border.",
    kernel: "live",
    periodic: true,
    F: 0.029,
    k: 0.057,
    palette: "ink",
    ic: ({ w, h, seed }) => scatter(w, h, seed, { spacing: 44, radius: [3, 5], periodic: true }),
    zoom: 1.4,
    tools: ["chemistry", "seed", "erase", "probe", "pan"],
    tool: "chemistry",
    listed: true,
  },
  {
    id: "stripes",
    title: "Turing Stripes",
    model: "brusselator",
    prompt: "A uniform mixture that cannot stay uniform. Its stripe spacing was predicted on paper.",
    story:
      "The Brusselator, from a nearly uniform start. One band of wavelengths grows faster than the rest and locks " +
      "into stripes and labyrinths; the Prove drawer measures which band grew and checks it against the " +
      "dispersion relation solved on paper. Erase a patch and the uniform mixture there breaks up again.",
    kernel: "live",
    periodic: true,
    F: MODELS.brusselator.p[0],
    k: MODELS.brusselator.p[1],
    palette: "enamel",
    ic: ({ w, h, seed }) => restNoise(w, h, seed, MODELS.brusselator.rest, 0.05),
    zoom: 2.2,
    tools: ["erase", "seed", "probe", "pan"],
    tool: "erase",
    listed: true,
  },
  {
    id: "spacing",
    title: "Spacing Spots",
    model: "gierer-meinhardt",
    prompt: "Each spot keeps its neighbours at arm's length. Erase some and watch the gap refill.",
    story:
      "Gierer–Meinhardt activator–inhibitor: every peak of the activator makes inhibitor that spreads thirty " +
      "times further than the activator does, so peaks suppress each other at a set distance and settle into an " +
      "evenly spaced field of spots. Clear a patch and new spots appear where the inhibition has faded.",
    kernel: "live",
    periodic: true,
    F: MODELS["gierer-meinhardt"].p[0],
    k: MODELS["gierer-meinhardt"].p[1],
    palette: "coral",
    ic: ({ w, h, seed }) => restNoise(w, h, seed, MODELS["gierer-meinhardt"].rest, 0.05),
    zoom: 3,
    tools: ["erase", "seed", "probe", "pan"],
    tool: "erase",
    director: (t, { w, h, seed }) => {
      if (!every(6000, t)) return null;
      const x = unit(hash3(seed, t, 7)) * w;
      const y = unit(hash3(seed, t, 8)) * h;
      return [eraseStamp(x, y, Math.min(w, h) / 6)];
    },
    listed: true,
  },
  {
    id: "excitable",
    title: "Excitable Waves",
    model: "fitzhugh-nagumo",
    prompt: "Break a wave and its free ends curl into spirals.",
    story:
      "FitzHugh–Nagumo, a caricature of nerve and heart tissue. A kicked region fires a pulse; behind it the " +
      "recovery variable keeps the tissue refractory, so pulses only move forward and annihilate when they meet. " +
      "The broken fronts you start with wind up into rotating spirals.",
    kernel: "live",
    periodic: true,
    F: MODELS["fitzhugh-nagumo"].p[0],
    k: MODELS["fitzhugh-nagumo"].p[1],
    palette: "nocturne",
    ic: ({ w, h, seed }) => brokenFronts(w, h, seed, MODELS["fitzhugh-nagumo"].rest, 1, 0.75),
    zoom: 1.2,
    tools: ["erase", "seed", "probe", "pan"],
    tool: "erase",
    listed: true,
  },
  {
    id: "shape",
    title: "On a Shape",
    prompt: "Pick an object to coat. Drag to turn it; paint with Seed.",
    story:
      "The same chemistry, grown on a closed surface instead of a flat dish. The 5-point Laplacian becomes the " +
      "surface's own Laplace–Beltrami operator — a geodesic sphere's Voronoi cells or a torus's θ × φ grid — so the " +
      "pattern has nowhere to end: spots crowd the inner ring of the torus differently from its outside, and " +
      "fronts wrap all the way round.",
    kernel: "surface",
    surface: true,
    periodic: true,
    F: SHAPE_PATTERNS.coral.F,
    k: SHAPE_PATTERNS.coral.k,
    palette: "coral",
    ic: null,
    zoom: 1,
    tools: ["pan", "seed", "erase", "probe"],
    tool: "pan",
    listed: true,
  },
  {
    id: "dish",
    title: "Dish",
    prompt: "Drag the dot on the map to move through pattern space.",
    story: "A dish at one chemistry, seeded on a loose lattice.",
    kernel: "live",
    periodic: true,
    F: PARAMS.F,
    k: PARAMS.k,
    palette: "nocturne",
    ic: ({ w, h, seed }) => scatter(w, h, seed, { spacing: 40, radius: [3, 5], periodic: true }),
    zoom: 1.8,
    tools: PAINT,
    tool: "seed",
    listed: false,
  },
  {
    id: "gated",
    title: "The gated dish",
    prompt: "Exactly what the browser gate checks, live.",
    story:
      "The 128 × 128 dish the verification gate runs: the committed kernel, the canonical feed and kill, and " +
      "the committed seed-42 starting field, tiled to fill the screen. Edits here take it off the gated run — " +
      "Prove will say so.",
    kernel: "reference",
    periodic: true,
    F: PARAMS.F,
    k: PARAMS.k,
    palette: "enamel",
    ic: null,
    zoom: 0.6,
    tools: ["probe", "seed", "erase", "pan"],
    tool: "probe",
    grid: [128, 128],
    listed: true,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
