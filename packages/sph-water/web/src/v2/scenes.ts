// Water in Hand's scenes (08-sph-water.md, "Scenes"). M0 builds the Glass —
// water at rest in a glass on a kitchen table, a blob of water dropped in at
// the start and a director that drops another whenever it has gone quiet —
// and Still Water, the hydrostatic scene the pressure-vs-depth card reads.
// Pour, Float or Sink, Stir, Tap and Drops join as their milestones land
// (tilt M1, floating objects M2, surface tension and the rest M3).

export type SceneId = "glass" | "still";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  eyebrow: string;
  /** A blob of water starts above the glass and falls in. */
  blob: boolean;
  /** Model seconds between the director's drops (0 = no director). */
  director: number;
  camera: { yaw: number; pitch: number; distance: number };
}

export const EYEBROW = "08 / WATER IN HAND";

export const SCENES: readonly SceneDef[] = [
  {
    id: "glass",
    title: "The Glass",
    prompt: "Drop something in. Drag to look around.",
    eyebrow: EYEBROW,
    blob: true,
    director: 2.6,
    camera: { yaw: 0.62, pitch: 0.27, distance: 2.45 },
  },
  {
    id: "still",
    title: "Still Water",
    prompt: "Pressure grows with depth — ρgh. Open Prove to measure it.",
    eyebrow: `${EYEBROW} · LEARN`,
    blob: false,
    director: 0,
    camera: { yaw: 0.62, pitch: 0.24, distance: 2.45 },
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
