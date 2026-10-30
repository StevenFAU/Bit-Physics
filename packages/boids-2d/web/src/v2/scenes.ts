// Swarm scenes. Every scene starts from a fixed seed, so Restart reproduces
// it. Open Water runs the gated v4 kernel at the tier's full fish count; the
// proof flock is the in-page GPU proofs' own pinned run, on screen. M1 adds
// The Order Dial (the Vicsek model, ./model/brains.ts) and The Mill (Couzin's
// zones). M2 adds Current (the water as a solved incompressible fluid,
// ./model/fluid.ts, coupled two ways to the v4 flock) and Food Chain. M3 adds
// Eyes Only (Bastien & Romanczuk 2020's vision-only model, ./model/brains-m3.ts)
// and Species Matrix (2–6 species and a signed matrix of who steers towards whom).

import type { Tier } from "@bp/gpu";
import type { BrainParams, CouzinParams, VicsekParams } from "./model/brains.js";
import type { SpeciesPreset, VisionBrainParams } from "./model/brains-m3.js";
import { speciesPreset } from "./model/brains-m3.js";
import type { EcoParams } from "./model/ecology.js";
import { FOOD_CHAIN } from "./model/ecology.js";
import type { FluidParams } from "./model/fluid.js";
import { CURRENT_FLUID } from "./model/fluid.js";
import type { InitMode } from "./model/init.js";
import type { M1Init } from "./model/init-m1.js";
import type { M3Init } from "./model/init-m3.js";
import type { RuleParams } from "./model/params.js";
import type { World } from "./model/world.js";
import { AGENTS, V4_DENSITY, worldFor } from "./model/world.js";

export type SceneId = "open-water" | "order-dial" | "mill" | "current" | "food-chain" | "eyes-only" | "species" | "proof";

/** Current's water: grid rows per tier, motes per tier, the fluid's numbers and the push (laminar peak speed). */
export interface WaterDef {
  rows: Record<Tier, number>;
  motes: Record<Tier, number>;
  params: FluidParams;
  tide: number;
}

/** Food Chain: fish slots are the scene's counts; this many start alive, and the sharks. */
export interface EcologyDef {
  fish0: number;
  sharkSlots: Record<Tier, number>;
  sharks0: number;
  params: EcoParams;
}

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  listed: boolean;
  kind: "live" | "proof";
  rule: RuleParams;
  /** Fish per world unit² (live scenes; the world is sized from it unless `world` is given). */
  density: number;
  init: InitMode | M1Init | M3Init;
  /** The shark is the scene's tool. */
  shark: boolean;
  /** Fish per tier (default: Open Water's, AGENTS). */
  counts?: Record<Tier, number>;
  /** The ocean for n fish at a viewport aspect (default: n / density at that aspect). */
  world?: (n: number, aspect: number) => World;
  /** An M1 brain for n fish (default: the v4 Reynolds rule, the gated kernel). */
  brain?: (n: number) => BrainParams;
  /** Reduce the order parameters about the circular-mean centre (a single school on the torus). */
  torusOrder?: boolean;
  /** World units of the Shark tool's Size ("r"). Default: the rule's reach r. */
  sharkUnit?: (n: number) => number;
  /** Starting zoom relative to the cover fit (default 1: the whole ocean). */
  zoom?: number;
  /** World units per fish length / caustic cell (default: the look's own). */
  scale?: { fishLength: number; causticCell: number };
  /** M2 Current: the water the fish swim in. */
  water?: WaterDef;
  /** M2 Food Chain: plankton, fish lives, sharks. */
  ecology?: EcologyDef;
  /** Memory reorder cadence override (Food Chain: 0 — a fish's slot holds its life). */
  sortEvery?: number;
  /** Cap on the measured exposure (sparse scenes, where the meter would otherwise light the water). */
  exposureMax?: number;
  /** The fish colour the scene opens with (default silver), unless the visitor chose one. */
  colour?: "silver" | "heading" | "species";
}

/** v4's "flock" preset (index.html PRESETS.flock), the rule the v4 lab opened with. */
export const V4_FLOCK: RuleParams = { wSep: 1.6, wAli: 1.1, wCoh: 0.9, rCoh: 0.105, maxSpeed: 0.0065, noise: 0.0, fovDeg: 360 };

/**
 * The in-page GPU proofs' pinned configuration (v4 D-8: N = 4096, 60 steps)
 * on v4's own 16:9 world (half-extents 16/9 × 1), whatever the viewport.
 */
export const PROOF = { n: 4096, steps: 60, seed: 42, halfW: 16 / 9, halfH: 1 } as const;

export const OPEN_WATER_RULE: RuleParams = { wSep: 1.6, wAli: 1.1, wCoh: 0.9, rCoh: 0.105, maxSpeed: 0.0065, noise: 0.0, fovDeg: 360 };

// ---- The Order Dial: the Vicsek model ------------------------------------------------
//
// Vicsek's units take the interaction radius as 1; the dimensionless numbers
// are the density ρ (fish per r²), the speed v₀ (in r per step) and the noise
// η. The ocean holds the tier's fish at Open Water's density, so ρ is set by
// the radius: r = √(ρ / fish per unit²), and v₀ = VICSEK_V0 · r keeps the speed
// fixed in Vicsek's units as ρ changes.

/** Speed in units of r per step (Vicsek 1995 used 0.03; Chaté et al. 2008 used 0.5). */
export const VICSEK_V0 = 0.2;
/** The density range The Order Dial's map covers (fish per r²). */
export const RHO_RANGE: readonly [number, number] = [0.25, 8];
export const DIAL_RHO = 1;
export const DIAL_ETA = 0.15;

export const vicsekRadius = (rho: number, density = V4_DENSITY): number => Math.sqrt(rho / density);
export const vicsekRho = (r: number, density = V4_DENSITY): number => r * r * density;

export function vicsekFor(rho: number, eta: number, density = V4_DENSITY): VicsekParams {
  const r = vicsekRadius(rho, density);
  return { r, speed: VICSEK_V0 * r, eta };
}

// ---- The Mill: Couzin's zones -----------------------------------------------------------
//
// Lengths are in units of the zone of repulsion (r_r = 1 world unit). The
// mill is Couzin et al. 2002's torus: a narrow zone of orientation (Δr_o = 1)
// and a zone of attraction that spans the school, a 270° field of view and a
// 4° turn per step at 0.3 per step (Couzin's s = 3, θ = 40°/s, τ = 0.1 s).
// Measured (a CPU prototype, then the page): from a ring or a random disc the
// school settles into a single mill, O_r ≈ 0.8 and O_p < 0.1 — Tunstrøm et
// al. 2013's milling region (O_p < 0.35, O_r > 0.65).

export const MILL_COUNTS: Record<Tier, number> = { T3: 8192, T2: 4096, T1: 2048 };
/** Mean distance from the mill's centre, measured at 1,000 fish (≈ 17 r_r), scaled by √N. */
export const millRadius = (n: number): number => 17 * Math.sqrt(n / 1000);

export function couzinFor(n: number): CouzinParams {
  return {
    rr: 1,
    ro: 2,
    // the attraction zone reaches across the school (≈ 3.5 mean radii)
    ra: Math.max(16, 3.5 * millRadius(n)),
    fovDeg: 270,
    maxTurn: (4 * Math.PI) / 180,
    speed: 0.3,
    sigma: 0.05,
  };
}

// ---- Current: the water as a solved fluid ------------------------------------------------
//
// The fish are Open Water's (the gated v4 kernel, untouched) at Open Water's
// density; the water is ./model/fluid.ts. The push's laminar peak speed is
// v4's top speed, so the current is as fast as a fish swims.

export const CURRENT_COUNTS: Record<Tier, number> = { T3: 262144, T2: 131072, T1: 65536 };
export const CURRENT_WATER: WaterDef = {
  rows: { T3: 128, T2: 128, T1: 64 },
  motes: { T3: 65536, T2: 49152, T1: 24576 },
  params: CURRENT_FLUID,
  tide: 0.0065,
};

// ---- Food Chain: plankton → fish → sharks -------------------------------------------------------
//
// The fish slots are the ceiling on the fish; the ocean holds them all at
// Open Water's density. A quarter start alive, with six sharks.

export const FOOD_COUNTS: Record<Tier, number> = { T3: 32768, T2: 16384, T1: 8192 };
export const FOOD_CHAIN_DEF: EcologyDef = {
  fish0: 0.15,
  sharkSlots: { T3: 128, T2: 96, T1: 64 },
  sharks0: 6,
  params: FOOD_CHAIN,
};

// ---- Eyes Only: the vision-based model -------------------------------------------------
//
// Bastien & Romanczuk 2020's minimal model (./model/vision-cpu.ts). Lengths are
// in body lengths (BL = 1 world unit: a fish is a disc of radius 0.5). The
// rates are the paper's Fig. 3C pair (α₀ 0.1, β₀ 0.02) with γ 0.1 and v₀ 0.5 BL
// per unit time, as the authors' code; the equilibrium distance L_eq =
// BL / (2α₁) is 2.5 BL. One step is one unit of time (the authors' code takes
// 0.1; measured: groups of 20 polarize the same at either, φ ≈ 0.95). A fish sees
// 15 BL (murky water; the paper's fish see forever): measured on the f64
// reference, 1,024 fish scattered at this density gather and swim one way
// (φ 0.5 by step ~450, 0.9 by ~800); with the edge terms off they never do.

export const EYES_COUNTS: Record<Tier, number> = { T3: 2048, T2: 2048, T1: 1024 };
/** Fish per BL² (2,048 fish on a 300 × 300 BL ocean). */
export const EYES_DENSITY = 2048 / (300 * 300);
/** The equilibrium distance the edge weights set, BL. */
export const EYES_LEQ = 2.5;

export function visionFor(): VisionBrainParams {
  const R = 0.5;
  return { R, speed: 0.5, gamma: 0.1, a0: 0.1, a1: R / EYES_LEQ, b0: 0.02, b1: R / EYES_LEQ, dt: 1, range: 15 };
}

// ---- Species Matrix: who steers towards whom ----------------------------------------------
//
// Open Water's rule for every species (the v4 lab's multi-species coupling,
// with whole-number sums), at Open Water's density. It opens on three species
// playing rock–paper–scissors.

export const SPECIES_COUNTS: Record<Tier, number> = { T3: 65536, T2: 32768, T1: 16384 };
export const SPECIES_START: { preset: SpeciesPreset; count: number } = { preset: "cycle", count: 3 };

export const SCENES: readonly SceneDef[] = [
  {
    id: "open-water",
    title: "Open Water",
    prompt: "Hunt them. Watch the school split and heal.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "random",
    shark: true,
  },
  {
    id: "order-dial",
    title: "The Order Dial",
    prompt: "Turn panic up until order breaks.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "aligned",
    shark: false,
    brain: () => ({ kind: "vicsek", p: vicsekFor(DIAL_RHO, DIAL_ETA) }),
  },
  {
    id: "mill",
    title: "The Mill",
    prompt: "A school that swims in circles. Push it out.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "annulus",
    shark: true,
    counts: MILL_COUNTS,
    world: (n, aspect) => {
      const halfH = 3.4 * millRadius(n);
      return { halfH, halfW: halfH * Math.min(Math.max(aspect, 0.4), 2.5) };
    },
    brain: (n) => ({ kind: "couzin", p: couzinFor(n) }),
    torusOrder: true,
    sharkUnit: () => 2,
    zoom: 1.8,
    scale: { fishLength: 0.7, causticCell: 24 },
  },
  {
    id: "current",
    title: "Current",
    prompt: "Paint a current. The school rides it — and pushes back.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    init: "random",
    shark: true,
    counts: CURRENT_COUNTS,
    water: CURRENT_WATER,
    // half Open Water's crowding, so open water shows between the schools
    density: V4_DENSITY / 2,
    zoom: 2.2,
  },
  {
    id: "food-chain",
    title: "Food Chain",
    prompt: "Populations rise and crash. Keep them alive.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "random",
    shark: false,
    counts: FOOD_COUNTS,
    ecology: FOOD_CHAIN_DEF,
    sortEvery: 0,
    scale: { fishLength: 0.03, causticCell: 0.7 },
  },
  {
    id: "eyes-only",
    title: "Eyes Only",
    prompt: "No alignment rule at all. They still school.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: EYES_DENSITY,
    init: "sight",
    shark: false,
    counts: EYES_COUNTS,
    brain: () => ({ kind: "vision", p: visionFor() }),
    zoom: 1.2,
    scale: { fishLength: 1, causticCell: 20 },
    colour: "heading",
    // a few thousand fish leave most of the water dark: don't let the meter brighten the water
    exposureMax: 1,
  },
  {
    id: "species",
    title: "Species Matrix",
    prompt: "Who chases whom? Edit the matrix.",
    listed: true,
    kind: "live",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "species",
    shark: false,
    counts: SPECIES_COUNTS,
    brain: () => ({ kind: "species", p: speciesPreset(SPECIES_START.preset, SPECIES_START.count) }),
    zoom: 1.6,
    colour: "species",
  },
  {
    id: "proof",
    title: "The proof flock",
    prompt: "The run the in-page proofs check: 4,096 fish from seed 42, with no shark.",
    listed: false,
    kind: "proof",
    rule: OPEN_WATER_RULE,
    density: V4_DENSITY,
    init: "random",
    shark: false,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}

/** Fish for a scene at a tier. */
export const sceneCount = (s: SceneDef, tier: Tier): number => s.counts?.[tier] ?? AGENTS[tier];

/** The ocean for a scene. */
export function sceneWorld(s: SceneDef, n: number, viewW: number, viewH: number): World {
  if (s.world) return s.world(n, viewW / Math.max(viewH, 1));
  return worldFor(n, viewW, viewH, s.density);
}
