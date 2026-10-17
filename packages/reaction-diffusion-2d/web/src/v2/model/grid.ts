// Grid size per tier (01-reaction-diffusion.md § Performance targets): the
// cell budget of the tier, shaped to the viewport so the domain covers the
// screen exactly (full-bleed, no letterboxing), and never finer than ~1 cell
// per CSS pixel — on a small screen extra cells only shrink the pattern.

import type { Tier } from "@bp/gpu";

export const CELLS: Record<Tier, number> = { T3: 1024 * 1024, T2: 512 * 512, T1: 384 * 384 };

export function gridFor(tier: Tier, viewW: number, viewH: number): [number, number] {
  const n = Math.min(CELLS[tier], Math.max(160 * 160, viewW * viewH));
  const a = Math.min(Math.max(viewW / Math.max(viewH, 1), 0.45), 2.4);
  const hh = Math.max(64, Math.round(Math.sqrt(n / a) / 8) * 8);
  const ww = Math.max(64, Math.round(n / hh / 8) * 8);
  return [ww, hh];
}
