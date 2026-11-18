// Chaos's scenes (05-strange-attractors.md, "Scenes"). M0 built The
// Butterfly, M1 Buy More Digits, M2 Road to Chaos, Lorenz's Map and Slice.
// Listen and The Family (M3) join the list as they are built.

import type { LorenzParams, V3 } from "./model/lorenz.js";
import { CLASSIC } from "./model/lorenz.js";

export type SceneId = "butterfly" | "digits" | "road" | "map" | "slice";

/** The floating panel a scene shows (null: none). */
export type ScenePanel = "digits" | "road" | "map" | "slice" | null;

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
  /** Release a ball by itself after `releaseDelay`. */
  autoRelease: boolean;
  panel: ScenePanel;
  /** What the attractor population records (Lorenz's map, the section). */
  observe: { map: boolean; slice: boolean };
  /** The tool selected when the scene loads. */
  tool: "release" | "slice";
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
    autoRelease: true,
    panel: null,
    observe: { map: false, slice: false },
    tool: "release",
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
    autoRelease: true,
    panel: "digits",
    observe: { map: false, slice: false },
    tool: "release",
  },
  {
    id: "road",
    title: "Road to Chaos",
    prompt: "Click anywhere on the diagram to go there.",
    eyebrow: "05 / CHAOS",
    params: { ...CLASSIC },
    digits: 6,
    releaseAfter: 2350,
    releaseDelay: 0,
    camera: { yaw: 0.3, pitch: 0.12, distance: 2.6 },
    turntable: 0.03,
    speed: 1,
    autoRelease: false,
    panel: "road",
    observe: { map: false, slice: false },
    tool: "release",
  },
  {
    id: "map",
    title: "Lorenz's Map",
    prompt: "The chaos fits on a single curve.",
    eyebrow: "05 / CHAOS",
    params: { ...CLASSIC },
    digits: 6,
    releaseAfter: 2350,
    releaseDelay: 0,
    camera: { yaw: 0.3, pitch: 0.12, distance: 2.6 },
    turntable: 0.03,
    speed: 1,
    autoRelease: false,
    panel: "map",
    observe: { map: true, slice: false },
    tool: "release",
  },
  {
    id: "slice",
    title: "Slice",
    prompt: "Cut the attractor and see how thin it is.",
    eyebrow: "05 / CHAOS",
    params: { ...CLASSIC },
    digits: 6,
    releaseAfter: 2350,
    releaseDelay: 0,
    // a little above the plane, so the cut faces the camera
    camera: { yaw: 0.45, pitch: 0.55, distance: 2.7 },
    turntable: 0.03,
    speed: 1,
    autoRelease: false,
    panel: "slice",
    observe: { map: false, slice: true },
    tool: "slice",
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
