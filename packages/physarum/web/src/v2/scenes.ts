// Slime Mould scenes. Every scene starts from a fixed seed, so Restart
// reproduces it. Living scenes (M1) start from a personality on the pad and
// turn by Jones's stochastic rule; the M0 scenes keep the gated rule.
//
// Measured in M0 (docs/planning/rebuild-v2/02-physarum.md, "M0 findings"):
//   * at the declared density, Jones's Table 1 values (reach 9) knit a network
//     for a few seconds and then break into separate straight rods; reach 18
//     gives a polygon network that coarsens slowly. Table 1 is a scene;
//   * a dense colony released at the centre never spreads under the Jones
//     rule (agents are captured by the strongest trail).
// Measured in M1:
//   * a colony grows outward if the rest of the agents start dormant and wake
//     when its trail reaches them (0.1 of one agent's deposit): a branching
//     front fills a T3 dish in about ten seconds. Higher thresholds (0.25 and
//     up) never wake anyone — the colony collapses first;
//   * crumbs depositing 40 agents' worth per cell per step anchor the network:
//     it contracts onto straight tubes between crumbs with three-way junctions
//     within ~5,000 steps. At 2× they barely register.

import type { EnvSpec, SeedSpec, Spot } from "./model/sim.js";
import { hash3, unit } from "@bp/runtime";
import type { JonesParams } from "./proof/gate.js";
import { PARAMS } from "./proof/gate.js";
import type { PaletteId } from "./render/look.js";
import type { PadPoint } from "./pad.js";
import { CORNERS, PAD_CENTRE, padParams } from "./pad.js";
import { CITIES, kantoFood, kantoWalls, projector } from "./cities.js";
import { makeMaze, mazeFood, mazeWalls } from "./maze.js";

export type SceneId = "first-light" | "cities" | "maze" | "lace" | "light" | "network" | "table1" | "gated";
export type ToolId = "pan" | "food" | "light" | "wall" | "probe";

export interface Director {
  /** What an untouched scene does to stay alive (00-foundation.md § 1, "nothing settles into nothing"). */
  kind: "rescatter" | "crumb" | "drift";
  /** Rescatter / crumb: act every this many steps. */
  everySteps: number;
}

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  listed: boolean;
  kind: "live" | "gated";
  /** The parameters the scene starts with. */
  params: JonesParams;
  /** The pad point the scene starts at (null: a scene of the gated rule). */
  personality: PadPoint | null;
  /** Live scenes: the starting agents on a w × h dish. */
  seed?: (w: number, h: number, seed: number) => SeedSpec;
  /** The scene's environment on a w × h dish (food, lights, walls). */
  env?: (w: number, h: number, seed: number) => EnvSpec;
  palette: PaletteId;
  director?: Director;
  tools: ToolId[];
  tool: ToolId;
  /** What the score card measures: the network against the planner's trees, or the route through a maze. */
  score?: "cities" | "maze";
  /**
   * Hunger: an agent that goes this many times the shortest route's length
   * (in its own steps) without food is taken back to a food source.
   */
  hungerPerRoute?: number;
  /** The speed the scene plays at when picked (its own clock is unchanged). */
  speed?: number;
}

/** Food crumb radius on a w × h dish (cells): the same size on screen at every tier. */
export const crumbRadius = (w: number, h: number): number => Math.max(3, Math.min(w, h) * 0.007);

/** Twelve crumbs in two loose rings round the centre (dish-relative, so every tier gets the same layout). */
export function firstLightFood(w: number, h: number, seed: number): Spot[] {
  const m = Math.min(w, h);
  const r = crumbRadius(w, h);
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

/** The director's next crumb for First Light: somewhere on the dish not too close to the others. */
export function nextCrumb(w: number, h: number, seed: number, k: number, food: readonly Spot[]): Spot {
  const r = crumbRadius(w, h);
  const m = Math.min(w, h);
  let best: Spot = { x: w / 2, y: h / 2, r };
  let bestD = -1;
  for (let t = 0; t < 12; t += 1) {
    const x = (0.08 + 0.84 * unit(hash3(seed, 101 + k, t))) * w;
    const y = (0.1 + 0.8 * unit(hash3(seed, 211 + k, t))) * h;
    let d = Infinity;
    for (const f of food) d = Math.min(d, Math.hypot(f.x - x, f.y - y));
    if (d > 0.18 * m) return { x, y, r };
    if (d > bestD) {
      bestD = d;
      best = { x, y, r };
    }
  }
  return best;
}

/** Light Avoidance: the light's radius and its untouched drift (a slow loop round the dish centre). */
export const lightRadius = (w: number, h: number): number => Math.min(w, h) * 0.13;
export function lightDrift(w: number, h: number, tick: number): { x: number; y: number } {
  const t = tick / 120;
  return { x: w * (0.5 + 0.26 * Math.sin(t * 0.11)), y: h * (0.5 + 0.22 * Math.sin(t * 0.17 + 1.1)) };
}

const growth = (w: number, h: number, seed: number): SeedSpec => ({
  mode: 3,
  seed,
  centre: [w / 2, h / 2],
  radius: Math.min(w, h) * 0.05,
  spread: 0.8,
  wake: 0.1,
});
const scatter = (_w: number, _h: number, seed: number): SeedSpec => ({ mode: 0, seed });
const cornerAt = (id: string): PadPoint => CORNERS.find((c) => c.id === id)!.at;
const FOOD = { foodDeposit: 40, scent: 4 } as const;

export const SCENES: readonly SceneDef[] = [
  {
    id: "first-light",
    title: "First Light",
    prompt: "It's hungry. Add food and watch it reroute.",
    listed: true,
    kind: "live",
    personality: PAD_CENTRE,
    params: padParams(PAD_CENTRE),
    seed: growth,
    env: (w, h, seed) => ({ food: firstLightFood(w, h, seed), lights: [], walls: null, ...FOOD, scentRange: Math.min(w, h) * 0.3, light: 60 }),
    palette: "ember",
    // left alone, it gets a new crumb now and then and reroutes to it
    director: { kind: "crumb", everySteps: 2400 },
    tools: ["pan", "food", "light", "probe"],
    tool: "food",
  },
  {
    id: "cities",
    title: "Connect the Cities",
    prompt: "Can a brainless mould beat a planner?",
    listed: true,
    kind: "live",
    personality: PAD_CENTRE,
    params: padParams(PAD_CENTRE),
    // as in Tero et al. 2010: a small colony starts at Tokyo and grows across the plain
    seed: (w, h, seed) => {
      const t = CITIES.find((c) => c.name === "Tokyo")!;
      return { ...growth(w, h, seed), centre: projector(w, h)(t.lon, t.lat), radius: Math.min(w, h) * 0.025 };
    },
    // no scent here: thirty summed scents make one pull to the middle of the map (measured)
    env: (w, h) => ({ food: kantoFood(w, h, crumbRadius(w, h)), lights: [], walls: kantoWalls(w, h), ...FOOD, scent: 0, scentRange: Math.min(w, h) * 0.3, light: 60 }),
    palette: "ember",
    tools: ["pan", "food", "probe"],
    tool: "pan",
    score: "cities",
  },
  {
    id: "maze",
    title: "The Maze",
    prompt: "Will it find the shortest path? Block it and see.",
    listed: true,
    kind: "live",
    personality: PAD_CENTRE,
    params: padParams(PAD_CENTRE),
    // as in Nakagaki et al. 2000: the mould fills the maze first, then food goes in at both ends
    seed: scatter,
    env: (w, h, seed) => {
      const m = makeMaze(w, h, seed);
      // no scent: it would leak through the walls
      return { food: mazeFood(m, crumbRadius(w, h)), lights: [], walls: mazeWalls(m, w, h), ...FOOD, scent: 0, scentRange: Math.min(w, h) * 0.3, light: 60 };
    },
    palette: "deepsea",
    tools: ["pan", "wall", "probe"],
    tool: "wall",
    score: "maze",
    // measured at T3, 6 seeds: 3× broke the route in half the seeds by 16,000 steps; 5× held it in all
    hungerPerRoute: 5,
    // the route settles in ~8,000–16,000 steps: one to two minutes at 1×
    speed: 4,
  },
  {
    id: "lace",
    title: "Lace",
    prompt: "Nothing to solve. Just watch.",
    listed: true,
    kind: "live",
    personality: cornerAt("lace"),
    params: padParams(cornerAt("lace")),
    seed: scatter,
    palette: "deepsea",
    // the finest foam coarsens as it ages; start again before it thins out
    director: { kind: "rescatter", everySteps: 4800 },
    tools: ["pan", "food", "light", "probe"],
    tool: "pan",
  },
  {
    id: "light",
    title: "Light Avoidance",
    prompt: "Shine the light; it retreats and rebuilds.",
    listed: true,
    kind: "live",
    personality: PAD_CENTRE,
    params: padParams(PAD_CENTRE),
    seed: scatter,
    env: (w, h) => {
      const at = lightDrift(w, h, 0);
      return { food: [], lights: [{ ...at, r: lightRadius(w, h) }], walls: null, ...FOOD, scentRange: Math.min(w, h) * 0.3, light: 60 };
    },
    palette: "ember",
    // left alone, the light wanders on a slow loop
    director: { kind: "drift", everySteps: 0 },
    tools: ["pan", "light", "food", "probe"],
    tool: "light",
  },
  {
    id: "network",
    title: "The network",
    prompt: "Agents scattered at random knit a network of glowing tubes, then slowly prune it.",
    listed: true,
    kind: "live",
    personality: null,
    params: { ...PARAMS, L_sense: 18 },
    seed: scatter,
    palette: "ember",
    // measured: polygons by ~2,000 steps, mostly pruned to rods by ~7,000
    director: { kind: "rescatter", everySteps: 7200 },
    tools: ["pan", "probe"],
    tool: "pan",
  },
  {
    id: "table1",
    title: "Jones's Table 1",
    prompt: "The gated parameters at full scale: the network forms, then breaks into marching rods.",
    listed: true,
    kind: "live",
    personality: null,
    params: { ...PARAMS },
    seed: scatter,
    palette: "deepsea",
    tools: ["pan", "probe"],
    tool: "pan",
  },
  {
    id: "gated",
    title: "The gated dish",
    prompt: "The exact run the release gate checks: 500 agents on 256 × 256 from the committed seed-42 start.",
    listed: true,
    kind: "gated",
    personality: null,
    params: { ...PARAMS },
    palette: "ember",
    tools: ["pan", "probe"],
    tool: "pan",
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}

export const sameParams = (a: JonesParams, b: JonesParams): boolean =>
  a.delta_phi_deg === b.delta_phi_deg && a.L_sense === b.L_sense && a.L_move === b.L_move && a.deposit === b.deposit && a.decay_alpha === b.decay_alpha;
