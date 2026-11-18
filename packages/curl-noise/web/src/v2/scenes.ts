// Flow Sculpture's scenes (06-curl-noise.md, "Scenes"). M0 builds the first:
// the Studio — the gated sphere, in Silk. Paint the Stream (M1), Weather and
// Smoke from Noise (M2), Loop Maker and Break the Certificate (M3) join the
// list as they are built.

import type { FieldParams } from "./model/flow.js";
import { CANONICAL_FIELD, cloneField } from "./model/flow.js";

export type SceneId = "studio";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  eyebrow: string;
  field: FieldParams;
  /** Model time per step at 1× (the Speed control's default). */
  dt: number;
  camera: { yaw: number; pitch: number; distance: number };
  /** Turntable speed, rad/s (off under reduced motion). */
  turntable: number;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "studio",
    title: "Studio",
    prompt: "Drag the sphere. The flow goes around it.",
    eyebrow: "06 / FLOW SCULPTURE",
    // the hero field: the gated sphere with smoother noise (two octaves, larger swirls);
    // Tune's "The gated field" returns to the gate's own parameters
    field: { ...cloneField(CANONICAL_FIELD), ell0: 0.7, octaves: 2 },
    dt: 0.0012,
    camera: { yaw: 0.55, pitch: 0.2, distance: 4.6 },
    turntable: 0.05,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
