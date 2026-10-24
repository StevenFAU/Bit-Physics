// Slime Mould scenes (M0). Every scene starts from a fixed seed, so Restart
// reproduces it. The live scenes run the Jones kernel at the tier's full
// agent count on the density-coupled grid; the gated scene is the release
// gate's own run, on screen. (M1 adds First Light, Lace and Light Avoidance
// with the personality pad.)
//
// Measured in M0 (docs/planning/rebuild-v2/02-physarum.md, "M0 findings"):
//   * at the declared density, Jones's Table 1 values (reach 9) knit a network
//     for a few seconds and then break into separate straight rods — the
//     model has no crowding rule and no random turns, so agents in a strand
//     lock step and march straight. Doubling the sensor reach to 18 (all else
//     Table 1) gives a true polygon network that coarsens slowly instead. That
//     is the default; Table 1 itself is a scene, labelled as such;
//   * no "colony released at the centre" scene: a dense release never spreads
//     under the Jones rule (agents are captured by the strongest trail, so a
//     disc or ring collapses into a stable hot ring and only four
//     lattice-aligned jets escape). Pulling a colony outward needs food —
//     First Light's crumbs in M1.

import type { EnvSpec, SeedSpec, Spot } from "./model/sim.js";
import { hash3, unit } from "@bp/runtime";
import type { JonesParams } from "./proof/gate.js";
import { PARAMS } from "./proof/gate.js";
import type { PaletteId } from "./render/look.js";

export type SceneId = "first-light" | "network" | "table1" | "gated";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  listed: boolean;
  kind: "live" | "gated";
  /** The parameters the scene starts with. */
  params: JonesParams;
  /** Live scenes: the starting agents on a w × h dish. */
  seed?: (w: number, h: number, seed: number) => SeedSpec;
  palette: PaletteId;
  /**
   * "Nothing settles into nothing" (00-foundation.md § 1): once the network
   * has pruned itself (after this many steps), an untouched scene scatters
   * the agents again from the next seed.
   */
  director?: { everySteps: number };
  /** The scene's environment on a w × h dish (food, lights, walls). */
  env?: (w: number, h: number, seed: number) => EnvSpec;
}

/** Twelve crumbs in two loose rings round the centre (dish-relative, so every tier gets the same layout). */
export function firstLightFood(w: number, h: number, seed: number): Spot[] {
  const m = Math.min(w, h);
  const r = Math.max(3, m * 0.007);
  const out: Spot[] = [];
  const ring = (count: number, radius: number, phase: number, salt: number): void => {
    for (let i = 0; i < count; i += 1) {
      const j = unit(hash3(seed, salt, i));
      const k = unit(hash3(seed, salt + 1, i));
      const a = phase + (i / count) * Math.PI * 2 + (j - 0.5) * 0.5;
      const rr = radius * (0.88 + 0.24 * k);
      out.push({ x: w / 2 + Math.cos(a) * rr * m, y: h / 2 + Math.sin(a) * rr * m, r });
    }
  };
  ring(5, 0.2, 0.3, 11);
  ring(7, 0.4, 0.0, 13);
  return out;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "first-light",
    title: "First Light",
    prompt: "It's hungry. Add food and watch it reroute.",
    listed: true,
    kind: "live",
    params: { ...PARAMS, L_sense: 18 },
    seed: (w, h, seed) => ({ mode: 3, seed, centre: [w / 2, h / 2], radius: Math.min(w, h) * 0.05, spread: 0.8, wake: 0.1 }),
    env: (w, h, seed) => ({
      food: firstLightFood(w, h, seed),
      lights: [],
      walls: null,
      foodDeposit: 40,
      scent: 4,
      scentRange: Math.min(w, h) * 0.3,
      light: 0,
    }),
    palette: "ember",
  },
  {
    id: "network",
    title: "The network",
    prompt: "Agents scattered at random knit a network of glowing tubes, then slowly prune it.",
    listed: true,
    kind: "live",
    params: { ...PARAMS, L_sense: 18 },
    seed: (_w, _h, seed) => ({ mode: 0, seed }),
    palette: "ember",
    // measured: polygons by ~2,000 steps, mostly pruned to rods by ~7,000
    director: { everySteps: 7200 },
  },
  {
    id: "table1",
    title: "Jones's Table 1",
    prompt: "The gated parameters at full scale: the network forms, then breaks into marching rods.",
    listed: true,
    kind: "live",
    params: { ...PARAMS },
    seed: (_w, _h, seed) => ({ mode: 0, seed }),
    palette: "deepsea",
  },
  {
    id: "gated",
    title: "The gated dish",
    prompt: "The exact run the release gate checks: 500 agents on 256 × 256 from the committed seed-42 start.",
    listed: true,
    kind: "gated",
    params: { ...PARAMS },
    palette: "ember",
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}

export const sameParams = (a: JonesParams, b: JonesParams): boolean =>
  a.delta_phi_deg === b.delta_phi_deg && a.L_sense === b.L_sense && a.L_move === b.L_move && a.deposit === b.deposit && a.decay_alpha === b.decay_alpha;
