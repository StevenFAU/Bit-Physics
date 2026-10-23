// The density-coupled grid (02-physarum.md § The model, "Scale").
//
// The trail grid scales WITH the swarm: agents per cell is held at a declared
// density, so the same parameters make the same network on a phone and on a
// desktop — only finer. (The trap this fixes: v1 ran up to 1M agents on a
// fixed 256² grid, where the equilibrium d·N·(1−α)/α puts ~690 units in every
// cell and the field saturates to a white sheet.)
//
// The tier sets the agent count; the grid is the cell count N / density,
// shaped to the viewport's aspect so the periodic dish covers the screen
// exactly (full-bleed, nothing simulated off-screen at the default view).

import type { Tier } from "@bp/gpu";

/** Agents per tier (spec § Performance targets). */
export const AGENTS: Record<Tier, number> = { T3: 2_000_000, T2: 500_000, T1: 150_000 };

/**
 * Declared agents per cell. The spec's T3 row is 2M agents on 2048²; this is
 * that density, kept at every tier and aspect. (Measured in M0: see the
 * density survey recorded in docs/planning/rebuild-v2/02-physarum.md.)
 */
export const DENSITY = 2_000_000 / (2048 * 2048);

/** Sort tile side (cells) as a power of two. */
export const TILE_SHIFT = 3;

export interface GridSpec {
  w: number;
  h: number;
  n: number;
}

/** A grid of round(n / density) cells with the viewport's aspect, sides multiples of 8. */
export function gridFor(n: number, viewW: number, viewH: number, density = DENSITY): GridSpec {
  const cells = n / density;
  const a = Math.min(Math.max(viewW / Math.max(viewH, 1), 0.45), 2.4);
  const h = Math.max(64, Math.round(Math.sqrt(cells / a) / 8) * 8);
  const w = Math.max(64, Math.round(cells / h / 8) * 8);
  return { w, h, n };
}

/** Grid for a tier's agent count. */
export function tierGrid(tier: Tier, viewW: number, viewH: number): GridSpec {
  return gridFor(AGENTS[tier], viewW, viewH);
}

/** Mean trail per cell at equilibrium: d·(N / cells)·(1−α)/α. */
export function meanTrail(deposit: number, decayAlpha: number, n: number, cells: number): number {
  return (deposit * (n / cells) * (1 - decayAlpha)) / decayAlpha;
}
