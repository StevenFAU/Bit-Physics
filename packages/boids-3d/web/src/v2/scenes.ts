// Murmuration's scenes (07-boids-3d.md, "Scenes"). M0 built Dusk; M1 adds
// The Attack — a falcon's stoop scripted from a deterministic state, so a
// restart replays it byte for byte. Ride Along (M2), Rules Lab, Couzin States
// and Roost (M3) join the list as their milestones land.

import type { DuskLook } from "./render/murmur-view.js";
import { DEFAULT_DUSK } from "./render/murmur-view.js";

export type SceneId = "dusk" | "attack";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  eyebrow: string;
  seed: number;
  dusk: DuskLook;
  /** The Attack: fly the flock this many steps off screen, then script the stoop. */
  attack?: { warm: number };
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "dusk",
    title: "Dusk",
    prompt: "Watch them turn — or press F and hunt.",
    eyebrow: "07 / MURMURATION",
    seed: 42,
    dusk: { ...DEFAULT_DUSK },
  },
  {
    id: "attack",
    title: "The Attack",
    prompt: "Where does the wave start? Where does it go?",
    eyebrow: "07 / MURMURATION",
    seed: 7,
    dusk: { ...DEFAULT_DUSK, sunElevation: -4.5 },
    attack: { warm: 1200 },
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
