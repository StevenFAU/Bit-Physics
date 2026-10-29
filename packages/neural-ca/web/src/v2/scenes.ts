// Grow scenes (docs/planning/rebuild-v2/04-neural-ca.md § Scenes). Every
// scene runs the gated kernel on the 64 × 64 dish the organisms were trained
// on (the committed checkpoint is tied to that dish — measured: on 128 × 128
// one seed grows a rounded square that fills the grid — and the Menagerie's
// organisms were trained on it too). M1 adds the Menagerie and Inside the
// Cell; M2 adds Teach (trained on the same 64 × 64 dish); Chimera and
// Textures come later.

import { hash3 } from "@bp/runtime";
import type { OrganismDef } from "./model/organisms.js";
import { heals } from "./model/organisms.js";
import { CN, GRID, seedState } from "./proof/gate.js";
import type { ViewMode } from "./render/dish-view.js";

export type SceneId = "dish" | "menagerie" | "cell" | "seeds" | "teach";

export interface SceneDef {
  id: SceneId;
  title: string;
  /** The heading's prompt, for the organism on the dish (the Menagerie's ignores it). */
  prompt(o: OrganismDef): string;
  /**
   * canonical: one dish from the canonical seed cell (the gated run's start, with the gated organism);
   * seeds: one dish, seeds placed from the URL seed; menagerie: one dish per organism; cell: one dish, zoomed in on a cell;
   * teach: Teach (M2) decides the dishes — the drawing, the training batch, or the taught organism.
   */
  kind: "canonical" | "seeds" | "menagerie" | "cell" | "teach";
  /** Starting state for `seed`. */
  start(seed: number): Float32Array<ArrayBuffer>;
  /** Untouched and playing this long (steps), the director grows it again from the start. */
  regrowEvery: number;
  /** The tool selected when the scene opens. */
  tool: string;
  /** The view the scene opens in, when the URL does not set one. */
  view?: ViewMode;
}

/** The canonical seed pattern at (x, y). */
function plant(s: Float32Array, x: number, y: number): void {
  const base = (y * GRID + x) * CN;
  for (let c = 3; c < CN; c += 1) s[base + c] = 1.0;
}

/** 2–4 seed cells, at least 12 cells from the edge, placed from `seed` (counter-based hash, no Math.random). */
export function seedPositions(seed: number): [number, number][] {
  const n = 2 + (hash3(seed, 7, 0) % 3);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const x = 12 + (hash3(seed, 11, i) % (GRID - 24));
    const y = 12 + (hash3(seed, 13, i) % (GRID - 24));
    out.push([x, y]);
  }
  return out;
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "dish",
    title: "The Dish",
    prompt: (o) =>
      heals(o)
        ? `A ${o.name.toLowerCase()} grows from one cell. Cut it — it heals.`
        : "One cell grows into a disk and holds it. Cut it — this rule learned to keep its shape, not to heal.",
    kind: "canonical",
    start: () => seedState(GRID),
    regrowEvery: 4000,
    tool: "cut",
  },
  {
    id: "menagerie",
    title: "Menagerie",
    prompt: () => "Each one is the same code with different weights. Cut them and see which heal.",
    kind: "menagerie",
    start: () => seedState(GRID),
    regrowEvery: 4000,
    tool: "cut",
  },
  {
    id: "cell",
    title: "Inside the Cell",
    prompt: () => "This is the whole rule. Pick a cell to see what it senses, what the network makes of it, and what changes.",
    kind: "cell",
    start: () => seedState(GRID),
    regrowEvery: Infinity,
    tool: "probe",
    view: "cells",
  },
  {
    id: "teach",
    title: "Teach",
    prompt: () => "Draw something simple. Watch it learn to grow.",
    kind: "teach",
    start: () => new Float32Array(GRID * GRID * CN),
    regrowEvery: 4000,
    tool: "paint",
  },
  {
    id: "seeds",
    title: "Many seeds",
    prompt: (o) =>
      o.gated
        ? "Seeds scattered across the dish grow together into one disk, and it settles in the middle."
        : `Several seed cells, one ${o.name.toLowerCase()} rule. Watch what grows where the bodies meet.`,
    kind: "seeds",
    start: (seed) => {
      const s = new Float32Array(GRID * GRID * CN);
      for (const [x, y] of seedPositions(seed)) plant(s, x, y);
      return s;
    },
    regrowEvery: 3000,
    tool: "cut",
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
