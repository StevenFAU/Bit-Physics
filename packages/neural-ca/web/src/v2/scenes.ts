// Grow scenes for M0 (docs/planning/rebuild-v2/04-neural-ca.md § Scenes).
// Both run the committed checkpoint on its 64 × 64 dish — the rule is tied
// to that dish (measured: on 128 × 128 one seed grows a rounded square that
// fills the grid), so no scene changes the grid. Menagerie, Teach, Chimera,
// Textures and Inside the Cell come in later milestones.

import { hash3 } from "@bp/runtime";
import { CN, GRID, seedState } from "./proof/gate.js";

export type SceneId = "dish" | "seeds";

export interface SceneDef {
  id: SceneId;
  title: string;
  prompt: string;
  /** Where the scene starts: the canonical seed cell (the gated run's start) or seeds placed from the URL seed. */
  kind: "canonical" | "seeds";
  /** Starting state for `seed`. */
  start(seed: number): Float32Array<ArrayBuffer>;
  /** Untouched and playing this long (steps), the director grows it again from the start. */
  regrowEvery: number;
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
    prompt: "One cell grows into a disk and holds it. Cut it — this rule learned to keep its shape, not to heal.",
    kind: "canonical",
    start: () => seedState(GRID),
    regrowEvery: 4000,
  },
  {
    id: "seeds",
    title: "Many seeds",
    prompt: "Seeds scattered across the dish grow together into one disk, and it settles in the middle.",
    kind: "seeds",
    start: (seed) => {
      const s = new Float32Array(GRID * GRID * CN);
      for (const [x, y] of seedPositions(seed)) plant(s, x, y);
      return s;
    },
    regrowEvery: 3000,
  },
];

export function sceneById(id: string): SceneDef {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
