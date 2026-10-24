// Swarm scenes (M0). Every scene starts from a fixed seed, so Restart
// reproduces it. Open Water runs the gated v4 kernel at the tier's full fish
// count; the proof flock is the in-page GPU proofs' own pinned run, on screen.
// (M1 adds The Order Dial and The Mill; M2 Food Chain and Current.)

import type { InitMode } from "./model/init.js";
import type { RuleParams } from "./model/params.js";
import { V4_DENSITY } from "./model/world.js";

export type SceneId = "open-water" | "proof";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  listed: boolean;
  kind: "live" | "proof";
  rule: RuleParams;
  /** Fish per world unit² (live scenes; the world is sized from it). */
  density: number;
  init: InitMode;
  /** The shark is the scene's tool. */
  shark: boolean;
}

/** v4's "flock" preset (index.html PRESETS.flock), the rule the v4 lab opened with. */
export const V4_FLOCK: RuleParams = { wSep: 1.6, wAli: 1.1, wCoh: 0.9, rCoh: 0.105, maxSpeed: 0.0065, noise: 0.0, fovDeg: 360 };

/**
 * The in-page GPU proofs' pinned configuration (v4 D-8: N = 4096, 60 steps)
 * on v4's own 16:9 world (half-extents 16/9 × 1), whatever the viewport.
 */
export const PROOF = { n: 4096, steps: 60, seed: 42, halfW: 16 / 9, halfH: 1 } as const;

export const OPEN_WATER_RULE: RuleParams = { wSep: 1.6, wAli: 1.1, wCoh: 0.9, rCoh: 0.105, maxSpeed: 0.0065, noise: 0.0, fovDeg: 360 };

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
