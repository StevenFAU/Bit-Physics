// Chaos's scenes (05-strange-attractors.md, "Scenes"). M0 built The
// Butterfly, M1 Buy More Digits. Road to Chaos, Lorenz's Map and Slice (M2),
// Listen and The Family (M3) join the list as they are built.

import type { LorenzParams, V3 } from "./model/lorenz.js";
import { CLASSIC } from "./model/lorenz.js";

export type SceneId = "butterfly" | "digits";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  eyebrow: string;
  params: LorenzParams;
  /** Ball width at release, as digits of precision (ε = 10^−digits). */
  digits: number;
  /** Where the first ball is released: steps along the attractor from (1, 1, 1). */
  releaseAfter: number;
  /** Seconds of the attractor alone before the first release. */
  releaseDelay: number;
  camera: { yaw: number; pitch: number; distance: number };
  /** Turntable speed, rad/s (off under reduced motion). */
  turntable: number;
  /** Clock speed the scene starts at. */
  speed: number;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "butterfly",
    title: "The Butterfly",
    prompt: "A million starts, one point. Watch.",
    eyebrow: "05 / CHAOS",
    params: { ...CLASSIC },
    digits: 6,
    releaseAfter: 2350,
    releaseDelay: 1.6,
    camera: { yaw: 0.3, pitch: 0.12, distance: 2.6 },
    turntable: 0.045,
    speed: 1,
  },
  {
    id: "digits",
    title: "Buy More Digits",
    prompt: "How much future does one more digit buy?",
    eyebrow: "05 / CHAOS",
    params: { ...CLASSIC },
    // the first ball is three digits wide; each "Buy a digit" adds one
    digits: 3,
    releaseAfter: 2350,
    releaseDelay: 0.8,
    camera: { yaw: 0.3, pitch: 0.12, distance: 2.6 },
    turntable: 0.03,
    // 9.6 time units a second: a ball loses its future in seconds, not a minute
    speed: 4,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}

/** Precision as digits → ball radius. */
export const epsOf = (digits: number): number => 10 ** -digits;

/** Smallest and largest precision the Release tool offers. */
export const DIGITS_MIN = 2;
export const DIGITS_MAX = 15;

export type { V3 };
