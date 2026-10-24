// The personality pad (02-physarum.md § Why it will be consistent, 1): a
// species personality picked on a 2D pad instead of five interacting numbers.
//
//   across  Explorer ↔ Forager — turn angle 22.5° → 67.5° and step 2 → 0.5:
//           explorers run long and straight, foragers turn tightly and stay;
//   up      Fine ↔ Bold — sensor reach 12 → 24 cells and fade 0.15 → 0.05:
//           fine networks are crisp and small, bold ones broad and glowing.
//
// The spec put the deposit on the Bold axis. Measured in M1: without food the
// deposit only scales the trail (the rule compares three samples, so a
// uniform scale changes no turn), so it cannot change the shape. The fade
// can, and takes its place.
//
// Every personality turns by Jones's own stochastic rule — a random side
// when both beat the centre, and a 5% chance per step of a random turn —
// rather than the gated deterministic one: measured in M1, that keeps each
// network in one connected piece instead of breaking into marching rods.
//
// The pad is a 5 × 5 lattice of tested personalities. Each was run on its own
// dish at T1, T2 and T3 from three seeds (tools: v2-calibrate.mjs), and only
// points whose morphology agreed across seeds are offered at a tier
// (src/v2/generated/pad-calibration.json); the puck snaps to those.

import type { Tier } from "@bp/gpu";
import CAL from "./generated/pad-calibration.json";
import type { JonesParams } from "./proof/gate.js";

export const PAD_N = 5;

/** Chance per step of a random turn, for every personality (on top of Jones's random side when both beat the centre). */
export const PAD_JITTER = 0.05;

export interface PadPoint {
  /** Explorer (0) → Forager (PAD_N − 1). */
  i: number;
  /** Fine (0) → Bold (PAD_N − 1). */
  j: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const geo = (a: number, b: number, t: number): number => a * Math.pow(b / a, t);
/** Round to a few significant steps so values read cleanly in Tune and links. */
const snap = (v: number, q: number): number => Math.round(v / q) * q;

/** The parameters at a pad point (deposit stays Jones's 5). */
export function padParams(p: PadPoint): JonesParams {
  const u = p.i / (PAD_N - 1);
  const v = p.j / (PAD_N - 1);
  return {
    delta_phi_deg: snap(lerp(22.5, 67.5, u), 0.25),
    L_sense: snap(geo(12, 24, v), 0.1),
    L_move: snap(geo(2, 0.5, u), 0.01),
    deposit: 5,
    decay_alpha: snap(geo(0.15, 0.05, v), 0.001),
  };
}

/** The four named corners — the regimes that appear there reliably (pad-calibration.json). */
export const CORNERS: { id: string; name: string; at: PadPoint; blurb: string }[] = [
  { id: "veins", name: "Veins", at: { i: 0, j: 0 }, blurb: "thin runners that wander the dish and rarely close a loop" },
  { id: "lace", name: "Lace", at: { i: PAD_N - 1, j: 0 }, blurb: "the finest foam: hundreds of small closed cells" },
  { id: "rivers", name: "Rivers", at: { i: 0, j: PAD_N - 1 }, blurb: "broad channels that meander in long loops" },
  { id: "cells", name: "Cells", at: { i: PAD_N - 1, j: PAD_N - 1 }, blurb: "large, soft-walled closed cells" },
];

export const PAD_CENTRE: PadPoint = { i: 2, j: 2 };

export function padKey(p: PadPoint): string {
  return `${p.i},${p.j}`;
}

interface CalPoint {
  i: number;
  j: number;
  stable: boolean;
}

/** Points offered at a tier: those whose morphology agreed across seeds there (pad-calibration.json). */
export function stablePoints(tier: Tier): Set<string> {
  const t = (CAL.tiers as Record<string, { points: CalPoint[] }>)[tier];
  return new Set((t?.points ?? []).filter((p) => p.stable).map((p) => padKey(p)));
}

/** The offered point nearest `p` at a tier (p itself when offered). */
export function nearestOffered(p: PadPoint, tier: Tier): PadPoint {
  const offered = stablePoints(tier);
  if (offered.has(padKey(p)) || offered.size === 0) return p;
  let best = p;
  let bd = Infinity;
  for (const k of offered) {
    const [i, j] = k.split(",").map(Number) as [number, number];
    // ties prefer the forager side (the networks that close loops)
    const d = (i - p.i) ** 2 + (j - p.j) ** 2 - i * 1e-3;
    if (d < bd) {
      bd = d;
      best = { i, j };
    }
  }
  return best;
}

/** The pad point whose parameters these are, if any. */
export function padPointOf(params: JonesParams): PadPoint | null {
  for (let i = 0; i < PAD_N; i += 1) {
    for (let j = 0; j < PAD_N; j += 1) {
      const q = padParams({ i, j });
      if (
        q.delta_phi_deg === params.delta_phi_deg &&
        q.L_move === params.L_move &&
        q.L_sense === params.L_sense &&
        q.decay_alpha === params.decay_alpha &&
        q.deposit === params.deposit
      )
        return { i, j };
    }
  }
  return null;
}
