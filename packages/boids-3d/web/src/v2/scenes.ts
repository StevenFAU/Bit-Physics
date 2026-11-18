// Murmuration's scenes (07-boids-3d.md, "Scenes"). M0 builds the first:
// Dusk — v1's starling flock over a reed bed, watched from the ground. The
// Attack, Ride Along, Rules Lab, Couzin States and Roost join the list as
// their milestones land (M1–M3).

import type { DuskLook } from "./render/murmur-view.js";
import { DEFAULT_DUSK } from "./render/murmur-view.js";

export type SceneId = "dusk";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  eyebrow: string;
  /** v1's preset (src/engine.ts PRESETS) the scene starts with. */
  preset: string;
  seed: number;
  dusk: DuskLook;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "dusk",
    title: "Dusk",
    prompt: "Watch them turn. Drag to look around.",
    eyebrow: "07 / MURMURATION",
    preset: "starling",
    seed: 42,
    dusk: { ...DEFAULT_DUSK },
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}

/** v1's presets under plain names (Tune's "Flock"). */
export const FLOCK_NAMES: Record<string, { name: string; hint: string }> = {
  starling: { name: "Starlings", hint: "Seven neighbours each, a narrow blind cone behind: the default." },
  ribbon: { name: "Ribbon", hint: "Strong alignment in a shallow layer: the flock turns as one band." },
  pulse: { name: "Pulse", hint: "Cohesion wins, turning is limited: the flock squeezes and swells." },
  split: { name: "Flocklets", hint: "Shorter reach and more noise: groups split and merge." },
  storm: { name: "Storm", hint: "Fast and noisy, weak cohesion, hard banking." },
  landmark: { name: "Landmark", hint: "An unseen tower in the roost: the flock parts around it." },
};
