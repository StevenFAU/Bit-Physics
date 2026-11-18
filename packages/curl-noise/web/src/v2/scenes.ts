// Flow Sculpture's scenes (06-curl-noise.md, "Scenes"). M0 built the Studio —
// the gated sphere, in Silk (and, from M1, Dust); M1 adds Paint the Stream, the
// 2D signature moment. Weather and Smoke from Noise (M2), Loop Maker and Break
// the Certificate (M3) join the list as they are built.

import type { FieldParams } from "./model/flow.js";
import { CANONICAL_FIELD, cloneField } from "./model/flow.js";

export type SceneId = "studio" | "paint";

export interface SceneDef {
  id: SceneId;
  /** "3d": the Studio's orbit view (app.ts); "2d": Paint the Stream (paint/app.ts). */
  dim: "3d" | "2d";
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
    dim: "3d",
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
  {
    // the 2D signature moment: its field is ψ itself (paint/app.ts), not this one
    id: "paint",
    dim: "2d",
    title: "Paint the Stream",
    prompt: "Paint hills and valleys; the flow follows the contours.",
    eyebrow: "06 / FLOW SCULPTURE",
    field: cloneField(CANONICAL_FIELD),
    dt: 1 / 60,
    camera: { yaw: 0, pitch: 0, distance: 1 },
    turntable: 0,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
